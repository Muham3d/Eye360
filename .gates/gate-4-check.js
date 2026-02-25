/**
 * GATE_4: Phase 4 Validation - Incidents & Communication
 *
 * This gate validates the Incidents & Communication phase implementation.
 * It checks incident management, evidence handling, and PTT audio streaming.
 *
 * Run with: node .gates/gate-4-check.js
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
 * Gate 4 Validation Results
 */
const results = {
  gate: 'GATE_4',
  phase: 4,
  phaseName: 'Incidents & Communication',
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
 * CATEGORY 1: INCIDENT MANAGEMENT
 * ============================================
 */
function validateIncidents() {
  logSection('1. INCIDENT MANAGEMENT');

  // 1.1 Incident Entity
  const incidentEntity = fileExists('backend/src/core/domain/entities/Incident.ts');
  if (incidentEntity) {
    const hasWorkflow = containsCode('backend/src/core/domain/entities/Incident.ts', [
      /IncidentStatus/,
      /NEW|INVESTIGATING|RESOLVED|CLOSED/,
      /IncidentPriority/,
    ]);
    if (hasWorkflow) {
      addCheck('incidents', 'Incident Entity', 'PASS', 'Incident workflow states defined');
    } else {
      addCheck('incidents', 'Incident Entity', 'WARN', 'Incident entity may be incomplete');
    }
  } else {
    addCheck('incidents', 'Incident Entity', 'FAIL', 'Incident entity not found');
  }

  // 1.2 Incident Model
  const incidentModel = fileExists('backend/src/infrastructure/database/models/Incident.ts');
  if (incidentModel) {
    addCheck('incidents', 'Incident Database Model', 'PASS', 'Incident Sequelize model exists');
  } else {
    addCheck('incidents', 'Incident Database Model', 'FAIL', 'Incident model not found');
  }

  // 1.3 IncidentEvidence Model
  const evidenceModel = fileExists('backend/src/infrastructure/database/models/IncidentEvidence.ts');
  if (evidenceModel) {
    addCheck('incidents', 'Incident Evidence Model', 'PASS', 'Evidence model for file storage');
  } else {
    addCheck('incidents', 'Incident Evidence Model', 'FAIL', 'Evidence model not found');
  }

  // 1.4 IncidentComment Model
  const commentModel = fileExists('backend/src/infrastructure/database/models/IncidentComment.ts');
  if (commentModel) {
    addCheck('incidents', 'Incident Comment Model', 'PASS', 'Comment model for discussions');
  } else {
    addCheck('incidents', 'Incident Comment Model', 'FAIL', 'Comment model not found');
  }

  // 1.5 IncidentService
  const incidentService = fileExists('backend/src/core/services/IncidentService.ts');
  if (incidentService) {
    const hasWorkflow = containsCode('backend/src/core/services/IncidentService.ts', [
      /updateStatus/,
      /assignIncident/,
      /addEvidence/,
      /addComment/,
    ]);
    if (hasWorkflow) {
      addCheck('incidents', 'IncidentService', 'PASS', 'Full incident workflow implemented');
    } else {
      addCheck('incidents', 'IncidentService', 'WARN', 'IncidentService may be incomplete');
    }
  } else {
    addCheck('incidents', 'IncidentService', 'FAIL', 'IncidentService not found');
  }
}

/**
 * ============================================
 * CATEGORY 2: FILE STORAGE
 * ============================================
 */
function validateFileStorage() {
  logSection('2. FILE STORAGE FOR EVIDENCE');

  // 2.1 FileStorageService
  const fileService = fileExists('backend/src/core/services/FileStorageService.ts');
  if (fileService) {
    const hasUpload = containsCode('backend/src/core/services/FileStorageService.ts', [
      /uploadFromBase64/,
      /uploadFromBuffer/,
      /validateFile/,
    ]);
    if (hasUpload) {
      addCheck('storage', 'FileStorageService', 'PASS', 'File upload service with validation');
    } else {
      addCheck('storage', 'FileStorageService', 'WARN', 'FileStorageService may be incomplete');
    }
  } else {
    addCheck('storage', 'FileStorageService', 'FAIL', 'FileStorageService not found');
  }

  // 2.2 Uploads directory
  const uploadsDir = fs.existsSync(path.join(process.cwd(), 'uploads'));
  if (uploadsDir) {
    addCheck('storage', 'Uploads Directory', 'PASS', 'Uploads directory exists');
  } else {
    addCheck('storage', 'Uploads Directory', 'WARN', 'Uploads directory not found (will be created on init)');
  }
}

/**
 * ============================================
 * CATEGORY 3: PUSH-TO-TALK
 * ============================================
 */
function validatePTT() {
  logSection('3. PUSH-TO-TALK (PTT)');

  // 3.1 PTTNotificationService
  const pttService = fileExists('backend/src/core/services/PTTNotificationService.ts');
  if (pttService) {
    const hasChannels = containsCode('backend/src/core/services/PTTNotificationService.ts', [
      /createChannel/,
      /handleSpeakRequest/,
      /handleAudioData/,
      /handleReleaseRequest/,
    ]);
    if (hasChannels) {
      addCheck('ptt', 'PTTNotificationService', 'PASS', 'Full PTT notification service');
    } else {
      addCheck('ptt', 'PTTNotificationService', 'WARN', 'PTT service may be incomplete');
    }
  } else {
    addCheck('ptt', 'PTTNotificationService', 'WARN', 'PTTNotificationService not found');
  }

  // 3.2 PTT WebSocket Events
  const wsEvents = containsCode('backend/src/infrastructure/websocket/WebSocketServer.ts', [
    /PTT_REQUEST|ptt_request/,
    /PTT_GRANTED|ptt_granted/,
    /PTT_AUDIO_STREAM|ptt_audio_stream/,
  ]);
  if (wsEvents) {
    addCheck('ptt', 'PTT WebSocket Events', 'PASS', 'PTT events in WebSocket server');
  } else {
    addCheck('ptt', 'PTT WebSocket Events', 'WARN', 'PTT events may be missing');
  }

  // 3.3 PTTManager
  const pttManager = fileExists('backend/src/infrastructure/websocket/PTTManager.ts');
  if (pttManager) {
    addCheck('ptt', 'PTTManager', 'PASS', 'PTT speaker lock manager');
  } else {
    addCheck('ptt', 'PTTManager', 'WARN', 'PTTManager not found');
  }
}

/**
 * ============================================
 * CATEGORY 4: INCIDENT API
 * ============================================
 */
function validateIncidentAPI() {
  logSection('4. INCIDENT API');

  // 4.1 Incident Controller
  const incidentController = fileExists('backend/src/interfaces/http/controllers/IncidentController.ts');
  if (incidentController) {
    addCheck('api', 'IncidentController', 'PASS', 'Mobile incident API controller');
  } else {
    addCheck('api', 'IncidentController', 'WARN', 'IncidentController not found');
  }

  // 4.2 Web Incident Controller
  const webIncidentController = fileExists('backend/src/interfaces/http/controllers/WebIncidentController.ts');
  if (webIncidentController) {
    addCheck('api', 'Web Incident Controller', 'PASS', 'Admin web incident controller');
  } else {
    addCheck('api', 'Web Incident Controller', 'WARN', 'WebIncidentController not found');
  }

  // 4.3 Incident Routes
  const incidentRoutes = fileExists('backend/src/interfaces/http/routes/incidentRoutes.ts');
  if (incidentRoutes) {
    addCheck('api', 'Incident Routes', 'PASS', 'Incident API routes defined');
  } else {
    addCheck('api', 'Incident Routes', 'FAIL', 'Incident routes not found');
  }
}

/**
 * ============================================
 * CATEGORY 5: INCIDENT UI
 * ============================================
 */
function validateIncidentUI() {
  logSection('5. INCIDENT UI');

  // 5.1 Incident Index View
  const incidentIndex = fileExists('backend/src/interfaces/web/views/incidents/index.ejs');
  if (incidentIndex) {
    addCheck('ui', 'Incident List View', 'PASS', 'Incident list EJS view exists');
  } else {
    addCheck('ui', 'Incident List View', 'WARN', 'Incident list view not found');
  }

  // 5.2 Incident Detail View
  const incidentDetail = fileExists('backend/src/interfaces/web/views/incidents/detail.ejs');
  if (incidentDetail) {
    addCheck('ui', 'Incident Detail View', 'PASS', 'Incident detail EJS view exists');
  } else {
    addCheck('ui', 'Incident Detail View', 'WARN', 'Incident detail view not found');
  }
}

/**
 * ============================================
 * MAIN EXECUTION
 * ============================================
 */
function runGate4() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     PATROL MANAGER - GATE 4 VALIDATION CHECK                ║', colors.cyan);
  log('║     Phase 4: Incidents & Communication                     ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  validateIncidents();
  validateFileStorage();
  validatePTT();
  validateIncidentAPI();
  validateIncidentUI();

  // Print Summary
  logSection('GATE 4 SUMMARY');

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
    log('║                    GATE 4: PASS ✓                           ║', colors.green);
    log('║     Incidents & Communication validated                   ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝', colors.green);
  } else {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.red);
    log('║                    GATE 4: FAIL ✗                           ║', colors.red);
    log('║     Fix failed checks before proceeding to Phase 5         ║', colors.red);
    log('╚════════════════════════════════════════════════════════════╝', colors.red);
  }

  // Write results to file
  const resultsPath = path.join(process.cwd(), '.gates', 'gate-4-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n  Results saved to: ${resultsPath}`, colors.blue);

  return gateStatus;
}

// Run the gate check
const status = runGate4();
process.exit(status === 'PASS' ? 0 : 1);
