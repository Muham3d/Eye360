# Cloud Architecture & Deployment Specification

## 1. Cloud Infrastructure (AWS)

### Compute
- **ECS (Elastic Container Service)**: Fargate-based deployment for the Express API and Socket.io server.
- **Auto-scaling**: Scales based on CPU/Memory usage and active WebSocket connections.

### Database
- **RDS (Relational Database Service)**: PostgreSQL 16.
- **Multi-AZ**: High availability across different availability zones.
- **Read Replicas**: Offload heavy reporting and analytics queries.

### Networking
- **VPC (Virtual Private Cloud)**: Isolated network with public/private subnets.
- **ALB (Application Load Balancer)**: SSL termination and traffic routing.
- **CloudFront**: CDN for serving static assets and evidence files (images/videos).

### Storage
- **S3 (Simple Storage Service)**: Encrypted storage for incident evidence.

## 2. CI/CD Pipeline (GitHub Actions)

### Workflow
1. **Lint & Test**: Run `eslint` and `jest` on every PR.
2. **Build**: Build production Docker images for Backend and Admin UI.
3. **Scan**: Run `snyk` or `trivy` for dependency and image vulnerabilities.
4. **Push**: Push images to **AWS ECR** (Elastic Container Registry).
5. **Deploy**: Update ECS service with zero-downtime rolling deployment.

## 3. Monitoring & Observability

### Logging
- **Winston + CloudWatch**: Centralized structured logging.
- **Error Tracking**: Integration with **Sentry** for real-time error reporting.

### Metrics
- **Prometheus + Grafana**: Performance dashboards.
- **Alerting**: PagerDuty or Slack notifications for 5xx errors and high latency.

## 4. Production Hardening
- **Secrets**: Use **AWS Secrets Manager** for environment variables.
- **WAF**: Web Application Firewall to block SQLi, XSS, and DDoS.
- **Database**: Automatic daily backups with 30-day retention.
