import { jest } from '@jest/globals';
/**
 * Mock Helper Utilities
 *
 * Provides utilities for creating mocks in tests.
 * Compatible with Jest 29.x type definitions.
 */

/**
 * Clear all mocks including timers, modules, and fn mocks
 */
export function clearAllMocks(): void {
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

/**
 * Create a mock function with spy capabilities
 */
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): jest.Mock {
  return implementation ? jest.fn(implementation) : jest.fn();
}

/**
 * Create a mock async function that resolves with a value
 */
export function createResolvedSpy<T>(value: T): jest.Mock {
  return jest.fn().mockResolvedValue(value);
}

/**
 * Create a mock async function that rejects with an error
 */
export function createRejectedSpy(error: Error): jest.Mock {
  return jest.fn().mockRejectedValue(error);
}

/**
 * Create a mock for a class
 */
export function mockClass<T extends new (...args: any[]) => any>(
  _constructor: T
): jest.MockedClass<T> {
  return jest.fn() as any;
}

/**
 * Spy on a method of an object
 */
export function spyOnMethod<T extends object, K extends keyof T>(
  obj: T,
  method: K
): jest.SpyInstance {
  return jest.spyOn(obj, method as any);
}

/**
 * Create a mock that returns different values on consecutive calls
 */
export function createSequentialMock<T>(values: T[]): jest.Mock {
  const mock = jest.fn();
  values.forEach((value) => mock.mockReturnValueOnce(value));
  return mock;
}

/**
 * Reset all module mocks
 */
export function resetModules(): void {
  jest.resetModules();
}

/**
 * Reload a module (useful for testing with different configurations)
 */
export async function reloadModule(modulePath: string): Promise<any> {
  resetModules();
  return await import(modulePath);
}
