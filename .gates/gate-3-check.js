/**
 * GATE_3: Phase 3 Validation - Real-time Command & SOS
 *
 * This gate validates the Real-time Command & SOS phase implementation.
 * It checks WebSocket infrastructure, SOS alerts, and location tracking.
 *
 * Run with: node .gates/gate-3-check.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
}

function logCheck(name, status, details = '') {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  log(`  ${icon} ${name}: ${status}`, color);
  if (details) console.log(`    ${details}`);
}

/**
 * Gate 3 Validation Results
 */
const results = {
  gate: 'GATE_3',
  phase: 3,
  phaseName: 'Real-time Command & SOS',
  timestamp: new Date().toISOString(),
  checks: {},
  summary: { totalChecks: 0, passed: 0, failed: 0, warned: 0 }
};

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

/**
 * Read and parse a TypeScript file
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if a file contains specific content
 */
function containsCode(filePath, patterns) {
  const content = readFile(filePath);
  if (!content) return false;

  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      if (!content.includes(pattern)) return false;
    } else if (pattern instanceof RegExp) {
      if (!pattern.test(content)) return false;
    }
  }
  return true;
}

/**
 * Add check result
 */
function addCheck(category, name, status, details = '') {
  const key = `${category}_${name.toLowerCase().replace(/\s+/g, '_')}`;
  results.checks[key] = { status, details };
  results.summary.totalChecks++;

  if (status === 'PASS') results.summary.passed++;
  else if (status === 'FAIL') results.summary.failed++;
  else results.summary.warned++;

  logCheck(name, status, details);
}

/**
 * ============================================
 * CATEGORY 1: WEBSOCKET INFRASTRUCTURE
 * ============================================
 */
function validateWebSocket() {
  logSection('1. WEBSOCKET INFRASTRUCTURE');

  // 1.1 WebSocket Server
  const wsServer = fileExists('backend/src/infrastructure/websocket/WebSocketServer.ts');
  if (wsServer) {
    const hasEvents = containsCode('backend/src/infrastructure/websocket/WebSocketServer.ts', [
      /initializeWebSocket/,
      /SOCKET_IO|socket\.io/,
      /WS_EVENTS/,
    ]);
    if (hasEvents) {
      addCheck('websocket', 'WebSocketServer', 'PASS', 'Socket.io server implemented');
    } else {
      addCheck('websocket', 'WebSocketServer', 'FAIL', 'WebSocket server missing core functionality');
    }
  } else {
    addCheck('websocket', 'WebSocketServer', 'FAIL', 'WebSocketServer not found');
  }

  // 1.2 PTT Manager
  const pttManager = fileExists('backend/src/infrastructure/websocket/PTTManager.ts');
  if (pttManager) {
    const hasPTTLogic = containsCode('backend/src/infrastructure/websocket/PTTManager.ts', [
      /handlePTTRequest/,
      /handlePTTRelease/,
      /activeSpeakers/,
    ]);
    if (hasPTTLogic) {
      addCheck('websocket', 'PTT Manager', 'PASS', 'PTT speaker lock implemented');
    } else {
      addCheck('websocket', 'PTT Manager', 'WARN', 'PTT Manager may be incomplete');
    }
  } else {
    addCheck('websocket', 'PTT Manager', 'WARN', 'PTT Manager not found');
  }
}

/**
 * ============================================
 * CATEGORY 2: SOS ALERT SYSTEM
 * ============================================
 */
