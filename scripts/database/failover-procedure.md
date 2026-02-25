# Database Failover Procedure

## Overview

This document provides step-by-step procedures for handling database failover scenarios in the PatrolManager production environment.

## Failover Scenarios

### Scenario 1: Automated Multi-AZ Failover

**Trigger:** Primary instance failure detected by AWS RDS

**Timeline:** 30-60 seconds automatic failover

#### What Happens Automatically

1. AWS detects primary instance failure
2. Standby replica in different AZ is promoted
3. DNS CNAME record is updated
4. Application connections briefly fail then reconnect

#### Application Behavior

- **During failover (30-60s):** Connection errors, requests fail
- **After failover:** Automatic reconnection, requests resume

#### Post-Failover Verification

```bash
# 1. Check current primary endpoint
aws rds describe-db-instances \
  --db-instance-identifier patrolmanager-prod \
  --query 'DBInstances[0].Endpoint.Address'

# 2. Verify database accessibility
psql -h $NEW_ENDPOINT -U $DB_USER -d $DB_NAME -c "SELECT now();"

# 3. Check replication status (should be empty on new primary)
psql -h $NEW_ENDPOINT -U $DB_USER -d $DB_NAME \
  -c "SELECT * FROM pg_stat_replication;"

# 4. Verify application connectivity
curl https://api.patrolmanager.com/health
```

---

### Scenario 2: Manual Failover to Read Replica

**Trigger:** Planned maintenance or primary degradation

#### Pre-Failover Checklist

- [ ] Notify stakeholders via Slack #maintenance
- [ ] Verify replica health (sync_state = 'sync')
- [ ] Ensure maintenance window approved
- [ ] Have rollback plan ready

#### Step-by-Step Procedure

**Step 1: Verify Replica Health**

```bash
aws rds describe-db-instances \
  --db-instance-identifier patrolmanager-prod-replica-1 \
  --query 'DBInstances[0].[DBInstanceStatus,ReadReplicaSourceDBInstanceIdentifier]'

# Expected output:
# ["available", "patrolmanager-prod"]
```

**Step 2: Check Replication Lag**

```sql
-- Run on primary
SELECT
  client_addr,
  state,
  sync_state,
  replay_lag
FROM pg_stat_replication;

-- sync_state should be 'sync' (zero lag)
```

**Step 3: Promote Replica to Standalone**

```bash
aws rds promote-read-replica \
  --db-instance-identifier patrolmanager-prod-replica-1 \
  --region us-east-1

# Wait for promotion to complete (2-5 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier patrolmanager-prod-replica-1
```

**Step 4: Update Application Configuration**

```bash
# Update environment variable in AWS ECS
aws ecs update-service \
  --cluster patrolmanager-cluster \
  --service patrolmanager-service \
  --force-new-deployment \
  --environment "name=DB_HOST,value=patrolmanager-prod-replica-1.xxx.us-east-1.rds.amazonaws.com"

# Or update Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id patrolmanager/prod \
  --secret-string '{"db_host":"patrolmanager-prod-replica-1.xxx...","...": "..."}'
```

**Step 5: Update DNS (if using CNAME)**

```bash
# Update Route53 CNAME
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "db.patrolmanager.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "patrolmanager-prod-replica-1.xxx.us-east-1.rds.amazonaws.com"}]
      }
    }]
  }'
```

**Step 6: Verify New Primary**

```sql
-- Connect to new primary and verify
psql -h $NEW_PRIMARY_HOST -U $DB_USER -d $DB_NAME

-- Should return 0 rows (no replicas)
SELECT * FROM pg_stat_replication;

-- Verify read/write operations
BEGIN;
INSERT INTO health_check (timestamp) VALUES (now());
ROLLBACK;
```

**Step 7: Recreate Read Replicas**

```bash
# Create new replica from promoted instance
aws rds create-read-replica \
  --db-instance-identifier patrolmanager-prod-replica-2 \
  --source-db-instance-identifier patrolmanager-prod-replica-1 \
  --availability-zone us-east-1b

# Wait for replica to be available
aws rds wait db-instance-available \
  --db-instance-identifier patrolmanager-prod-replica-2
```

---

### Scenario 3: Point-in-Time Recovery (PITR)

**Trigger:** Data corruption or accidental deletion

#### Recovery Procedure

**Step 1: Identify Recovery Time**

```bash
# Determine the time before the incident
RECOVERY_TIME="2024-02-01 14:30:00"  # UTC time before incident
```

**Step 2: Initiate Restore**

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier patrolmanager-prod \
  --target-db-instance-identifier patrolmanager-prod-restored \
  --restore-time "$RECOVERY_TIME" \
  --db-subnet-group-name patrolmanager-db-subnet-group \
  --vpc-security-group-ids sg-12345678 \
  --multi-az \
  --db-instance-class db.r6g.xlarge
```

**Step 3: Wait for Restore**

```bash
# Monitor restore progress
aws rds describe-db-instances \
  --db-instance-identifier patrolmanager-prod-restored \
  --query 'DBInstances[0].[DBInstanceStatus,PercentProgress]'

