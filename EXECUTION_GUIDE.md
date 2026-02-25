# PatrolManager Execution Guide

Quick reference for executing the PatrolManager project from start to production.

---

## Quick Start

### 1. Initialize Project State

The project state is already initialized in `PROJECT_STATE.json`. To reset:

```bash
# Reset to beginning
rm PROJECT_STATE.json
npm run project:start
```

### 2. Start Full Project Execution

```bash
# Start from Phase 1
npm run project:start

# Resume from specific phase
npm run project:start -- --phase=3

# Resume after interruption
npm run project:start -- --resume
```

### 3. Monitor Progress

```bash
# View current status
npm run project:status

# View with verbose details
npm run project:status -- --verbose
```

### 4. Run Phase Gate Reviews

```bash
# Run gate review for current phase
npm run gate:review -- --phase=1

# Re-run after fixing failures
npm run gate:review -- --phase=1 --retry

# List all available gates
npm run gate:review -- --list
```

---

## Phase Gates Overview

| Phase | Name | Gate Criteria |
|-------|------|---------------|
| 1 | Core Foundation | Unit tests, Integration tests, Security audit, Lint |
| 2 | Patrol Engine | Geofence tests, Mobile tests, SyncQueue tests |
| 3 | Real-time | Socket.io tests, SOS tests, Stress test (100+ clients) |
| 4 | Incidents | Upload tests, PTT tests, Incident workflow tests |
| 5 | Analytics | Shift tests, Report tests, Performance tests |
| 6 | Production | Staging tests, Load tests, Penetration tests |

---

## Gate Review Commands

### Before Running Gate Review

Ensure all phase tasks are complete:
```bash
npm run project:status
# Check "Completed: X/111 tasks"
```

### Running Gate Review

```bash
# Phase 1 Gate
npm run gate:review -- --phase=1

# Phase 2 Gate
npm run gate:review -- --phase=2
```

### Gate Review Output

The gate review will:
1. Run all automated tests for the phase
2. Run security audit
3. Run code quality checks
4. Generate a report in `.gates/gate-N-report.json`
5. Update `PROJECT_STATE.json`
6. Display pass/fail result

### If Gate Passes

```
✅ GATE PASSED
Phase 1 is complete. You may proceed to the next phase.
```

Proceed to next phase:
```bash
npm run project:start -- --phase=2
```

### If Gate Fails

```
❌ GATE FAILED
Phase 1 gate review failed. Please review the failures above.
```

1. View the detailed report:
```bash
cat .gates/gate-1-report.json
```

2. Fix the failures (see Failure Recovery below)

3. Re-run the gate:
```bash
npm run gate:review -- --phase=1 --retry
```

---

## Failure Recovery

### When a Task Fails

1. Check the error message
2. Review agent output
3. Fix the issue
4. Resume execution

### When a Gate Fails

Gate failures are stored in `PROJECT_STATE.json`:

```json
{
  "phaseStatus": "gate_failed",
  "lastGate": "GATE_1",
  "gateResults": {
    "GATE_1": {
      "status": "FAIL",
      "checks": {
        "unit": "PASS",
        "integration": "FAIL",
        "security": "PASS",
        "lint": "PASS"
      }
    }
  }
}
```

To fix:
1. Review the failing check output:
```bash
cat .gates/integration-output.log
```

2. Fix the code issues

3. Re-run the specific failing test:
```bash
npm run test:integration
```

4. Re-run gate review:
```bash
npm run gate:review -- --phase=1 --retry
```

---

## Development Workflow

### Day-to-Day Development

```bash
# Morning: Check status
npm run project:status

# During day: Work on tasks
# (Tasks are managed via TASK_TRACKER.md)

# Evening: Run tests
npm run test

# Before committing
npm run lint && npm run test
```

### Completing a Phase

```bash
# 1. Verify all tasks complete
npm run project:status

# 2. Run full test suite
npm run test

# 3. Run gate review
npm run gate:review -- --phase=N

# 4. If passed, proceed to next phase
npm run project:start -- --phase=N+1
```

---

## Continuous Execution Mode

The project supports continuous execution with automatic phase progression:

### Auto-Continue Mode

In `PROJECT_STATE.json`:
```json
{
  "settings": {
    "autoContinue": true,
    "parallelExecution": true,
    "maxParallelTasks": 3,
    "gateAutoApprove": false
  }
}
```

When `autoContinue: true`:
- Tasks execute automatically
- Gates run automatically
- **But gates require manual approval to proceed**

### Manual Gate Approval

Even in auto-continue mode, gates require manual review:

