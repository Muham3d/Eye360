#!/bin/bash

###############################################################################
# PatrolManager Security Scan Script
#
# Purpose: Run comprehensive security scans on the PatrolManager backend
#          including dependency audits, Snyk tests, OWASP ZAP scans,
#          and custom security test suites.
#
# Usage: ./scripts/security/run-security-scan.sh [options]
#
# Options:
#   --skip-npm       Skip npm audit
#   --skip-snyk      Skip Snyk scan
#   --skip-zap       Skip OWASP ZAP scan
#   --skip-tests     Skip custom security tests
#   --report-dir     Custom report directory (default: reports/security)
#   --help           Show this help message
#
# Requirements:
#   - Node.js 18+
#   - npm 9+
#   - Snyk CLI (optional)
#   - OWASP ZAP (optional)
#   - Docker (for ZAP container)
#
# Output: Generates HTML and JSON reports in reports/security/
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/security"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SKIP_NPM=false
SKIP_SNYK=false
SKIP_ZAP=false
SKIP_TESTS=false
ZAP_PORT=8080
ZAP_HOST="localhost"
APP_URL="http://localhost:3000"
APP_HOST="localhost"
APP_PORT=3000

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-npm)
      SKIP_NPM=true
      shift
      ;;
    --skip-snyk)
      SKIP_SNYK=true
      shift
      ;;
    --skip-zap)
      SKIP_ZAP=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --report-dir)
      REPORT_DIR="$2"
      shift 2
      ;;
    --app-url)
      APP_URL="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --skip-npm       Skip npm audit"
      echo "  --skip-snyk      Skip Snyk scan"
      echo "  --skip-zap       Skip OWASP ZAP scan"
      echo "  --skip-tests     Skip custom security tests"
      echo "  --report-dir     Custom report directory (default: reports/security)"
      echo "  --app-url        Application URL for ZAP scan (default: http://localhost:3000)"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Create report directory
mkdir -p "$REPORT_DIR"

