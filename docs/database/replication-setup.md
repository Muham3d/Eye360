# Database Replication Setup

## Overview

This guide covers setting up PostgreSQL read replicas for PatrolManager on AWS RDS. Read replicas offload read-heavy traffic from the primary database and improve query performance for reporting and analytics.

## Architecture

```
                    ┌─────────────────────┐
                    │   Application       │
                    │   (ECS/Fargate)     │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │  Primary  │   │ Replica 1 │   │ Replica 2 │
        │ (Writer)  │   │ (Reader)  │   │ (Reader)  │
        │ Multi-AZ  │   │   Zone A  │   │   Zone B  │
        └───────────┘   └───────────┘   └───────────┘
             │                 │               │
             └─────────────────┴───────────────┘
                               │
                        ┌──────┴──────┐
                        │ RDS PostgreSQL│
                        │   16          │
                        └───────────────┘
```

## AWS RDS Configuration

### 1. Primary Instance

**Instance Specifications:**
- **Engine:** PostgreSQL 16.x
- **Instance Class:** db.r6g.xlarge (4 vCPU, 32 GB RAM)
- **Storage:** gp3 (500 GB, 3000 IOPS)
- **Multi-AZ:** Enabled
- **Automatic Minor Version Upgrade:** Enabled
- **Backup Retention:** 30 days
- **Maintenance Window:** Sunday 03:00-04:00 UTC

### 2. Read Replicas

**Replica 1:**
- **Instance Class:** db.r6g.large (2 vCPU, 16 GB RAM)
- **Availability Zone:** us-east-1a
- **Public Accessible:** No

**Replica 2:**
- **Instance Class:** db.r6g.large (2 vCPU, 16 GB RAM)
- **Availability Zone:** us-east-1b
- **Public Accessible:** No

## Terraform Configuration

### Primary Database

```hcl
# terraform/rds-primary.tf
resource "aws_db_instance" "patrolmanager_primary" {
  identifier         = "patrolmanager-prod"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = "db.r6g.xlarge"
  allocated_storage = 500
  storage_type      = "gp3"
  iops              = 3000
  storage_encrypted = true

  db_name  = "patrolmanager_prod"
  username = var.db_username
  password = var.db_password

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  backup_retention_period         = 30
  backup_window                  = "03:00-04:00"
  maintenance_window             = "sun:03:00-sun:04:00"
  final_snapshot_identifier      = "patrolmanager-prod-final"

  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn         = aws_iam_role.rds_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  skip_final_snapshot = false
  deletion_protection = true

  tags = {
    Name        = "patrolmanager-prod"
    Environment = "production"
  }
}
```

### Read Replicas

```hcl
# terraform/rds-replicas.tf
resource "aws_db_instance" "patrolmanager_replica_1" {
  identifier             = "patrolmanager-prod-replica-1"
  replicate_source_db    = aws_db_instance.patrolmanager_primary.identifier
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.r6g.large"
  availability_zone      = "us-east-1a"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  performance_insights_enabled = false
  monitoring_interval         = 0

  skip_final_snapshot    = true
  deletion_protection    = false

  tags = {
    Name        = "patrolmanager-prod-replica-1"
    Environment = "production"
    Type        = "read-replica"
  }
}

resource "aws_db_instance" "patrolmanager_replica_2" {
  identifier             = "patrolmanager-prod-replica-2"
  replicate_source_db    = aws_db_instance.patrolmanager_primary.identifier
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.r6g.large"
  availability_zone      = "us-east-1b"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  performance_insights_enabled = false
  monitoring_interval         = 0

  skip_final_snapshot    = true
  deletion_protection    = false

  tags = {
    Name        = "patrolmanager-prod-replica-2"
    Environment = "production"
    Type        = "read-replica"
  }
}
```

### Auto-scaling Replicas