```bash
# After gate tests pass, you'll see:
# ⚠️  Gate tests passed. Manual review required.
# Run: npm run gate:approve -- --phase=1

npm run gate:approve -- --phase=1
# This updates state and allows continuation
```

---

## State File Reference

### PROJECT_STATE.json Structure

```json
{
  "projectName": "PatrolManager",
  "currentPhase": 2,
  "currentTask": "P2-T2-001",
  "phaseStatus": "in_progress",
  "startTime": "2026-02-23T10:00:00Z",
  "gatesPassed": ["GATE_1"],
  "tasksCompleted": ["P1-T1-001", "P1-T1-002", ...],
  "tasksInProgress": ["P2-T2-001"],
  "gateResults": {
    "GATE_1": {
      "status": "PASS",
      "timestamp": "2026-02-23T16:00:00Z"
    }
  },
  "metrics": {
    "totalTasks": 111,
    "completedTasks": 23,
    "completionPercentage": 21
  }
}
```

### Phase Status Values

| Status | Meaning |
|--------|---------|
| `ready` | Phase not started |
| `in_progress` | Currently executing tasks |
| `completed` | All tasks done, awaiting gate review |
| `gate_passed` | Gate review passed |
| `gate_failed` | Gate review failed, needs remediation |

---

## Troubleshooting

### State File Corruption

If `PROJECT_STATE.json` becomes corrupted:

```bash
# Backup current state
cp PROJECT_STATE.json PROJECT_STATE.json.backup

# Reset to initial state
rm PROJECT_STATE.json
npm run project:start
```

### Stuck Phase

If execution gets stuck:

```bash
# Check current status
npm run project:status

# Force move to next phase (use carefully)
node -e "
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('PROJECT_STATE.json', 'utf8'));
state.currentPhase = 3;
state.phaseStatus = 'in_progress';
fs.writeFileSync('PROJECT_STATE.json', JSON.stringify(state, null, 2));
"
```

### Gate Report Missing

If gate report is missing:

```bash
# Re-run the gate review
npm run gate:review -- --phase=N --retry
```

---

## Production Deployment

### Pre-Deployment Checklist

```bash
# 1. Verify all gates passed
npm run project:status
# Should show: Gates Passed: [GATE_1, GATE_2, GATE_3, GATE_4, GATE_5]

# 2. Run final test suite
npm run test

# 3. Run security audit
npm run audit:security

# 4. Run production gate review
npm run gate:review -- --phase=6
```

### Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Run staging gate review
npm run gate:review -- --phase=6

# If passed, deploy to production
npm run deploy:production
```

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run project:start` | Start/resume full project execution |
| `npm run project:start -- --phase=N` | Start from specific phase |
| `npm run project:status` | View current progress |
| `npm run project:status -- --verbose` | View detailed progress |
| `npm run gate:review -- --phase=N` | Run gate review for phase N |
| `npm run gate:review -- --phase=N --retry` | Re-run gate after fixes |
| `npm run gate:review -- --list` | List all available gates |
| `npm run report:daily` | Generate daily status report |
| `npm run test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run lint` | Run code quality checks |
| `npm run audit:security` | Run security audit |

---

## File Structure

```
PatrolManager/
├── .orchestration/
│   ├── start-execution.js      # Main execution orchestrator
│   └── project-status.js        # Status display
├── .gates/
│   ├── gate-review.sh           # Gate review script
│   ├── gate-1-report.json       # Gate 1 results
│   └── ...                      # Other gate reports
├── reports/
│   ├── phase-1-summary.md       # Phase completion summary
│   └── daily-2026-02-23.md      # Daily status report
├── PROJECT_STATE.json           # Project state tracking
├── TASK_TRACKER.md              # Complete task list
├── PHASE_GATE_EXECUTION.md      # Phase gate framework
├── package.json                 # NPM scripts
└── CLAUDE.md                    # Project instructions
```

---

## Tips for Success

1. **Run status daily**: `npm run project:status`
2. **Commit after each task**: Keep track of progress
3. **Don't skip gates**: Each gate ensures quality
4. **Review failures carefully**: Gates fail for important reasons
5. **Keep docs updated**: Update TASK_TRACKER.md as you go
6. **Test frequently**: Run `npm run test` before commits
7. **Monitor state**: Check PROJECT_STATE.json after each action

---

## Support

If you encounter issues:

1. Check `PROJECT_STATE.json` for current state
2. Review gate reports in `.gates/` directory
3. Check test output logs in `.gates/` directory
4. Run `npm run project:status -- --verbose` for details

---

**Execution Framework Version**: 1.0.0
**Last Updated**: 2026-02-23
