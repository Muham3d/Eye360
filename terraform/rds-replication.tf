# =============================================================================
# Terraform Configuration: RDS PostgreSQL with Read Replicas
# =============================================================================
#
# This Terraform configuration creates:
# - Primary RDS PostgreSQL instance with Multi-AZ
# - Read replicas in different availability zones
# - Parameter groups for optimal performance
# - Security groups for database access
# - CloudWatch alarms for monitoring
#
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_vpc" "main" {
  tags = {
    Name = "patrolmanager-vpc"
  }
}

data "aws_subnet_ids" "private" {
  vpc_id = data.aws_vpc.main.id

  tags = {
    Tier = "private"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# -----------------------------------------------------------------------------
# DB Subnet Group
# -----------------------------------------------------------------------------

resource "aws_db_subnet_group" "patrolmanager" {
  name        = "patrolmanager-db-subnet-group"
  description = "Database subnet group for PatrolManager"
  subnet_ids  = data.aws_subnet_ids.private.ids

  tags = {
    Name        = "patrolmanager-db-subnet-group"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------

resource "aws_security_group" "database" {
  name        = "patrolmanager-db-sg"
  description = "Security group for PatrolManager database"
  vpc_id      = data.aws_vpc.main.id

  tags = {
    Name        = "patrolmanager-db-sg"
    Environment = var.environment
  }
}

# Allow PostgreSQL from ECS tasks
resource "aws_security_group_rule" "postgres_from_ecs" {
  description              = "PostgreSQL from ECS tasks"
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs_tasks.id
  security_group_id        = aws_security_group.database.id
}

# Allow PostgreSQL from bastion host (for admin access)
resource "aws_security_group_rule" "postgres_from_bastion" {
  description              = "PostgreSQL from bastion host"
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = var.bastion_security_group_id
  security_group_id        = aws_security_group.database.id
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------

resource "aws_db_parameter_group" "patrolmanager" {
  name        = "patrolmanager-pg16"
  family      = "postgres16"
  description = "Parameter group for PatrolManager PostgreSQL 16"

  # Performance tuning
  parameter {
    name  = "shared_buffers"
    value = "0.25 * DBInstanceClassMemory"
  }

  parameter {
    name  = "effective_cache_size"
    value = "0.75 * DBInstanceClassMemory"
  }

  parameter {
    name  = "work_mem"
    value = "0.25 * DBInstanceClassMemory / max_connections"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "0.125 * DBInstanceClassMemory"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "200"
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  # Replication
  parameter {
    name  = "wal_level"
    value = "logical"
  }

  parameter {
    name  = "max_wal_senders"
    value = "10"
  }

  parameter {
    name  = "max_replication_slots"
    value = "10"
  }

  # Statement tracking
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name        = "patrolmanager-pg16"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Primary Database Instance
# -----------------------------------------------------------------------------

resource "aws_db_instance" "primary" {
  identifier         = "patrolmanager-${var.environment}"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = var.primary_instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  iops              = var.storage_iops
  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  # Database credentials
  db_name  = "patrolmanager"
  username = var.db_username
  password = var.db_password

  # Network
  db_subnet_group_name   = aws_db_subnet_group.patrolmanager.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # High availability
  multi_az                = true
  backup_retention_period = var.backup_retention_days
  backup_window           = var.backup_window

  # Maintenance
  maintenance_window      = var.maintenance_window
  auto_minor_version_upgrade = true

  # Monitoring
  monitoring_interval         = 60
  monitoring_role_arn        = var.monitoring_role_arn
  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Deletion protection
  deletion_protection      = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "patrolmanager-${var.environment}-final-${replace(timestamp(), ":", "-")}"

  # Parameter group
  parameter_group_name = aws_db_parameter_group.patrolmanager.name

  tags = {
    Name        = "patrolmanager-${var.environment}"
    Environment = var.environment
    Type        = "primary"
  }

  # Allow major version upgrade only with explicit approval
  allow_major_version_upgrade = false
}

# -----------------------------------------------------------------------------
# Read Replica 1
# -----------------------------------------------------------------------------

resource "aws_db_instance" "replica_1" {
  identifier             = "patrolmanager-${var.environment}-replica-1"
  replicate_source_db    = aws_db_instance.primary.identifier
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = var.replica_instance_class
  availability_zone      = data.aws_availability_zones.available.names[0]

  # Network
  db_subnet_group_name   = aws_db_subnet_group.patrolmanager.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Replicas don't need all the features of primary
  performance_insights_enabled = false
  monitoring_interval         = 0
  backup_retention_period     = 0

  # Allow easy deletion of replicas
  skip_final_snapshot    = true
  deletion_protection    = false

  # Use same parameter group as primary
  parameter_group_name = aws_db_parameter_group.patrolmanager.name

  tags = {
    Name        = "patrolmanager-${var.environment}-replica-1"
    Environment = var.environment
    Type        = "read-replica"
    ReplicaNumber = 1
  }

  # Ensure replica is created after primary is available
  depends_on = [aws_db_instance.primary]
}

# -----------------------------------------------------------------------------
# Read Replica 2
# -----------------------------------------------------------------------------

resource "aws_db_instance" "replica_2" {
  identifier             = "patrolmanager-${var.environment}-replica-2"
  replicate_source_db    = aws_db_instance.primary.identifier
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = var.replica_instance_class
  availability_zone      = data.aws_availability_zones.available.names[1]

  # Network
  db_subnet_group_name   = aws_db_subnet_group.patrolmanager.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  performance_insights_enabled = false
  monitoring_interval         = 0
  backup_retention_period     = 0

  skip_final_snapshot    = true
  deletion_protection    = false

  parameter_group_name = aws_db_parameter_group.patrolmanager.name

  tags = {
    Name        = "patrolmanager-${var.environment}-replica-2"
    Environment = var.environment
    Type        = "read-replica"
    ReplicaNumber = 2
  }

  depends_on = [aws_db_instance.primary]
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

# Replication lag alarm
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "patrolmanager-${var.environment}-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadLag"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "30"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.identifier
  }

  alarm_description     = "Alert when replication lag exceeds 30 seconds"
  alarm_actions          = var.sns_topic_arns
  ok_actions             = var.sns_topic_arns
  insufficient_data_actions = var.sns_topic_arns

  tags = {
    Environment = var.environment
  }
}

# CPU utilization alarm
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "patrolmanager-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.identifier
  }

  alarm_description = "Alert when CPU utilization exceeds 80%"
  alarm_actions      = var.sns_topic_arns
  ok_actions         = var.sns_topic_arns

  tags = {
    Environment = var.environment
  }
}

# Free storage space alarm
resource "aws_cloudwatch_metric_alarm" "low_storage" {
  alarm_name          = "patrolmanager-${var.environment}-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240" # 10GB in bytes

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.identifier
  }

  alarm_description = "Alert when free storage space is less than 10GB"
  alarm_actions      = var.sns_topic_arns
  ok_actions         = var.sns_topic_arns

  tags = {
    Environment = var.environment
  }
}

# Connection pool alarm
resource "aws_cloudwatch_metric_alarm" "high_connections" {
  alarm_name          = "patrolmanager-${var.environment}-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "180" # 90% of max_connections (200)

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.identifier
  }

  alarm_description = "Alert when database connections exceed 90% of maximum"
  alarm_actions      = var.sns_topic_arns
  ok_actions         = var.sns_topic_arns

  tags = {
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (production, staging, etc.)"
  type        = string
}

variable "primary_instance_class" {
  description = "Instance class for primary database"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "replica_instance_class" {
  description = "Instance class for read replicas"
  type        = string
  default     = "db.r6g.large"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 500
}

variable "storage_iops" {
  description = "Storage IOPS"
  type        = number
  default     = 3000
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "backup_window" {
  description = "Backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Maintenance window"
  type        = string
  default     = "sun:03:00-sun:04:00"
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "db_username" {
  description = "Database master username"
  type        = string
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "monitoring_role_arn" {
  description = "IAM role ARN for RDS Enhanced Monitoring"
  type        = string
}

variable "sns_topic_arns" {
  description = "SNS topic ARNs for alarms"
  type        = list(string)
}

variable "bastion_security_group_id" {
  description = "Security group ID for bastion host"
  type        = string
}

# ECS tasks security group (should be created separately)
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "patrolmanager-ecs-tasks-"
  description = "Security group for ECS tasks"
  vpc_id      = data.aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "primary_endpoint" {
  description = "Primary database endpoint"
  value       = aws_db_instance.primary.endpoint
}

output "primary_port" {
  description = "Primary database port"
  value       = aws_db_instance.primary.port
}

output "replica_1_endpoint" {
  description = "Replica 1 endpoint"
  value       = aws_db_instance.replica_1.endpoint
}

output "replica_2_endpoint" {
  description = "Replica 2 endpoint"
  value       = aws_db_instance.replica_2.endpoint
}

output "connection_string" {
  description = "Connection string for Sequelize"
  value       = "postgresql://${var.db_username}:<password>@${aws_db_instance.primary.endpoint}/${aws_db_instance.primary.db_name}"
  sensitive   = true
}