function validateSOSSystem() {
  logSection('2. SOS ALERT SYSTEM');

  // 2.1 SOS Alert Entity
  const sosEntity = fileExists('backend/src/core/domain/entities/SOSAlert.ts');
  if (sosEntity) {
    const hasWorkflow = containsCode('backend/src/core/domain/entities/SOSAlert.ts', [
      /SOSStatus/,
      /TRIGGERED|ACKNOWLEDGED|DISPATCHED|RESOLVED/,
    ]);
    if (hasWorkflow) {
      addCheck('sos', 'SOS Alert Entity', 'PASS', 'SOS workflow states defined');
    } else {
      addCheck('sos', 'SOS Alert Entity', 'WARN', 'SOS workflow may be incomplete');
    }
  } else {
    addCheck('sos', 'SOS Alert Entity', 'FAIL', 'SOSAlert entity not found');
  }

  // 2.2 SOS Alert Model
  const sosModel = fileExists('backend/src/infrastructure/database/models/SOSAlert.ts');
  if (sosModel) {
    addCheck('sos', 'SOS Alert Database Model', 'PASS', 'SOSAlert Sequelize model exists');
  } else {
    addCheck('sos', 'SOS Alert Database Model', 'FAIL', 'SOSAlert model not found');
  }

  // 2.3 SOS Alert Repository
  const sosRepo = fileExists('backend/src/infrastructure/database/repositories/SequelizeSOSAlertRepository.ts');
  if (sosRepo) {
    const hasMethods = containsCode('backend/src/infrastructure/database/repositories/SequelizeSOSAlertRepository.ts', [
      /findActive/,
      /acknowledge/,
      /dispatch/,
      /resolve/,
      /findNearbyGuards/,
    ]);
    if (hasMethods) {
      addCheck('sos', 'SOS Alert Repository', 'PASS', 'Full SOS workflow methods implemented');
    } else {
      addCheck('sos', 'SOS Alert Repository', 'WARN', 'Repository may be incomplete');
    }
  } else {
    addCheck('sos', 'SOS Alert Repository', 'FAIL', 'SOS repository not found');
  }

  // 2.4 RealTimeService SOS Integration
  const hasSOS = containsCode('backend/src/core/services/RealTimeService.ts', [
    /handleSOSAlert/,
    /sosAlertRepository/,
    /ISOSAlertRepository/,
  ]);
  if (hasSOS) {
    addCheck('sos', 'SOS Real-time Integration', 'PASS', 'SOS alerts handled via WebSocket');
  } else {
    addCheck('sos', 'SOS Real-time Integration', 'WARN', 'SOS integration may be incomplete');
  }
}

/**
 * ============================================
 * CATEGORY 3: LOCATION TRACKING
 * ============================================
 */
function validateLocationTracking() {
  logSection('3. LOCATION TRACKING');

  // 3.1 Location History Entity
  const locEntity = fileExists('backend/src/core/domain/entities/LocationHistory.ts');
  if (locEntity) {
    addCheck('location', 'Location History Entity', 'PASS', 'LocationHistory entity exists');
  } else {
    addCheck('location', 'Location History Entity', 'FAIL', 'LocationHistory entity not found');
  }

  // 3.2 Location History Model
  const locModel = fileExists('backend/src/infrastructure/database/models/LocationHistory.ts');
  if (locModel) {
    addCheck('location', 'Location History Model', 'PASS', 'LocationHistory database model exists');
  } else {
    addCheck('location', 'Location History Model', 'FAIL', 'LocationHistory model not found');
  }

  // 3.3 Location Repository
  const locRepo = fileExists('backend/src/infrastructure/database/repositories/SequelizeLocationHistoryRepository.ts');
  if (locRepo) {
    const hasBatching = containsCode('backend/src/infrastructure/database/repositories/SequelizeLocationHistoryRepository.ts', [
      /createBatch/,
      /findByPatrolRunId/,
      /findActiveGuardsLocations/,
    ]);
    if (hasBatching) {
      addCheck('location', 'Location Repository', 'PASS', 'Batching and active guards tracking implemented');
    } else {
      addCheck('location', 'Location Repository', 'WARN', 'Repository missing key features');
    }
  } else {
    addCheck('location', 'Location Repository', 'FAIL', 'LocationHistory repository not found');
  }

  // 3.4 GeofenceService GPS Validation
  const hasGPS = containsCode('backend/src/core/services/GeofenceService.ts', [
    /validateGPSLocation/,
    /calculateDistance/,
  ]);
  if (hasGPS) {
    addCheck('location', 'GPS Validation', 'PASS', 'GPS validation in GeofenceService');
  } else {
    addCheck('location', 'GPS Validation', 'WARN', 'GPS validation may be incomplete');
  }
}

/**
 * ============================================
 * CATEGORY 4: DASHBOARD API
 * ============================================
 */
