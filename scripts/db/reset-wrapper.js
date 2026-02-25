#!/usr/bin/env node

/**
 * Cross-platform Database Reset Wrapper
 *
 * This script detects the operating system and invokes the appropriate
 * database reset script (PowerShell for Windows, Bash for Unix-like systems).
 *
 * Usage:
 *   node scripts/db/reset-wrapper.js [options]
 *
 * Options:
 *   --yes       Skip confirmation prompt
 *   --skip-seed Skip running seeders
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isYes = args.includes('--yes') || args.includes('-y');
const isSkipSeed = args.includes('--skip-seed') || args.includes('-s');

// Determine platform
const isWindows = process.platform === 'win32';

// Build script command
let script, scriptArgs;

if (isWindows) {
  // Windows: use PowerShell
  script = 'powershell.exe';
  scriptArgs = [
    '-ExecutionPolicy', 'Bypass',
    '-File', path.join(__dirname, 'reset.ps1')
  ];

  if (isYes) scriptArgs.push('-Yes');
  if (isSkipSeed) scriptArgs.push('-SkipSeed');
} else {
  // Unix-like: use Bash
  script = '/bin/bash';
  scriptArgs = [path.join(__dirname, 'reset.sh')];

  if (isYes) scriptArgs.push('--yes');
  if (isSkipSeed) scriptArgs.push('--skip-seed');
}

// Spawn the appropriate script
const childProcess = spawn(script, scriptArgs, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '../..')
});

// Handle exit
childProcess.on('exit', (code) => {
  process.exit(code || 0);
});

childProcess.on('error', (err) => {
  console.error('Failed to start database reset script:', err);
  process.exit(1);
});