# Log file
LOG_FILE="$REPORT_DIR/scan_$TIMESTAMP.log"

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_section() {
  echo "" | tee -a "$LOG_FILE"
  echo -e "${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
  echo -e "${BLUE}$1${NC}" | tee -a "$LOG_FILE"
  echo -e "${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Header
log_section "PatrolManager Security Scan"
log_info "Report directory: $REPORT_DIR"
log_info "Timestamp: $TIMESTAMP"
log_info "Project root: $PROJECT_ROOT"

# Change to backend directory
cd "$PROJECT_ROOT/backend"

###############################################################################
# NPM Audit
###############################################################################
if [ "$SKIP_NPM" = false ]; then
  log_section "1. NPM Audit - Dependency Vulnerability Scan"

  if command_exists npm; then
    log_info "Running npm audit..."

    # Run npm audit and save output
    npm audit --json > "$REPORT_DIR/npm_audit_$TIMESTAMP.json" 2>&1 || true
    npm audit > "$REPORT_DIR/npm_audit_$TIMESTAMP.txt" 2>&1 || true

    # Check for critical vulnerabilities
    CRITICAL_COUNT=$(grep -o '"severity": "critical"' "$REPORT_DIR/npm_audit_$TIMESTAMP.json" | wc -l || echo "0")
    HIGH_COUNT=$(grep -o '"severity": "high"' "$REPORT_DIR/npm_audit_$TIMESTAMP.json" | wc -l || echo "0")
    MODERATE_COUNT=$(grep -o '"severity": "moderate"' "$REPORT_DIR/npm_audit_$TIMESTAMP.json" | wc -l || echo "0")

    log_info "Vulnerabilities found:"
    log_info "  - Critical: $CRITICAL_COUNT"
    log_info "  - High: $HIGH_COUNT"
    log_info "  - Moderate: $MODERATE_COUNT"

    if [ "$CRITICAL_COUNT" -gt 0 ] || [ "$HIGH_COUNT" -gt 0 ]; then
      log_warning "Found critical or high severity vulnerabilities!"
    else
      log_success "No critical or high severity vulnerabilities found."
    fi
  else
    log_error "npm not found. Skipping npm audit."
  fi
else
  log_info "Skipping npm audit (--skip-npm flag set)"
fi

###############################################################################
# Snyk Scan
###############################################################################
if [ "$SKIP_SNYK" = false ]; then
  log_section "2. Snyk Scan - Dependency & Code Security"

  if command_exists snyk; then
    log_info "Running Snyk test..."

    # Check if Snyk is authenticated
    if snyk auth --help >/dev/null 2>&1; then
      # Run Snyk test for dependencies
      snyk test --json > "$REPORT_DIR/snyk_deps_$TIMESTAMP.json" 2>&1 || true
      snyk test > "$REPORT_DIR/snyk_deps_$TIMESTAMP.txt" 2>&1 || true

      # Run Snyk code test if available
      if snyk code --help >/dev/null 2>&1; then
        log_info "Running Snyk code scan..."
        snyk code test --json > "$REPORT_DIR/snyk_code_$TIMESTAMP.json" 2>&1 || true
        snyk code test > "$REPORT_DIR/snyk_code_$TIMESTAMP.txt" 2>&1 || true
      fi

      log_success "Snyk scan completed."
    else
      log_warning "Snyk not authenticated. Run 'snyk auth' first."
      log_warning "Skipping Snyk scan."
    fi
  else
    log_warning "Snyk CLI not found. To install: npm install -g snyk"
    log_warning "Skipping Snyk scan."
  fi
else
  log_info "Skipping Snyk scan (--skip-snyk flag set)"
fi

###############################################################################
# OWASP ZAP Scan
###############################################################################
if [ "$SKIP_ZAP" = false ]; then
  log_section "3. OWASP ZAP Baseline Scan - Dynamic Application Security Testing"

  # Check if application is running
  if ! curl -s -f "$APP_URL/health" >/dev/null 2>&1; then
    log_warning "Application not running at $APP_URL"
    log_warning "Starting application for ZAP scan..."

    # Start the application in background
    NODE_ENV=test node dist/server.js &
    APP_PID=$!

    # Wait for application to start
    log_info "Waiting for application to start..."
    for i in {1..30}; do
      if curl -s -f "$APP_URL/health" >/dev/null 2>&1; then
        log_success "Application started successfully."
        break
      fi
      sleep 1
    done

    # Trap to kill application on exit
    trap "kill $APP_PID 2>/dev/null || true" EXIT
  fi

  # Check for Docker and ZAP
  if command_exists docker; then
    log_info "Running OWASP ZAP baseline scan via Docker..."

    # Create ZAP configuration
    ZAP_CONFIG="$SCRIPT_DIR/zap-config.yaml"

    # Run ZAP baseline scan
    docker run --rm -t \
      --name zap-scan \
      -u zap \
      -v "$REPORT_DIR:/zap/wrk" \
      -v "$SCRIPT_DIR:/zap/scripts" \
      ghcr.io/zaproxy/zaproxy:stable \
      zap-baseline.py \
      -t "$APP_URL" \
      -r "zap_report_$TIMESTAMP.html" \
      -w "zap_report_$TIMESTAMP.md" \
      -x "zap_report_$TIMESTAMP.xml" \
      -a \
      -c "$ZAP_CONFIG" \
      --hook=/zap/scripts/zap-hook.js 2>&1 | tee -a "$LOG_FILE" || true

    log_success "OWASP ZAP scan completed. Reports saved to $REPORT_DIR"
  elif command_exists zap-cli || command_exists zap.sh; then
    log_info "Running OWASP ZAP baseline scan via local installation..."

    # Try zap-cli first
    if command_exists zap-cli; then
      zap-cli quick-scan \
        --self-contained \
        --start-options "-config api.disablekey=true" \
        --output-file "$REPORT_DIR/zap_report_$TIMESTAMP.html" \
        "$APP_URL" 2>&1 | tee -a "$LOG_FILE" || true
    else
      # Fallback to zap.sh
      zap.sh -daemon \
        -host "$ZAP_HOST" \
        -port "$ZAP_PORT" \
        -config api.disablekey=true 2>&1 | tee -a "$LOG_FILE" || true

      sleep 5

      # Run baseline scan
      zap.sh -host "$ZAP_HOST" -port "$ZAP_PORT" \
        -script "$SCRIPT_DIR/zap-baseline.js" \
        "$APP_URL" 2>&1 | tee -a "$LOG_FILE" || true

      # Generate report
      zap.sh -host "$ZAP_HOST" -port "$ZAP_PORT" \
        -alert \
        -save "$REPORT_DIR/zap_report_$TIMESTAMP.session" \
        2>&1 | tee -a "$LOG_FILE" || true
    fi

    log_success "OWASP ZAP scan completed."
  else
    log_warning "OWASP ZAP not found."
    log_warning "To install via Docker: docker pull ghcr.io/zaproxy/zaproxy:stable"
    log_warning "To install locally: https://www.zaproxy.org/download/"
    log_warning "Skipping ZAP scan."
  fi
else
  log_info "Skipping OWASP ZAP scan (--skip-zap flag set)"
fi

###############################################################################
# Custom Security Tests
###############################################################################
if [ "$SKIP_TESTS" = false ]; then
  log_section "4. Custom Security Test Suite"

  # Run Jest security tests
  if [ -f "$PROJECT_ROOT/backend/package.json" ]; then
    log_info "Running security-specific tests..."

    # Run tests with security tag
    if npm run test -- --testPathPattern="tests/security" --coverage --coverageReporters="json" --coverageReporters="html" 2>&1 | tee -a "$LOG_FILE"; then
      log_success "Security tests passed."
    else
      log_warning "Some security tests failed. Review the output above."
    fi

    # Move coverage report
    if [ -d "$PROJECT_ROOT/backend/coverage" ]; then
      cp -r "$PROJECT_ROOT/backend/coverage" "$REPORT_DIR/coverage_$TIMESTAMP"
    fi
  else
    log_error "package.json not found. Skipping custom security tests."
  fi
else
  log_info "Skipping custom security tests (--skip-tests flag set)"
fi

###############################################################################
# Additional Security Checks
###############################################################################
log_section "5. Additional Security Checks"

# Check for sensitive files
log_info "Checking for sensitive files in repository..."
SENSITIVE_FILES=(
  ".env"
  ".env.local"
  ".env.production"
  "*.key"
  "*.pem"
  "id_rsa"
  "credentials.json"
  "secrets.yaml"
)

FOUND_SENSITIVE=0
for pattern in "${SENSITIVE_FILES[@]}"; do
  if git ls-files "$pattern" 2>/dev/null | grep -q .; then
    log_warning "Potential sensitive file found in git: $pattern"
    FOUND_SENSITIVE=$((FOUND_SENSITIVE + 1))
  fi
done

if [ "$FOUND_SENSITIVE" -eq 0 ]; then
  log_success "No sensitive files found in git repository."
fi

# Check for hardcoded secrets (basic check)
log_info "Checking for potential hardcoded secrets..."
SECRET_PATTERNS=(
  "password.*=.*['\"][^'\"]{8,}['\"]"
  "api[_-]?key.*=.*['\"][^'\"]{20,}['\"]"
  "secret.*=.*['\"][^'\"]{16,}['\"]"
  "token.*=.*['\"][^'\"]{32,}['\"]"
)

FOUND_SECRETS=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  if git grep -i -E "$pattern" -- "*.ts" "*.js" "*.json" 2>/dev/null | grep -v "node_modules" | grep -v "test" | head -5 | grep -q .; then
    log_warning "Potential hardcoded secret found. Pattern: $pattern"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
  fi
done

if [ "$FOUND_SECRETS" -eq 0 ]; then
  log_success "No obvious hardcoded secrets found."
fi

# Check SSL/TLS configuration
log_info "Checking SSL/TLS configuration..."
if grep -q "http://" "$PROJECT_ROOT/backend/src/infrastructure/config/env.ts" 2>/dev/null; then
  log_warning "HTTP URLs found in configuration. Ensure HTTPS is used in production."
else
  log_success "No insecure HTTP URLs found in configuration."
fi

###############################################################################
# Generate Summary Report
###############################################################################
log_section "6. Generating Summary Report"

HTML_REPORT="$REPORT_DIR/security_summary_$TIMESTAMP.html"

cat > "$HTML_REPORT" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PatrolManager Security Scan Report - $TIMESTAMP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 0.9em; }
    .content { padding: 30px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #1e3a5f; border-bottom: 2px solid #2d5a87; padding-bottom: 10px; margin-bottom: 15px; }
    .section h3 { color: #2d5a87; margin: 15px 0 10px; }
    .alert { padding: 15px; border-radius: 6px; margin: 10px 0; }
    .alert-critical { background: #fee; border-left: 4px solid #c33; }
    .alert-high { background: #ffe8e0; border-left: 4px solid #f60; }
    .alert-medium { background: #fff3cd; border-left: 4px solid #fc0; }
    .alert-low { background: #d1ecf1; border-left: 4px solid #0cb; }
    .alert-info { background: #e7f3ff; border-left: 4px solid #27c; }
    .alert-success { background: #d4edda; border-left: 4px solid #28a745; }
    .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    .table th { background: #f8f9fa; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600; }
    .badge-critical { background: #c33; color: white; }
    .badge-high { background: #f60; color: white; }
    .badge-medium { background: #fc0; color: #333; }
    .badge-low { background: #0cb; color: white; }
    .badge-info { background: #27c; color: white; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { padding: 20px; background: #f8f9fa; border-radius: 6px; text-align: center; }
    .stat-card .value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
    .stat-card.critical .value { color: #c33; }
    .stat-card.high .value { color: #f60; }
    .stat-card.medium .value { color: #fc0; }
    .stat-card.low .value { color: #0cb; }
    .footer { padding: 20px; text-align: center; color: #666; border-top: 1px solid #eee; }
    a { color: #2d5a87; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PatrolManager Security Scan Report</h1>
      <div class="meta">
        Generated: $(date)<br>
        Project: PatrolManager Backend<br>
        Scan ID: $TIMESTAMP
      </div>
    </div>

    <div class="content">
      <div class="section">
        <h2>Executive Summary</h2>
        <div class="stats">
          <div class="stat-card critical">
            <div>Critical</div>
            <div class="value">$CRITICAL_COUNT</div>
          </div>
          <div class="stat-card high">
            <div>High</div>
            <div class="value">$HIGH_COUNT</div>
          </div>
          <div class="stat-card medium">
            <div>Moderate</div>
            <div class="value">$MODERATE_COUNT</div>
          </div>
          <div class="stat-card low">
            <div>Low</div>
            <div class="value">0</div>
          </div>
        </div>
        <p>This report summarizes the security findings from the automated security scan performed on the PatrolManager backend application.</p>
      </div>

      <div class="section">
        <h2>Scan Components</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Status</th>
              <th>Findings</th>
              <th>Report</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>NPM Audit</td>
              <td><span class="badge badge-info">Completed</span></td>
              <td>$((CRITICAL_COUNT + HIGH_COUNT + MODERATE_COUNT)) vulnerabilities</td>
              <td><a href="npm_audit_$TIMESTAMP.txt">View</a></td>
            </tr>
            <tr>
              <td>OWASP ZAP</td>
              <td><span class="badge badge-info">Completed</span></td>
              <td>Web application scan</td>
              <td><a href="zap_report_$TIMESTAMP.html">View</a></td>
            </tr>
            <tr>
              <td>Custom Tests</td>
              <td><span class="badge badge-info">Completed</span></td>
              <td>Unit & integration tests</td>
              <td><a href="coverage_$TIMESTAMP/index.html">View</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Recommendations</h2>
        <div class="alert alert-info">
          <strong>Next Steps:</strong>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li>Review all critical and high severity vulnerabilities</li>
            <li>Update dependencies to secure versions</li>
            <li>Address any findings from the ZAP scan</li>
            <li>Run security scans regularly (at least weekly)</li>
            <li>Consult the remediation guide for detailed fix instructions</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>Remediation Guide</h2>
        <p>For detailed remediation steps, see the <a href="../../../docs/security/remediation-guide.md">Security Remediation Guide</a>.</p>
      </div>
    </div>

    <div class="footer">
      <p>Generated by PatrolManager Security Scan Script | v1.0.0</p>
      <p>For questions or concerns, contact the security team.</p>
    </div>
  </div>
</body>
</html>
EOF

log_success "HTML report generated: $HTML_REPORT"

###############################################################################
# Final Summary
###############################################################################
log_section "Security Scan Complete"

log_info "Reports saved to: $REPORT_DIR"
log_info "  - npm_audit_$TIMESTAMP.txt/json"
log_info "  - snyk_*$TIMESTAMP.txt/json (if Snyk available)"
log_info "  - zap_report_$TIMESTAMP.html (if ZAP available)"
log_info "  - coverage_$TIMESTAMP/ (test coverage)"
log_info "  - security_summary_$TIMESTAMP.html (summary report)"
log_info "  - scan_$TIMESTAMP.log (full log)"

# Exit with error code if critical/high vulnerabilities found
if [ "$CRITICAL_COUNT" -gt 0 ] || [ "$HIGH_COUNT" -gt 0 ]; then
  log_warning "Exiting with error code due to critical/high vulnerabilities."
  exit 1
else
  log_success "No critical vulnerabilities found. Scan completed successfully."
  exit 0
fi
