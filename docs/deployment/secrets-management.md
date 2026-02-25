# Secrets Management Guide

## Overview

PatrolManager uses **AWS Secrets Manager** for secure secret storage and retrieval in production and staging environments. This guide covers the setup, rotation, and usage patterns for managing secrets.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Application   │────▶│ AWS Secrets Manager  │────▶│   Secrets Store  │
│   (ECS/Fargate) │     │   (us-east-1)        │     │   (Encrypted)   │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
         │                                                      │
         │ IAM Role                                            │ KMS Key
         │ (ecsTaskRole)                                       │ (AWS Managed)
         ▼                                                      ▼
```

## Secret Structure

### Production Secrets

Secret Name: `patrolmanager/prod`

```json
{
  "db_host": "patrolmanager-prod.xxxx.us-east-1.rds.amazonaws.com",
  "db_name": "patrolmanager_prod",
  "db_user": "patrolmanager_admin",
  "db_password": "generated_password_here",
  "db_read_replica_1": "patrolmanager-prod-replica1.xxxx.us-east-1.rds.amazonaws.com",
  "db_read_replica_2": "patrolmanager-prod-replica2.xxxx.us-east-1.rds.amazonaws.com",
  "jwt_secret": "generated_jwt_secret_here",
  "session_secret": "generated_session_secret_here",
  "fcm_project_id": "patrolmanager-android",
  "fcm_private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "fcm_client_email": "firebase-adminsdk@patrolmanager.iam.gserviceaccount.com",
  "smtp_user": "AKIAIOSFODNN7EXAMPLE",
  "smtp_password": "BLongPasswordWith+Special/Characters=",
  "twilio_account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "twilio_auth_token": "your_twilio_auth_token",
  "twilio_phone": "+1234567890",
  "maps_api_key": "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sentry_dsn": "https://xxxxx@sentry.io/xxxxx"
}
```

### Staging Secrets

Secret Name: `patrolmanager/staging`

Same structure as production with staging-specific values.

## AWS Setup

### 1. Create KMS Key (Optional - AWS Managed Key Default)

```bash
aws kms create-key \
  --description "PatrolManager Secrets Encryption Key" \
  --region us-east-1
```

### 2. Create Secret in AWS Secrets Manager

```bash
# Production
aws secretsmanager create-secret \
  --name patrolmanager/prod \
  --description "PatrolManager Production Secrets" \
  --region us-east-1

# Staging
aws secretsmanager create-secret \
  --name patrolmanager/staging \
  --description "PatrolManager Staging Secrets" \
  --region us-east-1
```

### 3. Store Secret Values

```bash
aws secretsmanager put-secret-value \
  --secret-id patrolmanager/prod \
  --secret-string file://secrets-prod.json \
  --region us-east-1
```

### 4. Create IAM Policy for ECS Tasks

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:patrolmanager/prod-*",
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:patrolmanager/staging-*"
      ]
    }
  ]
}
```

Attach this policy to the ECS task execution role.

## Application Integration

### Environment Variable Syntax

The application supports AWS Secrets Manager references in `.env` files:

```bash
# Direct reference to a specific secret key
DB_HOST=${aws:secretsmanager:us-east-1:patrolmanager/prod:db_host}
DB_PASSWORD=${aws:secretsmanager:us-east-1:patrolmanager/prod:db_password}
```

### Runtime Secret Retrieval (Node.js)

For scenarios requiring runtime secret retrieval:

```typescript
// backend/src/infrastructure/config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export async function getSecret(secretName: string): Promise<Record<string, string>> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  if (response.SecretString) {
    return JSON.parse(response.SecretString);
  }

  throw new Error('Secret not found or binary secret');
}

// Usage
const secrets = await getSecret('patrolmanager/prod');
process.env.DB_PASSWORD = secrets.db_password;
```

### Secrets Loader Utility