```hcl
# terraform/rds-autoscaling.tf
resource "aws_rds_cluster" "patrolmanager_cluster" {
  cluster_identifier      = "patrolmanager-prod-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "16.1"
  database_name           = "patrolmanager_prod"
  master_username         = var.db_username
  master_password         = var.db_password

  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]

  backup_retention_period = 30
  preferred_backup_window = "03:00-04:00"

  skip_final_snapshot     = false
  final_snapshot_identifier = "patrolmanager-cluster-final"

  # Enable auto-scaling
  scaling_configuration {
    auto_pause               = false
    min_capacity             = 2
    max_capacity             = 10
    timeout_action           = "ForceApplyCapacityChange"
  }
}

resource "aws_rds_cluster_instance" "replicas" {
  count              = 2
  identifier         = "patrolmanager-prod-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.patrolmanager_cluster.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.patrolmanager_cluster.engine
  availability_zone  = data.aws_availability_zones.available.names[count.index]
}
```

## Sequelize Configuration

### Read Replica Routing

```typescript
// backend/src/infrastructure/config/database.ts
import { Sequelize } from 'sequelize';

export function createSequelizeInstance(): Sequelize {
  const isProduction = process.env.NODE_ENV === 'production';

  const config: any = {
    dialect: 'postgres',
    logging: (msg: string) => logger.debug(msg),
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '10000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
      evict: parseInt(process.env.DB_POOL_EVICT || '60000')
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : undefined
    }
  };

  // Configure read replicas for production
  if (isProduction && process.env.DB_READ_REPLICA_1) {
    const readReplicas: any[] = [
      { host: process.env.DB_READ_REPLICA_1 }
    ];

    if (process.env.DB_READ_REPLICA_2) {
      readReplicas.push({ host: process.env.DB_READ_REPLICA_2 });
    }

    config.replication = {
      read: readReplicas,
      write: { host: process.env.DB_HOST }
    };

    logger.info('Sequelize configured with read replicas', {
      replicaCount: readReplicas.length
    });
  } else {
    config.host = process.env.DB_HOST;
    config.port = parseInt(process.env.DB_PORT || '5432');
    config.database = process.env.DB_NAME;
    config.username = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
  }

  return new Sequelize(config);
}
```

### Read-Only Queries

Force read operations to replicas:

```typescript
// Use for SELECT queries that should hit replicas
const results = await sequelize.query(
  'SELECT * FROM incidents WHERE status = :status',
  {
    replacements: { status: 'open' },
    type: Sequelize.QueryTypes.SELECT,
    replication: 'read' // Explicitly route to replica
  }
);
```

## Monitoring

### Replication Lag

```sql
-- Query replication lag from primary
SELECT
  client_addr,
  state,
  sync_state,
  replay_lag
FROM pg_stat_replication;
```

### Check Replica Status

```sql
-- Run on replica to check replication status
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

### CloudWatch Metrics

Monitor these metrics:

| Metric | Description | Alarm Threshold |
|--------|-------------|-----------------|
| `ReadLag` | Replica lag in seconds | > 30 seconds |
| `WriteLag` | Write lag in seconds | > 10 seconds |
| `ReplicaLag` | Maximum lag across replicas | > 60 seconds |
| `DatabaseConnections` | Active connections | > 80% of max |
| `CPUUtilization` | Database CPU usage | > 80% |
| `FreeStorageSpace` | Available storage | < 20% |

### CloudWatch Alarm

```hcl
# terraform/cloudwatch-alarms.tf
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "patrolmanager-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadLag"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "30"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.patrolmanager_primary.identifier
  }

  alarm_actions          = [aws_sns_topic.alerts.arn]
  ok_actions             = [aws_sns_topic.alerts.arn]
  alarm_description      = "Alert when replication lag exceeds 30 seconds"
}
```

## Failover Procedure

### Manual Failover to Replica

**Step 1: Verify replica health**
```bash
aws rds describe-db-instances \
  --db-instance-identifier patrolmanager-prod-replica-1 \
  --query 'DBInstances[0].[DBInstanceStatus,ReadReplicaSourceDBInstanceIdentifier]'
