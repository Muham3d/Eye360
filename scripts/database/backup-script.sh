#!/bin/bash
# =============================================================================
# PatrolManager Database Backup Script
# =============================================================================
#
# This script performs automated PostgreSQL database backups with:
# - Database dump
# - Compression with gzip
# - Upload to S3 with timestamp
# - Automatic cleanup of old backups
# - CloudWatch logging
#
# Usage: ./backup-script.sh [environment]
# =============================================================================

set -e  # Exit on error

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
  export $(cat ".env" | grep -v '^#' | xargs)
else
  echo "Error: Environment file not found"
  exit 1
fi

# S3 Configuration
S3_BUCKET=${BACKUP_S3_BUCKET:-"patrolmanager-backups-${ENVIRONMENT}"}
S3_PREFIX="database/backups"

# Local backup directory
BACKUP_DIR="/tmp/patrolmanager-backups"
mkdir -p "$BACKUP_DIR"

# Log function
log() {
  local level=$1
  shift
  local message="$@"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  echo "[$timestamp] [$level] $message"

  # Send to CloudWatch if enabled
  if [ "${LOG_CLOUDWATCH_ENABLED:-false}" = "true" ]; then
    aws logs put-log-events \
      --log-group-name "${LOG_CLOUDWATCH_GROUP:-/aws/ecs/patrolmanager}" \
      --log-stream-name "${LOG_CLOUDWATCH_STREAM:-database-backup}" \
      --log-events "timestamp=$(date +%s)000,message=[$level] $message" \
      --region "${AWS_REGION:-us-east-1}" \
      >/dev/null 2>&1 || true
  fi
}

# Error handler
error_exit() {
  log "ERROR" "$1"
  # Send alert notification
  if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"🚨 Database backup failed: $1\"}" \
      >/dev/null 2>&1 || true
  fi
  exit 1
}

# Verify prerequisites
log "INFO" "Starting database backup for ${ENVIRONMENT} environment"

# Check required commands
for cmd in pg_dump aws gzip; do
  if ! command -v $cmd &> /dev/null; then
    error_exit "Required command '$cmd' not found"
  fi
done

# Validate environment variables
if [ -z "${DB_HOST:-}" ] || [ -z "${DB_NAME:-}" ] || [ -z "${DB_USER:-}" ]; then
  error_exit "Required database environment variables not set"
fi

# Database connection parameters
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD:-}
DB_SSL=${DB_SSL:-false}

# Backup file names
BACKUP_FILE="${BACKUP_DIR}/patrolmanager_${ENVIRONMENT}_${BACKUP_DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
S3_KEY="${S3_PREFIX}/${ENVIRONMENT}/patrolmanager_${BACKUP_DATE}.sql.gz"

# Get database password from PGPASS or environment
if [ -z "$DB_PASSWORD" ]; then
  log "INFO" "Using .pgpass for authentication"
else
  export PGPASSWORD="$DB_PASSWORD"
fi

# =============================================================================
# Perform Backup
# =============================================================================

log "INFO" "Starting database dump from ${DB_HOST}"

# Build pg_dump command
PG_DUMP_OPTS=(
  -h "$DB_HOST"
  -p "$DB_PORT"
  -U "$DB_USER"
  -d "$DB_NAME"
  --verbose
  --no-owner
  --no-acl
  --format=plain
)

if [ "$DB_SSL" = "true" ]; then
  PG_DUMP_OPTS+=(--sslmode=require)
fi

# Execute dump
if pg_dump "${PG_DUMP_OPTS[@]}" 2>&1 | tee "$BACKUP_FILE" | grep "ERROR"; then
  error_exit "Database dump contained errors"
fi

log "INFO" "Database dump completed: $(du -h "$BACKUP_FILE" | cut -f1)"

# =============================================================================
# Compress Backup
# =============================================================================

log "INFO" "Compressing backup with gzip"

if gzip -f "$BACKUP_FILE"; then
  log "INFO" "Compression completed: $(du -h "$COMPRESSED_FILE" | cut -f1)"
else
  error_exit "Compression failed"
fi

# =============================================================================
# Upload to S3
# =============================================================================

log "INFO" "Uploading to S3: s3://${S3_BUCKET}/${S3_KEY}"

if aws s3 cp "$COMPRESSED_FILE" "s3://${S3_BUCKET}/${S3_KEY}" \
  --region "${AWS_REGION:-us-east-1}" \
  --storage-class STANDARD_IA \
  --metadata "environment=${ENVIRONMENT},date=${BACKUP_DATE}"; then
  log "INFO" "Upload completed successfully"
else
  error_exit "S3 upload failed"
fi

# =============================================================================
# Cleanup Local Files
# =============================================================================

rm -f "$COMPRESSED_FILE"
log "INFO" "Local backup file removed"

# =============================================================================
# Cleanup Old Backups
# =============================================================================

log "INFO" "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days"

CUTOFF_DATE=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y%m%d)

OLD_BACKUPS=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${ENVIRONMENT}/" \
  --region "${AWS_REGION:-us-east-1}" \
  | awk '{print $4}' \
  | grep "patrolmanager_.*\.sql\.gz$" \
  | while read -r key; do
      # Extract date from filename (format: patrolmanager_YYYYMMDD_HHMMSS.sql.gz)
      backup_date=$(echo "$key" | sed -E 's/patrolmanager_([0-9]{8})_[0-9]{6}\.sql\.gz/\1/')
      if [ -n "$backup_date" ] && [ "$backup_date" -lt "$CUTOFF_DATE" ]; then
        echo "$key"
      fi
    done)

if [ -n "$OLD_BACKUPS" ]; then
  DELETED_COUNT=0
  echo "$OLD_BACKUPS" | while read -r old_backup; do
    log "INFO" "Deleting old backup: $old_backup"
    aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${ENVIRONMENT}/${old_backup}" \
      --region "${AWS_REGION:-us-east-1}" \
      && ((DELETED_COUNT++)) || true
  done
  log "INFO" "Deleted ${DELETED_COUNT} old backups"
else
  log "INFO" "No old backups to delete"
fi

# =============================================================================
# Verify Backup
# =============================================================================

log "INFO" "Verifying backup integrity"

# Download and verify
VERIFY_FILE="/tmp/verify_backup_${BACKUP_DATE}.sql.gz"
if aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "$VERIFY_FILE" \
  --region "${AWS_REGION:-us-east-1}" \
  && gzip -t "$VERIFY_FILE"; then
  log "INFO" "Backup verification passed"
else
  log "ERROR" "Backup verification failed"
fi

rm -f "$VERIFY_FILE"

# =============================================================================
# Final Summary
# =============================================================================

BACKUP_SIZE=$(aws s3 ls "s3://${S3_BUCKET}/${S3_KEY}" --region "${AWS_REGION:-us-east-1}" | awk '{print $3}')
TOTAL_BACKUPS=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${ENVIRONMENT}/" --region "${AWS_REGION:-us-east-1}" | wc -l)

log "INFO" "Backup completed successfully"
log "INFO" "Environment: ${ENVIRONMENT}"
log "INFO" "Backup size: ${BACKUP_SIZE}"
log "INFO" "Total backups: ${TOTAL_BACKUPS}"
log "INFO" "S3 location: s3://${S3_BUCKET}/${S3_KEY}"
log "INFO" "Retention: ${BACKUP_RETENTION_DAYS} days"

exit 0
