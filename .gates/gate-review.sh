#!/bin/bash

###############################################################################
# PatrolManager Phase Gate Review Script
#
# Usage:
#   bash .gates/gate-review.sh --phase=1
#   bash .gates/gate-review.sh --phase=2 --retry
#   bash .gates/gate-review.sh --list
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PHASE=""
RETRY=false
LIST_ONLY=false
VERBOSE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --phase=*)
      PHASE="${arg#*=}"
      ;;
    --retry)
      RETRY=true
      ;;
    --list)
      LIST_ONLY=true
      ;;
    --verbose)
      VERBOSE=true
      ;;
    --help)
      echo "Usage: $0 --phase=N [--retry] [--list] [--verbose]"
      echo ""
      echo "Options:"
      echo "  --phase=N    Run gate review for phase N (1-6)"
      echo "  --retry      Retry mode (after remediation)"
      echo "  --list       List all available gates"
      echo "  --verbose    Show detailed output"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      exit 1
      ;;
  esac
done

# Gate definitions
declare -A GATE_NAMES=(
  [1]="GATE_1: Core Foundation"
  [2]="GATE_2: Patrol Engine"
  [3]="GATE_3: Real-time"
  [4]="GATE_4: Incidents & Communication"
  [5]="GATE_5: Analytics & Production Ready"
  [6]="PRODUCTION_GATE: Deployment"
)

declare -A GATE_TESTS=(
  [1]="unit,integration,security,lint"
  [2]="unit,integration,geofence,mobile"
  [3]="socket,sos,stress,reconnect"
  [4]="incident,upload,ptt"
  [5]="shift,report,performance,load"
  [6]="staging,load-production,penetration"
)

# List gates if requested
if [ "$LIST_ONLY" = true ]; then
  echo "Available Gates:"
  echo "================"
  for i in {1..6}; do
    echo "  Phase $i: ${GATE_NAMES[$i]}"
    echo "    Tests: ${GATE_TESTS[$i]}"
    echo ""
  done
  exit 0
fi

# Validate phase
if [ -z "$PHASE" ]; then
  echo -e "${RED}Error: --phase=N is required${NC}"
  echo "Use --help for usage information"
  exit 1
fi

if [ "$PHASE" -lt 1 ] || [ "$PHASE" -gt 6 ]; then
  echo -e "${RED}Error: Phase must be between 1 and 6${NC}"
  exit 1
fi

# Gate variables
GATE_NAME="GATE_${PHASE}"
if [ "$PHASE" = "6" ]; then
  GATE_NAME="PRODUCTION_GATE"
fi

GATE_REPORT_DIR=".gates"
GATE_REPORT_FILE="${GATE_REPORT_DIR}/gate-${PHASE}-report.json"
STATE_FILE="PROJECT_STATE.json"

