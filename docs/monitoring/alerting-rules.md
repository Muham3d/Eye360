# Alerting Rules

## Overview

This document defines all alerting rules for monitoring PatrolManager in production. Alerts are configured in Prometheus Alertmanager and trigger notifications to Slack, PagerDuty, or email.

## Alert Categories

1. **Critical** - Immediate action required (pages on-call)
2. **Warning** - Investigation needed (Slack notification)
3. **Info** - Informational (daily digest)

---

## Critical Alerts

### 1. High Error Rate

**Alert Name:** `HighAPIErrorRate`

**Condition:**
```promql
sum(rate(patrolmanager_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(patrolmanager_http_requests_total[5m])) * 100 > 1
```

**Threshold:** 5xx error rate > 1%

**Duration:** 5 minutes

**Severity:** Critical

**Notification:** PagerDuty + Slack #alerts

**Response:**
1. Check dashboard for error patterns
2. Review recent deployments
3. Check database connectivity
4. Verify external service status

---

### 2. High Response Time

**Alert Name:** `HighAPILatency`

**Condition:**
```promql
histogram_quantile(0.95, rate(patrolmanager_http_request_duration_seconds_bucket[5m])) > 1
```

**Threshold:** p95 latency > 1 second

**Duration:** 10 minutes

**Severity:** Critical

**Notification:** PagerDuty + Slack #alerts

**Response:**
1. Check database query performance
2. Review external API latency
3. Check CPU/memory utilization
4. Review active connections

---

### 3. No WebSocket Connections (During Business Hours)

**Alert Name:** `NoWebSocketConnections`

**Condition:**
```promql
sum(patrolmanager_websocket_active_connections) == 0
```

**Threshold:** 0 active connections

**Duration:** 5 minutes (only 06:00-22:00 local time)

**Severity:** Critical

**Notification:** Slack #alerts

**Response:**
1. Verify WebSocket server is running
2. Check load balancer health
3. Review recent deployments
4. Test connection from client

---

### 4. Database Connection Pool Exhausted

**Alert Name:** `DatabasePoolExhausted`

**Condition:**
```promql
patrolmanager_db_connection_pool_size{type="active"} / patrolmanager_db_connection_pool_size{type="total"} * 100 > 90
```

**Threshold:** Pool usage > 90%

**Duration:** 5 minutes

**Severity:** Critical

**Notification:** PagerDuty + Slack #alerts

**Response:**
1. Check for connection leaks
2. Review slow query logs
3. Consider scaling database
4. Restart application if needed

---

### 5. SOS Alert Rate Spike

**Alert Name:** `HighSOSAlertRate`

**Condition:**
```promql
rate(patrolmanager_business_sos_alerts_total[5m]) > 0.1
```

**Threshold:** > 6 SOS alerts per hour

**Duration:** Immediate

**Severity:** Critical

**Notification:** Slack #sos-alerts + PagerDuty

**Response:**
1. Verify with security team
2. Check if genuine emergency
3. Review geolocation of alerts
4. Contact site supervisor

---

## Warning Alerts

### 6. Elevated 4xx Rate

**Alert Name:** `HighClientErrorRate`

**Condition:**
```promql
sum(rate(patrolmanager_http_requests_total{status_code=~"4.."}[5m])) / sum(rate(patrolmanager_http_requests_total[5m])) * 100 > 10
```

**Threshold:** 4xx error rate > 10%

**Duration:** 15 minutes

**Severity:** Warning

**Notification:** Slack #alerts

**Response:**
1. Review API documentation
2. Check for API version mismatch
3. Verify client app updates
4. Review authentication failures

---

### 7. High Memory Usage

**Alert Name:** `HighMemoryUsage`

**Condition:**
```promql
process_resident_memory_bytes / 1024 / 1024 > 512
```

**Threshold:** Memory > 512MB

**Duration:** 15 minutes

**Severity:** Warning

**Notification:** Slack #alerts

**Response:**
1. Check for memory leaks
2. Review heap dumps
3. Consider scaling instance
4. Review cache configuration

---

### 8. High CPU Usage

**Alert Name:** `HighCPUUsage`