function validateDashboardAPI() {
  logSection('4. DASHBOARD API');

  // 4.1 Dashboard Routes
  const dashboardRoutes = fileExists('backend/src/interfaces/http/routes/dashboardRoutes.ts');
  if (dashboardRoutes) {
    addCheck('api', 'Dashboard Routes', 'PASS', 'Dashboard API routes defined');
  } else {
    addCheck('api', 'Dashboard Routes', 'FAIL', 'Dashboard routes not found');
  }

  // 4.2 Real-time Controller
  const rtController = fileExists('backend/src/interfaces/http/controllers/WebRealTimeController.ts');
  if (rtController) {
    const hasEndpoints = containsCode('backend/src/interfaces/http/controllers/WebRealTimeController.ts', [
      /getActiveSOSAlerts/,
      /acknowledgeSOS|resolveSOS/,
      /getDashboardStatistics/,
      /getPatrolPath/,
    ]);
    if (hasEndpoints) {
      addCheck('api', 'Real-time Controller', 'PASS', 'Dashboard controller with SOS endpoints');
    } else {
      addCheck('api', 'Real-time Controller', 'WARN', 'Controller may be incomplete');
    }
  } else {
    addCheck('api', 'Real-time Controller', 'FAIL', 'WebRealTimeController not found');
  }
}

/**
 * ============================================
 * CATEGORY 5: COMMAND CENTER UI
 * ============================================
 */
function validateCommandCenterUI() {
  logSection('5. COMMAND CENTER UI');

  // 5.1 Command Center View
  const ccView = fileExists('backend/src/interfaces/web/views/dashboard/command-center.ejs');
  if (ccView) {
    const hasSocketIO = containsCode('backend/src/interfaces/web/views/dashboard/command-center.ejs', [
      /socket\.io|io\(/,
      /guard_tracking|sos_broadcast/,
    ]);
    if (hasSocketIO) {
      addCheck('ui', 'Command Center View', 'PASS', 'EJS view with Socket.io integration');
    } else {
      addCheck('ui', 'Command Center View', 'WARN', 'View may lack Socket.io integration');
    }
  } else {
    addCheck('ui', 'Command Center View', 'WARN', 'Command center view not found');
  }

  // 5.2 Dashboard Index
  const dashboardIndex = fileExists('backend/src/interfaces/web/views/dashboard/index.ejs');
  if (dashboardIndex) {
    addCheck('ui', 'Dashboard Index', 'PASS', 'Dashboard index view exists');
  } else {
    addCheck('ui', 'Dashboard Index', 'WARN', 'Dashboard index view not found');
  }
}

/**
 * ============================================
 * MAIN EXECUTION
 * ============================================
 */
function runGate3() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     PATROL MANAGER - GATE 3 VALIDATION CHECK                ║', colors.cyan);
  log('║     Phase 3: Real-time Command & SOS                         ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  validateWebSocket();
  validateSOSSystem();
  validateLocationTracking();
  validateDashboardAPI();
  validateCommandCenterUI();

  // Print Summary
  logSection('GATE 3 SUMMARY');

  const { totalChecks, passed, failed, warned } = results.summary;
  const passRate = ((passed / totalChecks) * 100).toFixed(1);

  log(`\n  Total Checks: ${totalChecks}`);
  log(`  Passed: ${passed}`, colors.green);
  log(`  Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);
  log(`  Warnings: ${warned}`, warned > 0 ? colors.yellow : colors.reset);
  log(`  Pass Rate: ${passRate}%`);

  // Determine gate status
  const gateStatus = failed === 0 ? 'PASS' : 'FAIL';
  results.status = gateStatus;

  if (gateStatus === 'PASS') {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║                    GATE 3: PASS ✓                           ║', colors.green);
    log('║     Real-time Command & SOS validated successfully          ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝', colors.green);
  } else {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.red);
    log('║                    GATE 3: FAIL ✗                           ║', colors.red);
    log('║     Fix failed checks before proceeding to Phase 4         ║', colors.red);
    log('╚════════════════════════════════════════════════════════════╝', colors.red);
  }

  // Write results to file
  const resultsPath = path.join(process.cwd(), '.gates', 'gate-3-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n  Results saved to: ${resultsPath}`, colors.blue);

  return gateStatus;
}

// Run the gate check
const status = runGate3();
process.exit(status === 'PASS' ? 0 : 1);