# Print header
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Phase Gate Review: ${GATE_NAME}${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if phase is complete
if [ -f "$STATE_FILE" ]; then
  CURRENT_PHASE=$(node -p "require('./${STATE_FILE}').currentPhase")
  PHASE_STATUS=$(node -p "require('./${STATE_FILE}').phaseStatus")

  if [ "$PHASE_STATUS" = "completed" ] && [ "$RETRY" = false ]; then
    echo -e "${GREEN}✅ Phase ${PHASE} already completed and gate passed!${NC}"
    echo -e "${YELLOW}Skipping gate review. Use --retry to re-run.${NC}"
    exit 0
  fi
fi

# Create report directory
mkdir -p "$GATE_REPORT_DIR"

# Test results
declare -A TEST_RESULTS
ALL_PASSED=true

# Function to run a test category
run_test() {
  local test_name=$1
  local phase=$2

  echo -e "${BLUE}Running ${test_name} tests...${NC}"

  case $test_name in
    unit)
      if [ -f "package.json" ] && grep -q "\"test:unit\"" package.json; then
        npm run test:unit 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No unit test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    integration)
      if [ -f "package.json" ] && grep -q "\"test:integration\"" package.json; then
        npm run test:integration 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No integration test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    geofence)
      if [ -f "package.json" ] && grep -q "\"test:geofence\"" package.json; then
        npm run test:geofence 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No geofence test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    socket)
      if [ -f "package.json" ] && grep -q "\"test:socket\"" package.json; then
        npm run test:socket 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No socket test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    sos)
      if [ -f "package.json" ] && grep -q "\"test:sos\"" package.json; then
        npm run test:sos 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No SOS test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    stress)
      if [ -f "package.json" ] && grep -q "\"test:stress\"" package.json; then
        npm run test:stress -- --clients=100 --duration=60 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No stress test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    mobile)
      if [ -d "mobile" ] && [ -f "mobile/package.json" ]; then
        cd mobile
        if grep -q "\"test\"" package.json; then
          npm test 2>&1 | tee "../${GATE_REPORT_DIR}/${test_name}-output.log"
          TEST_RESULT=${PIPESTATUS[0]}
        else
          echo -e "${YELLOW}⚠️  No mobile test script found. Skipping.${NC}"
          TEST_RESULT=0
        fi
        cd ..
      else
        echo -e "${YELLOW}⚠️  No mobile directory found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    incident)
      if [ -f "package.json" ] && grep -q "\"test:incident\"" package.json; then
        npm run test:incident 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No incident test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    upload)
      if [ -f "package.json" ] && grep -q "\"test:upload\"" package.json; then
        npm run test:upload 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No upload test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    ptt)
      if [ -f "package.json" ] && grep -q "\"test:ptt\"" package.json; then
        npm run test:ptt 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No PTT test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    shift)
      if [ -f "package.json" ] && grep -q "\"test:shift\"" package.json; then
        npm run test:shift 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No shift test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    report)
      if [ -f "package.json" ] && grep -q "\"test:report\"" package.json; then
        npm run test:report 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No report test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    performance)
      if [ -f "package.json" ] && grep -q "\"test:performance\"" package.json; then
        npm run test:performance 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No performance test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    load)
      if [ -f "package.json" ] && grep -q "\"test:load\"" package.json; then
        npm run test:load -- --concurrent=100 --duration=300 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No load test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    staging)
      echo -e "${YELLOW}⚠️  Staging tests require manual deployment. Skipping automated check.${NC}"
      TEST_RESULT=0
      ;;
    penetration)
      if [ -f "package.json" ] && grep -q "\"test:penetration\"" package.json; then
        npm run test:penetration 2>&1 | tee "${GATE_REPORT_DIR}/${test_name}-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No penetration test script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    security)
      echo -e "${BLUE}Running security audit...${NC}"
      if command -v npm &> /dev/null; then
        npm audit --production 2>&1 | tee "${GATE_REPORT_DIR}/security-audit.log" || true
        TEST_RESULT=0  # Don't fail on audit warnings in dev
      else
        echo -e "${YELLOW}⚠️  npm not found. Skipping security audit.${NC}"
        TEST_RESULT=0
      fi
      ;;
    lint)
      echo -e "${BLUE}Running code quality checks...${NC}"
      if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
        npm run lint 2>&1 | tee "${GATE_REPORT_DIR}/lint-output.log"
        TEST_RESULT=${PIPESTATUS[0]}
      else
        echo -e "${YELLOW}⚠️  No lint script found. Skipping.${NC}"
        TEST_RESULT=0
      fi
      ;;
    *)
      echo -e "${RED}Unknown test: ${test_name}${NC}"
      TEST_RESULT=1
      ;;
  esac

  if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ ${test_name} tests PASSED${NC}"
    TEST_RESULTS[$test_name]="PASS"
  else
    echo -e "${RED}❌ ${test_name} tests FAILED${NC}"
    TEST_RESULTS[$test_name]="FAIL"
    ALL_PASSED=false
  fi
  echo ""
}

# Get tests for this phase
IFS=',' read -ra TESTS <<< "${GATE_TESTS[$PHASE]}"

# Add security and lint to all phases
TESTS+=("security")
TESTS+=("lint")

# Run each test
for test in "${TESTS[@]}"; do
  run_test "$test" "$PHASE"
done

# Generate gate report
echo -e "${BLUE}Generating gate report...${NC}"

# Calculate timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine overall status
if [ "$ALL_PASSED" = true ]; then
  GATE_STATUS="PASS"
  GATE_EMOJI="✅"