```

**Step 2: Promote replica to standalone**
```bash
aws rds promote-read-replica \
  --db-instance-identifier patrolmanager-prod-replica-1
```

**Step 3: Update application connection**
Update `DB_HOST` environment variable to point to new primary.

**Step 4: Create new replicas**
```bash
aws rds create-read-replica \
  --db-instance-identifier patrolmanager-prod-replica-2 \
  --source-db-instance-identifier patrolmanager-prod-replica-1
```

### Automated Failover (Multi-AZ)

When Multi-AZ is enabled, AWS automatically fails over to the standby instance:

1. **Detection:** Primary instance failure detected
2. **Promotion:** Standby replica promoted (30-60 seconds)
3. **DNS Update:** CNAME record updated automatically
4. **Resume:** Application reconnects automatically

## Backup Strategy

### Automated Backups

AWS RDS automated backups:
- **Retention:** 30 days
- **Window:** 03:00-04:00 UTC
- **Storage:** Snapshots stored in S3 (no additional cost)

### Manual Snapshots

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier patrolmanager-prod \
  --db-snapshot-identifier patrolmanager-prod-manual-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier patrolmanager-prod

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier patrolmanager-prod-restored \
  --db-snapshot-identifier patrolmanager-prod-manual-20240201
```

### Cross-Region Replication

```hcl
# terraform/snapshot-copy.tf
resource "aws_db_snapshot_copy" "cross_region" {
  source_db_snapshot_identifier = aws_db_snapshot.manual.id
  target_db_snapshot_identifier = "${aws_db_snapshot.manual.id}-dr"
  source_region                  = "us-east-1"

  # Copy to DR region
  provider = aws.dr
}
```

## Performance Optimization

### Connection Pooling

Use PgBouncer for connection pooling:

```yaml
# docker-compose.yml
pgbouncer:
  image: pgbouncer/pgbouncer
  environment:
    DATABASES_HOST: ${DB_HOST}
    DATABASES_PORT: 5432
    DATABASES_USER: ${DB_USER}
    DATABASES_PASSWORD: ${DB_PASSWORD}
    DATABASES_DBNAME: ${DB_NAME}
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 1000
    DEFAULT_POOL_SIZE: 50
```

### Query Optimization

```sql
-- Create indexes for read-heavy queries
CREATE INDEX CONCURRENTLY idx_incidents_site_created
  ON incidents(site_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_patrol_runs_guard_status
  ON patrol_runs(guard_id, status);

-- Materialized view for analytics
CREATE MATERIALIZED VIEW mv_patrol_stats AS
SELECT
  site_id,
  date_trunc('day', created_at) as date,
  COUNT(*) as total_patrols,
  AVG(duration_seconds) as avg_duration
FROM patrol_runs
GROUP BY site_id, date_trunc('day', created_at);

CREATE UNIQUE INDEX ON mv_patrol_stats(site_id, date);

-- Refresh materialized view daily
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_patrol_stats;
```

## Troubleshooting

### Common Issues

**Issue:** High replication lag

**Solutions:**
1. Check replica resource utilization (scale up if needed)
2. Review long-running queries on primary
3. Check network bandwidth between regions
4. Reduce write load on primary

**Issue:** Replica out of sync

**Solutions:**
1. Check replica status: `SELECT pg_is_in_recovery();`
2. Review PostgreSQL logs on replica
3. Recreate replica from snapshot if needed

**Issue:** Connection pool exhausted

**Solutions:**
1. Increase `DB_POOL_MAX` in environment
2. Implement connection pooling with PgBouncer
3. Scale database instance size
4. Review application for connection leaks

## References

- [AWS RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Sequelize Read Replicas](https://sequelize.org/docs/v6/other-topics/read-replication/)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/high-availability.html)
