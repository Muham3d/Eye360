/**
 * Console Mock Utilities
 *
 * Provides utilities for mocking console in tests.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

/**
 * Mock console methods to silence output in tests
 */
export function mockConsole(): void {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
}

/**
 * Restore console methods to original implementation
 */
export function restoreConsole(): void {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}

/**
 * Spy on console.log
 */
export function spyOnConsole(): {
  log: jest.SpyInstance;
  error: jest.SpyInstance;
  warn: jest.SpyInstance;
  info: jest.SpyInstance;
  debug: jest.SpyInstance;
  restore: () => void;
} {
  const spies = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
    debug: jest.spyOn(console, 'debug').mockImplementation(),
    restore: () => {
      spies.log.mockRestore();
      spies.error.mockRestore();
      spies.warn.mockRestore();
      spies.info.mockRestore();
      spies.debug.mockRestore();
    },
  };

  return spies;
}

/**
 * Get console output from mocked console methods
 */
export function getConsoleOutput(method: 'log' | 'error' | 'warn' | 'info' | 'debug'): string[] {
  const calls = (console[method] as jest.Mock).mock.calls || [];
  return calls.map((call) => call.map((arg: any) => String(arg)).join(' '));
}
