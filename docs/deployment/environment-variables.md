# Environment Variables Reference

Complete reference for all environment variables used by PatrolManager.

## Table of Contents

- [Server Configuration](#server-configuration)
- [Database Configuration](#database-configuration)
- [Authentication](#authentication)
- [AWS Configuration](#aws-configuration)
- [Storage & File Upload](#storage--file-upload)
- [Real-time Communication](#real-time-communication)
- [Geofencing & GPS](#geofencing--gps)
- [Notifications](#notifications)
- [External Integrations](#external-integrations)
- [Feature Flags](#feature-flags)
- [Monitoring & Logging](#monitoring--logging)
- [Security](#security)
- [Maintenance](#maintenance)

---

## Server Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `NODE_ENV` | string | `development` | Yes | Application environment (development, staging, production) |
| `PORT` | number | `3000` | Yes | Server port number |
| `SERVER_HOST` | string | `0.0.0.0` | Yes | Server bind address |
| `API_URL` | string | `http://localhost:3000` | Yes | Public API URL (for links, webhooks) |

---

## Database Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `DB_HOST` | string | `localhost` | Yes | Database server hostname |
| `DB_PORT` | number | `5432` | Yes | Database server port |
| `DB_NAME` | string | `patrolmanager` | Yes | Database name |
| `DB_USER` | string | `patrolmanager` | Yes | Database user |
| `DB_PASSWORD` | string | - | Yes | Database password (use Secrets Manager) |
| `DB_SSL` | boolean | `false` | No | Enable SSL for database connection |
| `DB_URL` | string | - | No | Full connection string (overrides individual settings) |
| `DB_READ_REPLICA_1` | string | - | No | First read replica hostname |
| `DB_READ_REPLICA_2` | string | - | No | Second read replica hostname |

### Connection Pool Settings

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `DB_POOL_MAX` | number | `20` | No | Maximum pool size |
| `DB_POOL_MIN` | number | `2` | No | Minimum pool size |
| `DB_POOL_ACQUIRE` | number | `10000` | No | Milliseconds to acquire connection before error |
| `DB_POOL_IDLE` | number | `10000` | No | Milliseconds connection must be idle before timeout |
| `DB_POOL_EVICT` | number | `60000` | No | Milliseconds between eviction checks |

---

## Authentication

### JWT Configuration (Mobile API)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `JWT_SECRET` | string | - | Yes | JWT signing secret (use Secrets Manager) |
| `JWT_EXPIRES_IN` | string | `1h` | No | JWT access token expiration |
| `JWT_REFRESH_EXPIRES_IN` | string | `7d` | No | JWT refresh token expiration |
| `JWT_ISSUER` | string | `patrolmanager` | No | JWT issuer claim |
| `JWT_AUDIENCE` | string | `patrolmanager-api` | No | JWT audience claim |

### Session Configuration (Admin Web)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `SESSION_SECRET` | string | - | Yes | Session signing secret (use Secrets Manager) |
| `SESSION_COOKIE_MAX_AGE` | number | `86400000` | No | Cookie max age in milliseconds (24 hours) |
| `SESSION_COOKIE_SECURE` | boolean | `false` | No | Require HTTPS for cookies |
| `SESSION_COOKIE_SAMESITE` | string | `lax` | No | SameSite cookie policy (strict, lax, none) |

---

## AWS Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `AWS_REGION` | string | `us-east-1` | Yes | AWS region |
| `AWS_SECRETS_MANAGER_ARN` | string | - | No | Secrets Manager ARN pattern |
| `AWS_ACCESS_KEY_ID` | string | - | No* | AWS access key (use IAM role in ECS) |
| `AWS_SECRET_ACCESS_KEY` | string | - | No* | AWS secret key (use IAM role in ECS) |
| `AWS_S3_BUCKET` | string | - | Yes | S3 bucket for evidence files |
| `AWS_ECR_REPOSITORY` | string | - | No | ECR repository name |
| `AWS_CLOUDFRONT_DOMAIN` | string | - | No | CloudFront domain for CDN |

*Not required when using IAM roles in ECS.

---

## Storage & File Upload

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `STORAGE_TYPE` | string | `local` | Yes | Storage backend (local, s3) |
| `S3_BUCKET` | string | - | Yes* | S3 bucket name |
| `S3_REGION` | string | `us-east-1` | No* | S3 region |
| `S3_ACL` | string | `private` | No* | S3 object ACL |
| `MAX_FILE_SIZE` | number | `52428800` | No | Max upload size in bytes (50MB) |
| `ALLOWED_FILE_TYPES` | string | - | No | Comma-separated allowed MIME types |

*Required when `STORAGE_TYPE=s3`.

### Allowed MIME Types

Default allowed types:
- `image/jpeg`
- `image/png`
- `image/gif`
- `video/mp4`
- `video/webm`

---

## Real-time Communication

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `SOCKET_IO_PORT` | number | `3000` | No | Socket.io port (same as API) |
| `SOCKET_IO_PATH` | string | `/socket.io` | No | Socket.io endpoint path |
| `SOCKET_IO_PING_TIMEOUT` | number | `30000` | No | Ping timeout in milliseconds |
| `SOCKET_IO_PING_INTERVAL` | number | `25000` | No | Ping interval in milliseconds |

---

## Geofencing & GPS

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `GPS_UPDATE_INTERVAL` | number | `5000` | No | GPS update interval in milliseconds |
| `GPS_MAX_DEVIATION` | number | `100` | No | Max GPS deviation in meters |
| `GEOFENCE_CHECK_INTERVAL` | number | `30000` | No | Geofence check interval in milliseconds |

---

## Notifications

### Push Notifications (FCM)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `PUSH_NOTIFICATION_SERVICE` | string | - | No | Provider (fcm, apns) |
| `FCM_PROJECT_ID` | string | - | Yes* | Firebase project ID |
| `FCM_PRIVATE_KEY` | string | - | Yes* | Firebase service account key |
| `FCM_CLIENT_EMAIL` | string | - | Yes* | Firebase service account email |

*Required when `PUSH_NOTIFICATION_SERVICE=fcm`.

### Email Notifications (SES/SMTP)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `SMTP_HOST` | string | - | Yes* | SMTP server hostname |
| `SMTP_PORT` | number | `587` | No | SMTP server port |
| `SMTP_SECURE` | boolean | `false` | No | Use TLS for SMTP |
| `SMTP_USER` | string | - | Yes* | SMTP username |
| `SMTP_PASSWORD` | string | - | Yes* | SMTP password |
| `SMTP_FROM` | string | - | Yes* | From email address |

*Required for email notifications.

---

## External Integrations

### Twilio (SMS)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | string | - | Yes* | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | string | - | Yes* | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | string | - | Yes* | Twilio phone number |

*Required for SMS notifications.

### Maps Service

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `MAPS_API_KEY` | string | - | Yes* | Maps API key |
| `MAPS_PROVIDER` | string | `google` | No | Maps provider (google, mapbox) |

*Required for mapping features.

### Error Tracking (Sentry)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `SENTRY_DSN` | string | - | No | Sentry DSN |
| `SENTRY_ENVIRONMENT` | string | `production` | No | Sentry environment name |

---

## Feature Flags

All feature flags use the prefix `FEATURE_` and accept boolean values.

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_OFFLINE_SYNC` | `true` | Enable offline data synchronization |
| `FEATURE_SOS_ALERTS` | `true` | Enable SOS emergency alerts |
| `FEATURE_PTT_ENABLED` | `true` | Enable Push-to-Talk |
| `FEATURE_INCIDENT_ESCALATION` | `true` | Enable incident escalation |
| `FEATURE_PATROL_AUTO_ASSIGNMENT` | `false` | Enable auto patrol assignment |
| `FEATURE_REAL_TIME_TRACKING` | `true` | Enable real-time GPS tracking |
| `FEATURE_ANALYTICS_DASHBOARD` | `true` | Enable analytics dashboard |

See [feature-flags.md](./feature-flags.md) for details.

---

## Monitoring & Logging

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `LOG_LEVEL` | string | `info` | No | Log level (error, warn, info, debug) |
| `LOG_FORMAT` | string | `json` | No | Log format (json, text) |
| `LOG_CLOUDWATCH_ENABLED` | boolean | `false` | No | Enable CloudWatch logging |
| `LOG_CLOUDWATCH_GROUP` | string | - | No* | CloudWatch log group name |
| `LOG_CLOUDWATCH_STREAM` | string | - | No* | CloudWatch log stream name |
| `LOG_PROMETHEUS_ENABLED` | boolean | `false` | No | Enable Prometheus metrics |
| `LOG_FILE_PATH` | string | `./logs` | No | Local log file path |
| `LOG_MAX_FILES` | number | `14` | No | Max log files to retain |
| `LOG_MAX_SIZE` | string | `20m` | No | Max size per log file |

*Required when `LOG_CLOUDWATCH_ENABLED=true`.

---

## Security

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `CORS_ORIGIN` | string | `*` | Yes | CORS allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | number | `900000` | No | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | number | `100` | No | Max requests per window |
| `RATE_LIMIT_AUTH_ENABLED` | boolean | `true` | No | Enable auth rate limiting |
| `RATE_LIMIT_AUTH_MAX` | number | `20` | No | Max auth requests per window |
| `RATE_LIMIT_AUTH_WINDOW` | number | `60000` | No | Auth rate limit window |
| `HELMET_ENABLED` | boolean | `true` | No | Enable Helmet security headers |
| `CSP_ENABLED` | boolean | `true` | No | Enable Content Security Policy |

---

## Maintenance

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `BACKUP_ENABLED` | boolean | `true` | No | Enable automated backups |
| `BACKUP_RETENTION_DAYS` | number | `30` | No | Backup retention period |
| `BACKUP_S3_BUCKET` | string | - | No* | S3 bucket for backups |
| `MAINTENANCE_MODE` | boolean | `false` | No | Enable maintenance mode |

*Required when `BACKUP_ENABLED=true`.

---

## Docker Compose Services

### PostgreSQL (Development)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `POSTGRES_HOST` | string | `localhost` | PostgreSQL container hostname |
| `POSTGRES_PORT` | number | `5432` | PostgreSQL container port |

### PgAdmin

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PGADMIN_EMAIL` | string | - | PgAdmin login email |
| `PGADMIN_PASSWORD` | string | - | PgAdmin login password |
| `PGADMIN_PORT` | number | `5050` | PgAdmin web port |

### Redis

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `REDIS_HOST` | string | `localhost` | Redis container hostname |
| `REDIS_PORT` | number | `6379` | Redis container port |

---

## Environment-Specific Defaults

### Development (.env)

```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_SSL=false
CORS_ORIGIN=*
RATE_LIMIT_MAX=1000
```

### Staging (.env.staging)

```bash
NODE_ENV=staging
LOG_LEVEL=debug
DB_SSL=true
CORS_ORIGIN=https://staging-admin.patrolmanager.com,http://localhost:5173
RATE_LIMIT_MAX=500
JWT_EXPIRES_IN=24h
```

### Production (.env.production)

```bash
NODE_ENV=production
LOG_LEVEL=info
DB_SSL=true
CORS_ORIGIN=https://admin.patrolmanager.com
RATE_LIMIT_MAX=100
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=strict
```

---

## Secret Generation Commands

### Generate Secure Random Values

```bash
# JWT Secret (32 bytes)
openssl rand -hex 32

# Session Secret (32 bytes)
openssl rand -hex 32

# Database Password (16 bytes)
openssl rand -base64 16

# API Key (32 bytes)
openssl rand -hex 32
```

---

## Validation Checklist

Before deploying, verify:

- [ ] All required variables are set
- [ ] Secrets use AWS Secrets Manager references
- [ ] `NODE_ENV` matches environment
- [ ] `DB_SSL=true` for non-development
- [ ] CORS origin is specific (not `*`)
- [ ] Rate limits are appropriate
- [ ] S3 bucket names are environment-specific
- [ ] Feature flags are set correctly
- [ ] Backup configuration is enabled
- [ ] Monitoring is enabled
- [ ] Sentry DSN is configured

---

## References

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Feature Flags Documentation](./feature-flags.md)
- [Secrets Management Guide](./secrets-management.md)