**Condition:**
```promql
rate(process_cpu_seconds_total[5m]) * 100 > 80
```

**Threshold:** CPU > 80%

**Duration:** 15 minutes

**Severity:** Warning

**Notification:** Slack #alerts

**Response:**
1. Review query performance
2. Check for infinite loops
3. Scale horizontally if needed
4. Review worker processes

---

### 9. Database Replication Lag

**Alert Name:** `DatabaseReplicationLag`

**Condition:**
```promql
pg_replication_lag_seconds > 30
```

**Threshold:** Replication lag > 30 seconds

**Duration:** 10 minutes

**Severity:** Warning

**Notification:** Slack #alerts

**Response:**
1. Check replica health
2. Review network between regions
3. Check replica resource utilization
4. Consider re-syncing replica

---

### 10. Disk Space Low

**Alert Name:** `DiskSpaceLow`

**Condition:**
```promql
(node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 20
```

**Threshold:** Available space < 20%

**Duration:** 30 minutes

**Severity:** Warning

**Notification:** Slack #alerts

**Response:**
1. Clean up old logs
2. Archive old data
3. Expand disk if needed
4. Review retention policies

---

## Info Alerts

### 11. Daily Health Report

**Alert Name:** `DailyHealthReport`

**Metrics Included:**
- Total requests
- Average response time
- Error rate
- Active users
- Patrols completed
- Incidents created

**Schedule:** Daily at 09:00

**Notification:** Email + Slack #reports

---

## Alert Routing

### Slack Channels

| Channel | Purpose |
|---------|---------|
| `#alerts` | All alerts (critical + warning) |
| `#sos-alerts` | SOS-related alerts only |
| `#reports` | Daily/weekly reports |
| `#deployments` | Deployment notifications |

### PagerDuty Schedules

| Schedule | Coverage |
|----------|----------|
| `backend-oncall` | Backend API issues |
| `database-oncall` | Database issues |
| `security-oncall` | Security/SOS incidents |

---

## Alert Suppression

### Maintenance Windows

Suppress alerts during planned maintenance:

```promql
# Add label to alerts
alert_time{suppress_alerts="true"}
```

### Deployment Windows

Auto-suppress alerts during deployments:

```yaml
# In Alertmanager config
 inhibit_rules:
 - source_match:
     deployment: "active"
   target_match_re:
     severity: "Warning"
```

---

## Testing Alerts

### Test Alert Rules

```bash
# Using promtool
promtool test rules alerting_rules.yml

# Generate test traffic
npm run test:load

# Trigger test alert
curl -X POST http://localhost:9093/api/v1/receivers
```

---

## Alert Configuration Files

### Prometheus Alert Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: patrolmanager
    interval: 30s
    rules:
      - alert: HighAPIErrorRate
        expr: |
          sum(rate(patrolmanager_http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(patrolmanager_http_requests_total[5m])) * 100 > 1
        for: 5m
        labels:
          severity: critical
          service: patrolmanager-api
        annotations:
          summary: "High API error rate detected"
          description: "Error rate is {{ $value }}% (> 1%)"
```

### Alertmanager Config

```yaml
# alertmanager/alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'slack-alerts'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    - match:
        alertname: 'HighSOSAlertRate'
      receiver: 'slack-sos'

receivers:
  - name: 'slack-alerts'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'slack-sos'
    slack_configs:
      - channel: '#sos-alerts'
        title: '🚨 SOS ALERT 🚨'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        severity: 'critical'
```

---

## On-Call Runbook

### Response Checklist

1. **Acknowledge** the alert in Alertmanager
2. **Assess** severity and impact
3. **Investigate** root cause using dashboards
4. **Mitigate** immediate issue
5. **Resolve** and verify service health
6. **Document** incident and post-mortem

### Escalation Path

1. **5 minutes** - Acknowledge alert
2. **15 minutes** - Initial assessment
3. **30 minutes** - Escalate if unresolved
4. **60 minutes** - Major incident declared

---

## References

- [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [PagerDuty Integration](https://www.pagerduty.com/docs/guides/prometheus-integration-guide/)