# Wait for completion (10-30 minutes depending on data size)
aws rds wait db-instance-available \
  --db-instance-identifier patrolmanager-prod-restored
```

**Step 4: Swap Instances**

```bash
# Option A: DNS swap (recommended)
# Update application to point to restored instance
# Then delete old instance after verification

# Option B: Rename (requires downtime)
aws rds modify-db-instance \
  --db-instance-identifier patrolmanager-prod \
  --new-db-instance-identifier patrolmanager-prod-old \
  --apply-immediately

aws rds modify-db-instance \
  --db-instance-identifier patrolmanager-prod-restored \
  --new-db-instance-identifier patrolmanager-prod \
  --apply-immediately
```

---

### Scenario 4: Region Failover (Disaster Recovery)

**Trigger:** Complete AWS region failure

#### Prerequisites

- Cross-region snapshot replication configured
- DR infrastructure provisioned in secondary region
- Tested failover procedures

#### Procedure

**Step 1: Verify DR Region Status**

```bash
# Check DR region (us-west-2)
aws rds describe-db-snapshots \
  --region us-west-2 \
  --db-instance-identifier patrolmanager-prod \
  --query 'DBSnapshots[-1].[DBSnapshotIdentifier,SnapshotCreateTime]'
```

**Step 2: Restore from Latest Snapshot**

```bash
aws rds restore-db-instance-from-db-snapshot \
  --region us-west-2 \
  --db-instance-identifier patrolmanager-prod-dr \
  --db-snapshot-identifier patrolmanager-prod-final \
  --db-subnet-group-name patrolmanager-db-subnet-group-dr \
  --vpc-security-group-ids sg-87654321 \
  --multi-az \
  --db-instance-class db.r6g.xlarge
```

**Step 3: Update Application Region**

```bash
# Update ECS task definition to point to DR region
# Update all AWS resource ARNs
# Update CloudFront origin
# Update Route53 geolocation routing

# Update environment variables
export AWS_REGION=us-west-2
export DB_HOST=patrolmanager-prod-dr.xxx.us-west-2.rds.amazonaws.com
```

---

## Rollback Procedures

### Rollback After Manual Failover

If new primary has issues:

```bash
# 1. Promote original primary back (if still available)
aws rds promote-read-replica \
  --db-instance-identifier patrolmanager-prod-old \
  --region us-east-1

# 2. Update application back to original
aws secretsmanager put-secret-value \
  --secret-id patrolmanager/prod \
  --secret-string '{"db_host":"patrolmanager-prod-old.xxx..."}'

# 3. Recreate replicas from original primary
aws rds create-read-replica \
  --db-instance-identifier patrolmanager-prod-replica-1 \
  --source-db-instance-identifier patrolmanager-prod-old
```

---

## Health Checks

### Pre-Failover Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

echo "=== PatrolManager Database Health Check ==="

# 1. Primary instance status
echo -e "\n1. Primary Status:"
aws rds describe-db-instances \
  --db-instance-identifier patrolmanager-prod \
  --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address,AllocatedStorage,CPUUtilization]'

# 2. Replication status
echo -e "\n2. Replication Lag:"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
  "SELECT client_addr, replay_lag FROM pg_stat_replication;"

# 3. Connection pool
echo -e "\n3. Connection Pool:"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
  "SELECT count, state FROM pg_stat_activity GROUP BY state;"

# 4. Slow queries
echo -e "\n4. Slow Queries (>1s):"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"

# 5. Disk space
echo -e "\n5. Disk Space:"
aws rds describe-db-instances \
  --db-instance-identifier patrolmanager-prod \
  --query 'DBInstances[0].[FreeStorageSpace,AllocatedStorage]'
```

---

## Communication Plan

### Incident Communication Template

```markdown
**Database Failover - Incident Report**

**Status:** 🔴 Active / 🟢 Resolved
**Started:** [Timestamp]
**Expected Duration:** [Minutes/Hours]

**Impact:**
- Users may experience intermittent errors
- Active connections may be dropped
- [X] API requests failing
- [X] Authentication issues

**Actions Taken:**
1. [Time] - Issue detected
2. [Time] - Failover initiated
3. [Time] - Verification in progress

**Next Update:** [Time]

**On-Call:** [@mention]
```

---

## Testing Failover

### Scheduled Failover Test

```bash
# 1. Create test replica
aws rds create-read-replica \
  --db-instance-identifier patrolmanager-test-failover \
  --source-db-instance-identifier patrolmanager-prod

# 2. Promote test replica
aws rds promote-read-replica \
  --db-instance-identifier patrolmanager-test-failover

# 3. Test application connectivity
export TEST_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier patrolmanager-test-failover \
  --query 'DBInstances[0].Endpoint.Address' --output text)

npm run test:integration -- --db-host=$TEST_HOST

# 4. Clean up
aws rds delete-db-instance \
  --db-instance-identifier patrolmanager-test-failover \
  --skip-final-snapshot \
  --delete-automated-backups
```

---

## References

- [AWS RDS Multi-AZ Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)
- [AWS RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Point-in-Time Recovery](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html)
