/**
 * GATE_5: Phase 5 Validation - HR, Analytics & Final Polish
 *
 * This gate validates the HR, Analytics & Final Polish phase implementation.
 * It checks shift management, reporting engine, and scheduled reporting.
 *
 * Run with: node .gates/gate-5-check.js
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
 * Gate 5 Validation Results
 */
const results = {
  gate: 'GATE_5',
  phase: 5,
  phaseName: 'HR, Analytics & Final Polish',
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
 * CATEGORY 1: SHIFT MANAGEMENT
 * ============================================
 */
function validateShiftManagement() {
  logSection('1. SHIFT MANAGEMENT');

  // 1.1 Shift Entity
  const shiftEntity = fileExists('backend/src/core/domain/entities/Shift.ts');
  if (shiftEntity) {
    const hasEnums = containsCode('backend/src/core/domain/entities/Shift.ts', [
      /ShiftStatus/,
      /ShiftType/,
      /IClockInResult/,
      /IClockOutResult/,
    ]);
    if (hasEnums) {
      addCheck('shifts', 'Shift Entity', 'PASS', 'Shift entity with workflow states');
    } else {
      addCheck('shifts', 'Shift Entity', 'WARN', 'Shift entity may be incomplete');
    }
  } else {
    addCheck('shifts', 'Shift Entity', 'FAIL', 'Shift entity not found');
  }

  // 1.2 Shift Model
  const shiftModel = fileExists('backend/src/infrastructure/database/models/Shift.ts');
  if (shiftModel) {
    const hasFields = containsCode('backend/src/infrastructure/database/models/Shift.ts', [
      /clock_in_location/,
      /clock_out_location/,
      /missed_reason/,
    ]);
    if (hasFields) {
      addCheck('shifts', 'Shift Database Model', 'PASS', 'Shift model with location tracking');
    } else {
      addCheck('shifts', 'Shift Database Model', 'WARN', 'Shift model may be incomplete');
    }
  } else {
    addCheck('shifts', 'Shift Database Model', 'FAIL', 'Shift model not found');
  }

  // 1.3 Shift Repository
  const shiftRepo = fileExists('backend/src/infrastructure/database/repositories/SequelizeShiftRepository.ts');
  if (shiftRepo) {
    const hasMethods = containsCode('backend/src/infrastructure/database/repositories/SequelizeShiftRepository.ts', [
      /findActiveForGuard/,
      /getStatistics/,
      /getAttendanceReport/,
      /markMissedShifts/,
    ]);
    if (hasMethods) {
      addCheck('shifts', 'Shift Repository', 'PASS', 'Full shift repository with statistics');
    } else {
      addCheck('shifts', 'Shift Repository', 'WARN', 'Repository may be incomplete');
    }
  } else {
    addCheck('shifts', 'Shift Repository', 'FAIL', 'Shift repository not found');
  }

  // 1.4 ShiftService
  const shiftService = fileExists('backend/src/core/services/ShiftService.ts');
  if (shiftService) {
    const hasGeofence = containsCode('backend/src/core/services/ShiftService.ts', [
      /clockIn/,
      /clockOut/,
      /validateLocationInGeofence|validateGPSLocation/,
      /IShiftConfig/,
    ]);
    if (hasGeofence) {
      addCheck('shifts', 'ShiftService', 'PASS', 'Shift service with geofence validation');
    } else {
      addCheck('shifts', 'ShiftService', 'WARN', 'ShiftService may be incomplete');
    }
  } else {
    addCheck('shifts', 'ShiftService', 'FAIL', 'ShiftService not found');
  }
}

/**
 * ============================================
 * CATEGORY 2: REPORTING ENGINE
 * ============================================
 */
function validateReportingEngine() {
  logSection('2. REPORTING ENGINE');

  // 2.1 ReportService
  const reportService = fileExists('backend/src/core/services/ReportService.ts');
  if (reportService) {
    const hasExport = containsCode('backend/src/core/services/ReportService.ts', [
      /generateSiteReport/,
      /exportToCSV/,
      /exportToExcel/,
      /exportAttendanceReport/,
    ]);
    if (hasExport) {
      addCheck('reports', 'ReportService', 'PASS', 'Report service with CSV/Excel export');
    } else {
      addCheck('reports', 'ReportService', 'WARN', 'ReportService may be incomplete');
    }
  } else {
    addCheck('reports', 'ReportService', 'FAIL', 'ReportService not found');
  }

  // 2.2 Site Performance Report
  const hasSiteReport = containsCode('backend/src/core/services/ReportService.ts', [
    /ISitePerformanceReport/,
    /patrols:/,
    /incidents:/,
    /shifts:/,
    /overallScore/,
  ]);
  if (hasSiteReport) {
    addCheck('reports', 'Site Performance Report', 'PASS', 'Comprehensive site report structure');
  } else {
    addCheck('reports', 'Site Performance Report', 'WARN', 'Site report may be incomplete');
  }

  // 2.3 Export Formats
  const hasFormats = containsCode('backend/src/core/services/ReportService.ts', [
    /ExportFormat/,
    /CSV = 'csv'/,
    /EXCEL = 'excel'/,
    /JSON = 'json'/,
  ]);
  if (hasFormats) {
    addCheck('reports', 'Export Formats', 'PASS', 'Multiple export formats supported');
  } else {
    addCheck('reports', 'Export Formats', 'WARN', 'Export formats may be incomplete');
  }
}

/**
 * ============================================
 * CATEGORY 3: SHIFT API
 * ============================================
 */
function validateShiftAPI() {
  logSection('3. SHIFT API');

  // 3.1 Shift Controller
  const shiftController = fileExists('backend/src/interfaces/http/controllers/ShiftController.ts');
  if (shiftController) {
    const hasEndpoints = containsCode('backend/src/interfaces/http/controllers/ShiftController.ts', [
      /clockIn/,
      /clockOut/,
      /getStatistics/,
      /getAttendanceReport/,
    ]);
    if (hasEndpoints) {
      addCheck('api', 'Shift Controller', 'PASS', 'Shift API controller with endpoints');
    } else {
      addCheck('api', 'Shift Controller', 'WARN', 'Controller may be incomplete');
    }
  } else {
    addCheck('api', 'Shift Controller', 'FAIL', 'ShiftController not found');
  }

  // 3.2 Shift Routes
  const shiftRoutes = fileExists('backend/src/interfaces/http/routes/shiftRoutes.ts');
  if (shiftRoutes) {
    addCheck('api', 'Shift Routes', 'PASS', 'Shift API routes defined');
  } else {
    addCheck('api', 'Shift Routes', 'FAIL', 'Shift routes not found');
  }
}

/**
 * ============================================
 * CATEGORY 4: REPORT API
 * ============================================
 */
function validateReportAPI() {
  logSection('4. REPORT API');

  // 4.1 Report Controller
  const reportController = fileExists('backend/src/interfaces/http/controllers/ReportController.ts');
  if (reportController) {
    const hasEndpoints = containsCode('backend/src/interfaces/http/controllers/ReportController.ts', [
      /getSiteReport/,
      /exportSiteReport/,
      /getComparisonReport/,
      /exportAttendanceReport/,
    ]);
    if (hasEndpoints) {
      addCheck('api', 'Report Controller', 'PASS', 'Report API controller with endpoints');
    } else {
      addCheck('api', 'Report Controller', 'WARN', 'Controller may be incomplete');
    }
  } else {
    addCheck('api', 'Report Controller', 'FAIL', 'ReportController not found');
  }

  // 4.2 Report Routes
  const reportRoutes = fileExists('backend/src/interfaces/http/routes/reportRoutes.ts');
  if (reportRoutes) {
    addCheck('api', 'Report Routes', 'PASS', 'Report API routes defined');
  } else {
    addCheck('api', 'Report Routes', 'FAIL', 'Report routes not found');
  }
}

/**
 * ============================================
 * CATEGORY 5: INTEGRATION
 * ============================================
 */
function validateIntegration() {
  logSection('5. INTEGRATION');

  // 5.1 Repository Interface
  const repoInterface = fileExists('backend/src/core/domain/repositories/IShiftRepository.ts');
  if (repoInterface) {
    const hasMethods = containsCode('backend/src/core/domain/repositories/IShiftRepository.ts', [
      /getStatistics/,
      /getAttendanceReport/,
      /markMissedShifts/,
    ]);
    if (hasMethods) {
      addCheck('integration', 'Shift Repository Interface', 'PASS', 'Complete repository interface');
    } else {
      addCheck('integration', 'Shift Repository Interface', 'WARN', 'Interface may be incomplete');
    }
  } else {
    addCheck('integration', 'Shift Repository Interface', 'FAIL', 'Interface not found');
  }

  // 5.2 Site Repository Integration
  const hasSiteRepo = containsCode('backend/src/core/services/ShiftService.ts', [
    /ISiteRepository/,
    /siteRepository/,
  ]);
  if (hasSiteRepo) {
    addCheck('integration', 'Site Repository Integration', 'PASS', 'ShiftService uses SiteRepository');
  } else {
    addCheck('integration', 'Site Repository Integration', 'WARN', 'Site integration may be missing');
  }
}

/**
 * ============================================
 * MAIN EXECUTION
 * ============================================
 */
function runGate5() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     PATROL MANAGER - GATE 5 VALIDATION CHECK                ║', colors.cyan);
  log('║     Phase 5: HR, Analytics & Final Polish                   ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  validateShiftManagement();
  validateReportingEngine();
  validateShiftAPI();
  validateReportAPI();
  validateIntegration();

  // Print Summary
  logSection('GATE 5 SUMMARY');

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
    log('║                    GATE 5: PASS ✓                           ║', colors.green);
    log('║     HR, Analytics & Final Polish validated                  ║', colors.green);
    log('║     Backend implementation complete!                        ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝', colors.green);
  } else {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.red);
    log('║                    GATE 5: FAIL ✗                           ║', colors.red);
    log('║     Fix failed checks before marking phase complete         ║', colors.red);
    log('╚════════════════════════════════════════════════════════════╝', colors.red);
  }

  // Write results to file
  const resultsPath = path.join(process.cwd(), '.gates', 'gate-5-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n  Results saved to: ${resultsPath}`, colors.blue);

  return gateStatus;
}

// Run the gate check
const status = runGate5();
process.exit(status === 'PASS' ? 0 : 1);
