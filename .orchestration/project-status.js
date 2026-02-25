/**
 * PatrolManager Project Status
 *
 * Displays current project progress, phase status, and gate results.
 *
 * Usage:
 *   node .orchestration/project-status.js
 *   node .orchestration/project-status.js --verbose
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'PROJECT_STATE.json');
const TASK_TRACKER = path.join(__dirname, '..', 'TASK_TRACKER.md');
const GATES_DIR = path.join(__dirname, '..', '.gates');

// Phase definitions
const PHASES = {
  1: { name: 'Core Foundation & Identity', tasks: 16, hours: 120 },
  2: { name: 'Patrol Engine & Geofencing', tasks: 23, hours: 240 },
  3: { name: 'Real-time Command & SOS', tasks: 16, hours: 160 },
  4: { name: 'Incidents & Communication', tasks: 18, hours: 180 },
  5: { name: 'HR, Analytics & Final Polish', tasks: 22, hours: 180 },
  6: { name: 'Production Deployment', tasks: 16, hours: 160 }
};

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return null;
}

function formatTimestamp(isoString) {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString();
}

function formatDuration(startTime) {
  if (!startTime) return 'N/A';
  const start = new Date(startTime);
  const now = new Date();
  const diff = now - start;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days}d ${hours}h`;
}

function calculateProgress() {
  const state = loadState();
  if (!state) return null;

  let totalTasks = 0;
  let completedTasks = 0;
  let totalHours = 0;
  let completedHours = 0;

  for (let i = 1; i <= state.currentPhase; i++) {
    const phase = PHASES[i];
    if (!phase) continue;

    totalTasks += phase.tasks;
    totalHours += phase.hours;

    if (i < state.currentPhase) {
      completedTasks += phase.tasks;
      completedHours += phase.hours;
    } else if (i === state.currentPhase) {
      completedTasks += state.tasksCompleted.filter(t => t.startsWith(`P${i}`)).length;
      // Estimate hours based on task completion
      completedHours += Math.floor((completedTasks % phase.tasks) / phase.tasks * phase.hours);
    }
  }

  return {
    totalTasks,
    completedTasks,
    totalHours,
    completedHours,
    percentage: Math.round((completedTasks / totalTasks) * 100)
  };
}

function displayStatus(verbose = false) {
  const state = loadState();

  if (!state) {
    console.log('\n❌ Project not initialized. Run: npm run project:start\n');
    return;
  }

  const progress = calculateProgress();

  console.log('\n' + '═'.repeat(60));
  console.log('  PatrolManager Development Progress');
  console.log('═'.repeat(60));

  // Current Phase
  const currentPhase = PHASES[state.currentPhase];
  console.log('\n📊 Current Phase:');
  console.log(`   Phase ${state.currentPhase}: ${currentPhase?.name || 'Unknown'}`);
  console.log(`   Status: ${getStatusEmoji(state.phaseStatus)} ${state.phaseStatus?.toUpperCase() || 'UNKNOWN'}`);

  if (state.currentTask) {
    console.log(`   Current Task: ${state.currentTask}`);
  }

  // Progress Bar
  console.log('\n📈 Overall Progress:');
  if (progress) {
    const barLength = 40;
    const filled = Math.round((progress.completedTasks / progress.totalTasks) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    console.log(`   [${bar}] ${progress.percentage}%`);
    console.log(`   Tasks: ${progress.completedTasks}/${progress.totalTasks}`);
    console.log(`   Hours: ${progress.completedHours}/${progress.totalHours}`);
  }

  // Gates
  console.log('\n🚪 Gate Status:');
  if (state.gatesPassed.length === 0) {
    console.log('   No gates passed yet');
  } else {
    state.gatesPassed.forEach((gate, idx) => {
      const phaseNum = gate.replace('GATE_', '').replace('PRODUCTION_GATE', '6');
      const phase = PHASES[phaseNum];
      console.log(`   ✅ ${gate}: ${phase?.name || 'Unknown'}`);
    });
  }

  // Last Gate Result
  if (state.lastGate && state.gateResults[state.lastGate]) {
    const lastResult = state.gateResults[state.lastGate];
    console.log('\n📋 Last Gate Result:');
    console.log(`   Gate: ${lastResult.gate || lastResult.phase || state.lastGate}`);
    console.log(`   Status: ${lastResult.status === 'PASS' ? '✅' : '❌'} ${lastResult.status}`);
    console.log(`   Time: ${formatTimestamp(lastResult.timestamp)}`);

    if (verbose && lastResult.checks) {
      console.log('\n   Checks:');
      Object.entries(lastResult.checks).forEach(([check, result]) => {
        const status = typeof result === 'object' ? result.status : result;
        const emoji = status === 'PASS' ? '✅' : '❌';
        console.log(`      ${emoji} ${check}: ${status}`);
      });
    }
  }

  // Time Tracking
  console.log('\n⏱️  Time Tracking:');
  console.log(`   Started: ${formatTimestamp(state.startTime)}`);
  console.log(`   Elapsed: ${formatDuration(state.startTime)}`);

  if (progress && progress.completedHours < progress.totalHours) {
    const remainingHours = progress.totalHours - progress.completedHours;
    const daysRemaining = Math.ceil(remainingHours / 8); // Assuming 8 hours/day
    console.log(`   Est. Remaining: ~${daysRemaining} days (${remainingHours} hours)`);
  }

  // Verbose output
  if (verbose) {
    console.log('\n📝 Detailed Task Status:');
    console.log(`   Completed: ${state.tasksCompleted.length} tasks`);
    console.log(`   In Progress: ${state.tasksInProgress.length} tasks`);
    console.log(`   Pending: ${state.metrics?.totalTasks - state.tasksCompleted.length} tasks`);

    if (state.tasksInProgress.length > 0) {
      console.log('\n   Currently In Progress:');
      state.tasksInProgress.forEach(task => {
        console.log(`      • ${task}`);
      });
    }

    if (state.agents) {
      console.log('\n🤖 Agent Status:');
      console.log(`   Tech Lead: ${state.agents.techLeadOrchestrator}`);
      console.log(`   Context Manager: ${state.agents.contextManager}`);
      if (state.agents.lastAgentUsed) {
        console.log(`   Last Used: ${state.agents.lastAgentUsed}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));

  // Next steps
  console.log('\n👷 Next Steps:');
  if (state.phaseStatus === 'gate_failed') {
    const failedGate = state.lastGate || 'UNKNOWN';
    console.log(`   1. Review gate ${failedGate} failures`);
    console.log(`   2. Run: npm run project:fix -- --gate=${failedGate}`);
    console.log(`   3. Re-run gate review when fixed`);
  } else if (state.phaseStatus === 'gate_passed') {
    const nextPhase = state.currentPhase + 1;
    if (nextPhase <= 6) {
      console.log(`   1. Proceed to Phase ${nextPhase}`);
      console.log(`   2. Run: npm run project:start -- --phase=${nextPhase}`);
    } else {
      console.log(`   1. Project complete!`);
      console.log(`   2. Run production deployment checks`);
    }
  } else {
    console.log(`   1. Continue Phase ${state.currentPhase} tasks`);
    console.log(`   2. Complete all tasks in TASK_TRACKER.md`);
    console.log(`   3. Run gate review: npm run gate:review -- --phase=${state.currentPhase}`);
  }

  console.log('');
}

function getStatusEmoji(status) {
  const emojis = {
    'ready': '🔵',
    'in_progress': '🟡',
    'completed': '🟢',
    'gate_passed': '✅',
    'gate_failed': '❌'
  };
  return emojis[status] || '⚪';
}

// CLI
const verbose = process.argv.includes('--verbose');
displayStatus(verbose);

module.exports = { loadState, calculateProgress, displayStatus };
