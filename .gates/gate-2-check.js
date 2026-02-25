/**
 * GATE_2: Phase 2 Validation - Patrol Engine & Geofencing
 *
 * This gate validates the Patrol Engine & Geofencing phase implementation.
 * It checks both backend services and geospatial functionality.
 *
 * Phase 2 Scope:
 * - Sites with geofence boundaries
 * - Checkpoints (NFC/QR/GPS verification)
 * - Patrol Templates and Runs
 * - GPS validation and geofencing
 *
 * Run with: node .gates/gate-2-check.js
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
  if (details) {
    console.log(`    ${details}`);
  }
}

/**
 * Gate 2 Validation Results
 */
const results = {
  gate: 'GATE_2',
  phase: 2,
  phaseName: 'Patrol Engine & Geofencing',
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
    const fullPath = path.join(process.cwd(), filePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
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
 * CATEGORY 1: SITE & GEOFENCE IMPLEMENTATION
 * ============================================
 */
function validateSitesAndGeofencing() {
  logSection('1. SITE & GEOFENCE IMPLEMENTATION');

  // 1.1 Site Entity
  const siteEntity = fileExists('backend/src/core/domain/entities/Site.ts');
  if (siteEntity) {
    const hasGeofence = containsCode('backend/src/core/domain/entities/Site.ts', [
      /geofence[Bb]oundary|geofence_boundary/,  // Support both camelCase and snake_case
      'GeoJSON',
      'Polygon'
    ]);
    if (hasGeofence) {
      addCheck('sites', 'Site Entity with Geofence', 'PASS', 'Site entity includes geofenceBoundary field');
    } else {
      addCheck('sites', 'Site Entity with Geofence', 'FAIL', 'Site entity missing geofenceBoundary');
    }
  } else {
    addCheck('sites', 'Site Entity with Geofence', 'FAIL', 'Site entity not found');
  }

  // 1.2 Geofence Value Object
  const hasGeofenceVO = fileExists('backend/src/core/domain/value-objects/GeofenceBoundary.ts');
  if (hasGeofenceVO) {
    addCheck('sites', 'GeofenceBoundary Value Object', 'PASS', 'GeofenceBoundary VO exists');
  } else {
    addCheck('sites', 'GeofenceBoundary Value Object', 'WARN', 'Consider GeofenceBoundary VO');
  }

  // 1.3 GPS Location Value Object
  const hasGPSVO = fileExists('backend/src/core/domain/value-objects/GPSLocation.ts');
  if (hasGPSVO && containsCode('backend/src/core/domain/value-objects/GPSLocation.ts', ['latitude', 'longitude'])) {
    addCheck('sites', 'GPSLocation Value Object', 'PASS', 'GPSLocation VO with lat/lng');
  } else {
    addCheck('sites', 'GPSLocation Value Object', 'FAIL', 'GPSLocation VO missing or incomplete');
  }

  // 1.4 GeofenceService
  const hasGeofenceService = fileExists('backend/src/core/services/GeofenceService.ts');
  if (hasGeofenceService) {
    const hasPointInPolygon = containsCode('backend/src/core/services/GeofenceService.ts', [
      /isPointInPolygon|pointInPolygon/i,
      /validateLocation/i
    ]);
    if (hasPointInPolygon) {
      addCheck('sites', 'GeofenceService', 'PASS', 'GeofenceService with point-in-polygon');
    } else {
      addCheck('sites', 'GeofenceService', 'FAIL', 'GeofenceService missing core methods');
    }
  } else {
    addCheck('sites', 'GeofenceService', 'FAIL', 'GeofenceService not found');
  }

  // 1.5 Site Database Model
  const hasSiteModel = fileExists('backend/src/infrastructure/database/models/Site.ts');
  if (hasSiteModel) {
    addCheck('sites', 'Site Database Model', 'PASS', 'Sequelize Site model exists');
  } else {
    addCheck('sites', 'Site Database Model', 'FAIL', 'Site model not found');
  }

  // 1.6 Site Repository
  const hasSiteRepo = fileExists('backend/src/infrastructure/database/repositories/SequelizeSiteRepository.ts');
  if (hasSiteRepo) {
    addCheck('sites', 'Site Repository', 'PASS', 'Site repository implementation');
  } else {
    addCheck('sites', 'Site Repository', 'FAIL', 'Site repository not found');
  }
}

/**
 * ============================================
 * CATEGORY 2: CHECKPOINT IMPLEMENTATION
 * ============================================
 */
function validateCheckpoints() {
  logSection('2. CHECKPOINT IMPLEMENTATION');

  // 2.1 Checkpoint Entity
  const hasCheckpoint = fileExists('backend/src/core/domain/entities/Checkpoint.ts');
  if (hasCheckpoint) {
    const hasTypes = containsCode('backend/src/core/domain/entities/Checkpoint.ts', [
      /verification_type|verificationType/i,
      /nfc|qr|gps/i
    ]);
    if (hasTypes) {
      addCheck('checkpoints', 'Checkpoint Entity', 'PASS', 'Checkpoint with verification types');
    } else {
      addCheck('checkpoints', 'Checkpoint Entity', 'WARN', 'Checkpoint may be missing verification types');
    }
  } else {
    addCheck('checkpoints', 'Checkpoint Entity', 'FAIL', 'Checkpoint entity not found');
  }

  // 2.2 CheckpointService
  const hasCheckpointService = fileExists('backend/src/core/services/CheckpointService.ts');
  if (hasCheckpointService) {
    addCheck('checkpoints', 'CheckpointService', 'PASS', 'Checkpoint service exists');
  } else {
    addCheck('checkpoints', 'CheckpointService', 'FAIL', 'CheckpointService not found');
  }

  // 2.3 CheckpointVerificationService
  const hasVerificationService = fileExists('backend/src/core/services/CheckpointVerificationService.ts');
  if (hasVerificationService) {
    const hasValidation = containsCode('backend/src/core/services/CheckpointVerificationService.ts', [
      /verify/i,
      /gps|nfc|qr/i
    ]);
    if (hasValidation) {
      addCheck('checkpoints', 'CheckpointVerificationService', 'PASS', 'Verification service with validation logic');
    } else {
      addCheck('checkpoints', 'CheckpointVerificationService', 'WARN', 'Verification service may be incomplete');
    }
  } else {
    addCheck('checkpoints', 'CheckpointVerificationService', 'WARN', 'CheckpointVerificationService not found');
  }

  // 2.4 Checkpoint Model
  const hasCheckpointModel = fileExists('backend/src/infrastructure/database/models/Checkpoint.ts');
  if (hasCheckpointModel) {
    addCheck('checkpoints', 'Checkpoint Database Model', 'PASS', 'Checkpoint model exists');
  } else {
    addCheck('checkpoints', 'Checkpoint Database Model', 'FAIL', 'Checkpoint model not found');
  }

  // 2.5 Checkpoint Repository
  const hasCheckpointRepo = fileExists('backend/src/infrastructure/database/repositories/SequelizeCheckpointRepository.ts');
  if (hasCheckpointRepo) {
    addCheck('checkpoints', 'Checkpoint Repository', 'PASS', 'Checkpoint repository exists');
  } else {
    addCheck('checkpoints', 'Checkpoint Repository', 'FAIL', 'Checkpoint repository not found');
  }
}

/**
 * ============================================
 * CATEGORY 3: PATROL ENGINE
 * ============================================
 */
function validatePatrolEngine() {
  logSection('3. PATROL ENGINE');

  // 3.1 PatrolTemplate Entity
  const hasTemplate = fileExists('backend/src/core/domain/entities/PatrolTemplate.ts');
  if (hasTemplate) {
    addCheck('patrol', 'PatrolTemplate Entity', 'PASS', 'PatrolTemplate entity exists');
  } else {
    addCheck('patrol', 'PatrolTemplate Entity', 'FAIL', 'PatrolTemplate not found');
  }

  // 3.2 PatrolRun Entity
  const hasRun = fileExists('backend/src/core/domain/entities/PatrolRun.ts');
  if (hasRun) {
    const hasStatus = containsCode('backend/src/core/domain/entities/PatrolRun.ts', [
      /PENDING|IN_PROGRESS|COMPLETED/i,
      /status/i
    ]);
    if (hasStatus) {
      addCheck('patrol', 'PatrolRun Entity', 'PASS', 'PatrolRun with status enum');
    } else {
      addCheck('patrol', 'PatrolRun Entity', 'WARN', 'PatrolRun may be missing status');
    }
  } else {
    addCheck('patrol', 'PatrolRun Entity', 'FAIL', 'PatrolRun not found');
  }

  // 3.3 PatrolCheckpoint Entity
  const hasPatrolCheckpoint = fileExists('backend/src/core/domain/entities/PatrolCheckpoint.ts');
  if (hasPatrolCheckpoint) {
    addCheck('patrol', 'PatrolCheckpoint Entity', 'PASS', 'PatrolCheckpoint entity exists');
  } else {
    addCheck('patrol', 'PatrolCheckpoint Entity', 'FAIL', 'PatrolCheckpoint not found');
  }

  // 3.4 PatrolExecutionService
  const hasPatrolService = fileExists('backend/src/core/services/PatrolExecutionService.ts');
  if (hasPatrolService) {
    const hasLifecycle = containsCode('backend/src/core/services/PatrolExecutionService.ts', [
      /startPatrol/i,
      /verifyCheckpoint/i,
      /completePatrol/i,
      /abandonPatrol/i
    ]);
    if (hasLifecycle) {
      addCheck('patrol', 'PatrolExecutionService', 'PASS', 'Full patrol lifecycle methods');
    } else {
      addCheck('patrol', 'PatrolExecutionService', 'WARN', 'PatrolExecutionService incomplete');
    }
  } else {
    addCheck('patrol', 'PatrolExecutionService', 'FAIL', 'PatrolExecutionService not found');
  }

  // 3.5 PatrolTemplateService
  const hasTemplateService = fileExists('backend/src/core/services/PatrolTemplateService.ts');
  if (hasTemplateService) {
    addCheck('patrol', 'PatrolTemplateService', 'PASS', 'PatrolTemplateService exists');
  } else {
    addCheck('patrol', 'PatrolTemplateService', 'FAIL', 'PatrolTemplateService not found');
  }

  // 3.6 Patrol Repositories
  const repos = [
    'SequelizePatrolTemplateRepository',
    'SequelizePatrolRunRepository',
    'SequelizePatrolCheckpointRepository',
    'SequelizePatrolCheckpointLogRepository'
  ];
  let allReposExist = true;
  for (const repo of repos) {
    if (!fileExists(`backend/src/infrastructure/database/repositories/${repo}.ts`)) {
      allReposExist = false;
      break;
    }
  }
  if (allReposExist) {
    addCheck('patrol', 'Patrol Repositories', 'PASS', 'All patrol repositories exist');
  } else {
    addCheck('patrol', 'Patrol Repositories', 'FAIL', 'Some patrol repositories missing');
  }

  // 3.7 Patrol Models
  const models = [
    'PatrolTemplate',
    'PatrolRun',
    'PatrolCheckpoint',
    'PatrolCheckpointLog'
  ];
  let allModelsExist = true;
  for (const model of models) {
    if (!fileExists(`backend/src/infrastructure/database/models/${model}.ts`)) {
      allModelsExist = false;
      break;
    }
  }
  if (allModelsExist) {
    addCheck('patrol', 'Patrol Database Models', 'PASS', 'All patrol models exist');
  } else {
    addCheck('patrol', 'Patrol Database Models', 'FAIL', 'Some patrol models missing');
  }
}

/**
 * ============================================
 * CATEGORY 4: API & CONTROLLERS
 * ============================================
 */
function validateAPI() {
  logSection('4. API & CONTROLLERS');

  // 4.1 Patrol Controller
  const hasPatrolController = fileExists('backend/src/interfaces/http/controllers/PatrolController.ts');
  if (hasPatrolController) {
    addCheck('api', 'PatrolController', 'PASS', 'Patrol API controller exists');
  } else {
    addCheck('api', 'PatrolController', 'FAIL', 'PatrolController not found');
  }

  // 4.2 Site Controller
  const hasSiteController = fileExists('backend/src/interfaces/http/controllers/WebSiteController.ts');
  if (hasSiteController) {
    addCheck('api', 'Site Controller', 'PASS', 'Site management controller exists');
  } else {
    addCheck('api', 'Site Controller', 'WARN', 'SiteController not found (may be optional)');
  }

  // 4.3 Checkpoint Controller
  const hasCheckpointController = fileExists('backend/src/interfaces/http/controllers/WebCheckpointController.ts');
  if (hasCheckpointController) {
    addCheck('api', 'Checkpoint Controller', 'PASS', 'Checkpoint controller exists');
  } else {
    addCheck('api', 'Checkpoint Controller', 'WARN', 'CheckpointController not found');
  }

  // 4.4 Patrol Routes
  const hasPatrolRoutes = fileExists('backend/src/interfaces/http/routes/patrolRoutes.ts');
  if (hasPatrolRoutes) {
    addCheck('api', 'Patrol Routes', 'PASS', 'Patrol routes defined');
  } else {
    addCheck('api', 'Patrol Routes', 'FAIL', 'Patrol routes not found');
  }
}

/**
 * ============================================
 * CATEGORY 5: ARCHITECTURE COMPLIANCE
 * ============================================
 */
function validateArchitecture() {
  logSection('5. ARCHITECTURE COMPLIANCE');

  // 5.1 Core Layer Independence
  const patrolService = readFile('backend/src/core/services/PatrolExecutionService.ts');
  if (patrolService) {
    const hasNoExpress = !patrolService.includes('express') &&
                         !patrolService.includes('Request') &&
                         !patrolService.includes('Response');
    if (hasNoExpress) {
      addCheck('architecture', 'Core Layer Independence', 'PASS', 'Services have no Express imports');
    } else {
      addCheck('architecture', 'Core Layer Independence', 'FAIL', 'Services contain Express imports');
    }
  } else {
    addCheck('architecture', 'Core Layer Independence', 'FAIL', 'Cannot verify - service not found');
  }

  // 5.2 Repository Pattern
  const hasBaseRepo = fileExists('backend/src/infrastructure/database/repositories/BaseRepository.ts');
  if (hasBaseRepo) {
    addCheck('architecture', 'Repository Pattern', 'PASS', 'BaseRepository exists');
  } else {
    addCheck('architecture', 'Repository Pattern', 'WARN', 'BaseRepository not found');
  }

  // 5.3 Domain Interfaces
  const hasRepoInterfaces = fileExists('backend/src/core/domain/repositories/index.ts');
  if (hasRepoInterfaces) {
    addCheck('architecture', 'Domain Repository Interfaces', 'PASS', 'Repository interfaces defined');
  } else {
    addCheck('architecture', 'Domain Repository Interfaces', 'WARN', 'Repository interfaces not found');
  }
}

/**
 * ============================================
 * CATEGORY 6: MOBILE STATUS (INFORMATIONAL)
 * ============================================
 */
function validateMobileStatus() {
  logSection('6. MOBILE STATUS (INFORMATIONAL)');

  // Mobile is NOT required for GATE_2 backend validation
  // These are informational warnings

  const hasMobileStructure = fs.existsSync('mobile/app/src/main/java/com/patrolmanager');
  if (hasMobileStructure) {
    addCheck('mobile', 'Mobile Project Structure', 'WARN', 'Mobile exists but implementation incomplete (~5%)');
  } else {
    addCheck('mobile', 'Mobile Project Structure', 'WARN', 'Mobile project not found');
  }

  const hasLocationService = fileExists('mobile/app/src/main/java/com/patrolmanager/app/core/services/LocationService.kt');
  if (hasLocationService) {
    const content = readFile('mobile/app/src/main/java/com/patrolmanager/app/core/services/LocationService.kt');
    if (content && content.length < 50) {
      addCheck('mobile', 'LocationService', 'WARN', 'LocationService is a stub implementation');
    } else {
      addCheck('mobile', 'LocationService', 'WARN', 'LocationService exists but needs verification');
    }
  }

  log('', colors.cyan);
  log('  NOTE: Mobile implementation is tracked separately.', colors.yellow);
  log('  GATE_2 validates backend Patrol Engine & Geofencing.', colors.yellow);
}

/**
 * ============================================
 * MAIN EXECUTION
 * ============================================
 */
function runGate2() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     PATROL MANAGER - GATE 2 VALIDATION CHECK                ║', colors.cyan);
  log('║     Phase 2: Patrol Engine & Geofencing                     ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  validateSitesAndGeofencing();
  validateCheckpoints();
  validatePatrolEngine();
  validateAPI();
  validateArchitecture();
  validateMobileStatus();

  // Print Summary
  logSection('GATE 2 SUMMARY');

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
    log('║                    GATE 2: PASS ✓                           ║', colors.green);
    log('║     Patrol Engine & Geofencing validated successfully      ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝', colors.green);
  } else {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.red);
    log('║                    GATE 2: FAIL ✗                           ║', colors.red);
    log('║     Fix failed checks before proceeding to Phase 3         ║', colors.red);
    log('╚════════════════════════════════════════════════════════════╝', colors.red);
  }

  // Write results to file
  const resultsPath = path.join(process.cwd(), '.gates', 'gate-2-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n  Results saved to: ${resultsPath}`, colors.blue);

  return gateStatus;
}

// Run the gate check
const status = runGate2();
process.exit(status === 'PASS' ? 0 : 1);