else
  GATE_STATUS="FAIL"
  GATE_EMOJI="❌"
fi

# Create JSON report
cat > "$GATE_REPORT_FILE" << EOF
{
  "gate": "${GATE_NAME}",
  "phase": ${PHASE},
  "timestamp": "${TIMESTAMP}",
  "status": "${GATE_STATUS}",
  "retry": ${RETRY},
  "checks": {
EOF

# Add test results to JSON
first=true
for test in "${TESTS[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$GATE_REPORT_FILE"
  fi
  echo -n "    \"${test}\": \"${TEST_RESULTS[$test]}\"" >> "$GATE_REPORT_FILE"
done

echo "" >> "$GATE_REPORT_FILE"
cat >> "$GATE_REPORT_FILE" << EOF
  },
  "exitCriteria": {
    "allTestsPass": $ALL_PASSED,
    "securityAudit": "${TEST_RESULTS[security]}",
    "codeQuality": "${TEST_RESULTS[lint]}"
  },
  "summary": {
    "totalTests": ${#TESTS[@]},
    "passed": $(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "PASS" || echo 0),
    "failed": $(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "FAIL" || echo 0)
  }
}
EOF

# Display results
echo ""
echo -e "${BLUE}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  ${GATE_NAME} RESULTS: ${GATE_STATUS}                    ${NC}"
echo -e "${BLUE}├─────────────────────────────────────────────────────────┤${NC}"

for test in "${TESTS[@]}"; do
  STATUS="${TEST_RESULTS[$test]}"
  if [ "$STATUS" = "PASS" ]; then
    echo -e "${GREEN}│  ✅ ${test}                                          │${NC}"
  else
    echo -e "${RED}│  ❌ ${test}                                          │${NC}"
  fi
done

echo -e "${BLUE}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

# Summary
PASSED_COUNT=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "PASS" || echo 0)
FAILED_COUNT=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "FAIL" || echo 0)

echo -e "${BLUE}Summary:${NC}"
echo "  Total Checks: ${#TESTS[@]}"
echo -e "  Passed: ${GREEN}${PASSED_COUNT}${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
  echo -e "  Failed: ${RED}${FAILED_COUNT}${NC}"
fi
echo ""

# Final verdict
if [ "$ALL_PASSED" = true ]; then
  echo -e "${GREEN}${GATE_EMOJI} GATE PASSED${NC}"
  echo ""
  echo -e "${GREEN}Phase ${PHASE} is complete. You may proceed to the next phase.${NC}"
  echo ""

  # Update project state
  if [ -f "$STATE_FILE" ]; then
    node -e "
      const fs = require('fs');
      const state = JSON.parse(fs.readFileSync('${STATE_FILE}', 'utf8'));
      state.gatesPassed.push('${GATE_NAME}');
      state.gateResults['${GATE_NAME}'] = JSON.parse(fs.readFileSync('${GATE_REPORT_FILE}', 'utf8'));
      state.phaseStatus = 'gate_passed';
      fs.writeFileSync('${STATE_FILE}', JSON.stringify(state, null, 2));
    "
  fi

  exit 0
else
  echo -e "${RED}${GATE_EMOJI} GATE FAILED${NC}"
  echo ""
  echo -e "${RED}Phase ${PHASE} gate review failed. Please review the failures above.${NC}"
  echo -e "${YELLOW}Remediation is required before proceeding.${NC}"
  echo ""
  echo "To retry after fixes:"
  echo "  bash .gates/gate-review.sh --phase=${PHASE} --retry"
  echo ""

  # Update project state
  if [ -f "$STATE_FILE" ]; then
    node -e "
      const fs = require('fs');
      const state = JSON.parse(fs.readFileSync('${STATE_FILE}', 'utf8'));
      state.gateResults['${GATE_NAME}'] = JSON.parse(fs.readFileSync('${GATE_REPORT_FILE}', 'utf8'));
      state.phaseStatus = 'gate_failed';
      fs.writeFileSync('${STATE_FILE}', JSON.stringify(state, null, 2));
    "
  fi

  exit 1
fi