```typescript
// backend/src/infrastructure/config/env.ts
import { getSecret } from './secrets';

export async function loadEnvironment(): Promise<void> {
  const secretName = process.env.NODE_ENV === 'production'
    ? 'patrolmanager/prod'
    : 'patrolmanager/staging';

  try {
    const secrets = await getSecret(secretName);

    // Map secrets to environment variables
    Object.entries(secrets).forEach(([key, value]) => {
      const envKey = key.toUpperCase();
      process.env[envKey] = value;
    });
  } catch (error) {
    console.error('Failed to load secrets:', error);
    throw error;
  }
}
```

## Secret Rotation

### Automatic Rotation Setup

Enable automatic rotation for sensitive credentials:

```bash
aws secretsmanager rotate-secret \
  --secret-id patrolmanager/prod \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:RotatePatrolManagerSecrets \
  --rotation-rules AutomaticallyAfterDays=30 \
  --region us-east-1
```

### Rotation Lambda Function

Create a Lambda function to handle rotation:

```javascript
// lambda/rotate-secrets.js
const { SecretsManagerClient, RotateSecretCommand } = require('@aws-sdk/client-secrets-manager');

exports.handler = async (event) => {
  const client = new SecretsManagerClient({ region: 'us-east-1' });

  // Step 1: Create new secret version
  // Step 2: Test new credentials
  // Step 3: Update secret in Secrets Manager
  // Step 4: Update application (if needed)

  return { statusCode: 200, body: 'Secret rotated successfully' };
};
```

### Rotation Schedule

| Secret Type | Rotation Frequency | Notes |
|------------|-------------------|-------|
| Database Password | 30 days | Requires application restart |
| JWT Secret | 90 days | Existing tokens remain valid until expiry |
| Session Secret | 90 days | Invalidates all active sessions |
| API Keys | As needed | Manual rotation when compromised |

## Local Development

### Using Local Secrets

For local development, use `.env` file with placeholder values:

```bash
# .env (local development - never commit)
DB_PASSWORD=dev_password_123
JWT_SECRET=dev_jwt_secret_not_for_production
```

### AWS Profile Configuration

For local testing with real secrets:

```bash
# ~/.aws/credentials
[patrolmanager]
aws_access_key_id = YOUR_AWS_ACCESS_KEY
aws_secret_access_key = YOUR_AWS_SECRET_KEY
region = us-east-1

# Export profile
export AWS_PROFILE=patrolmanager
```

## Security Best Practices

### 1. Principle of Least Privilege

- ECS tasks only need `GetSecretValue` permission
- Separate IAM roles for different environments
- No direct access to Secrets Manager from public internet

### 2. Secret Versioning

```bash
# List all versions
aws secretsmanager list-secret-version-ids \
  --secret-id patrolmanager/prod

# Restore previous version if needed
aws secretsmanager restore-secret-value \
  --secret-id patrolmanager/prod \
  --version-id VERSION_ID
```

### 3. Audit Logging

Enable CloudTrail logging for Secrets Manager:

```bash
aws logs create-log-group --log-group-name /aws/secretsmanager/audit
```

### 4. Secret Deletion

```bash
# Schedule deletion (7-30 day recovery window)
aws secretsmanager delete-secret \
  --secret-id patrolmanager/prod \
  --recovery-window-in-days 30

# Immediate deletion (no recovery)
aws secretsmanager delete-secret \
  --secret-id patrolmanager/prod \
  --force-delete-without-recovery
```

## Troubleshooting

### Common Issues

**Issue**: `AccessDeniedException` when retrieving secrets

**Solution**: Verify IAM role has `secretsmanager:GetSecretValue` permission

**Issue**: Secrets not resolved in container

**Solution**: Ensure ECS task definition includes proper IAM role ARN

**Issue**: Rotation fails

**Solution**: Check Lambda logs and verify database user has ALTER USER permission

## Monitoring

### CloudWatch Metrics

Monitor these Secrets Manager metrics:

- `SecretsManager.GetSecretValue`
- `SecretsManager.RotateSecret`
- `SecretsManager.ValidationErrors`

### Alarms

```bash
# Create alarm for excessive secret retrieval
aws cloudwatch put-metric-alarm \
  --alarm-name patrolmanager-secrets-retrieval \
  --metric-name GetSecretValue \
  --namespace AWS/SecretsManager \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## References

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [ECS Task IAM Role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
