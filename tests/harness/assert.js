'use strict';
/**
 * Workout App Automated Test Harness - Assertion Library
 * Zero-dependency assertion engine with path-based visual diffs and clean stack traces.
 */
const util = require('node:util');

class AssertionError extends Error {
  constructor(options = {}) {
    const {
      message = 'Assertion failed',
      actual,
      expected,
      operator = 'assert',
      diff = null,
      stackStartFn = AssertionError
    } = options;
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
    this.operator = operator;
    this.diff = diff;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, stackStartFn);
    }
  }
}

function formatValue(v) {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) return String(v);
  return util.inspect(v, { depth: 3, compact: true, breakLength: 60 });
}

function assert(condition, message) {
  if (!condition) {
    throw new AssertionError({
      message: message || 'Assertion failed: expected condition to be truthy',
      actual: condition,
      expected: true,
      operator: 'assert',
      stackStartFn: assert
    });
  }
}

function assertEqual(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    throw new AssertionError({
      message: message || `Expected ${formatValue(actual)} === ${formatValue(expected)}`,
      actual,
      expected,
      operator: 'assertEqual',
      stackStartFn: assertEqual
    });
  }
}

function assertNotEqual(actual, unexpected, message) {
  if (Object.is(actual, unexpected)) {
    throw new AssertionError({
      message: message || `Expected value !== ${formatValue(unexpected)}, but received identical value`,
      actual,
      expected: `not ${formatValue(unexpected)}`,
      operator: 'assertNotEqual',
      stackStartFn: assertNotEqual
    });
  }
}

function formatDate(d) {
  return Number.isNaN(d.getTime()) ? 'Invalid Date' : d.toISOString();
}

function diffObjects(actual, expected, path = '', diffs = [], seen = new WeakMap()) {
  if (Object.is(actual, expected)) return diffs;

  const typeA = typeof actual;
  const typeB = typeof expected;

  if (typeA !== typeB || actual === null || expected === null) {
    diffs.push({
      path: path || 'root',
      message: `Type/value mismatch: expected ${formatValue(expected)}, got ${formatValue(actual)}`,
      expected,
      actual
    });
    return diffs;
  }

  if (typeA === 'object') {
    let seenSet = seen.get(actual);
    if (seenSet && seenSet.has(expected)) {
      return diffs; // Circular reference cycle matched
    }
    if (!seenSet) {
      seenSet = new Set();
      seen.set(actual, seenSet);
    }
    seenSet.add(expected);

    if (actual instanceof Date && expected instanceof Date) {
      const timeA = actual.getTime();
      const timeB = expected.getTime();
      const isNanA = Number.isNaN(timeA);
      const isNanB = Number.isNaN(timeB);
      if (isNanA && isNanB) {
        return diffs;
      }
      if (isNanA !== isNanB || timeA !== timeB) {
        diffs.push({
          path: path || 'root',
          message: `Date mismatch: expected ${formatDate(expected)}, got ${formatDate(actual)}`,
          expected,
          actual
        });
      }
      return diffs;
    }

    if (actual instanceof RegExp && expected instanceof RegExp) {
      if (actual.toString() !== expected.toString()) {
        diffs.push({
          path: path || 'root',
          message: `RegExp mismatch: expected ${expected.toString()}, got ${actual.toString()}`,
          expected,
          actual
        });
      }
      return diffs;
    }

    if (Array.isArray(actual) !== Array.isArray(expected)) {
      diffs.push({
        path: path || 'root',
        message: `Type mismatch: expected ${Array.isArray(expected) ? 'Array' : 'Object'}, got ${Array.isArray(actual) ? 'Array' : 'Object'}`,
        expected,
        actual
      });
      return diffs;
    }

    if ((actual instanceof Date) !== (expected instanceof Date)) {
      diffs.push({
        path: path || 'root',
        message: `Type mismatch: expected ${expected instanceof Date ? 'Date' : 'Object'}, got ${actual instanceof Date ? 'Date' : 'Object'}`,
        expected,
        actual
      });
      return diffs;
    }

    if ((actual instanceof RegExp) !== (expected instanceof RegExp)) {
      diffs.push({
        path: path || 'root',
        message: `Type mismatch: expected ${expected instanceof RegExp ? 'RegExp' : 'Object'}, got ${actual instanceof RegExp ? 'RegExp' : 'Object'}`,
        expected,
        actual
      });
      return diffs;
    }

    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) {
        diffs.push({
          path: path ? `${path}.length` : 'length',
          message: `Array length mismatch: expected ${expected.length}, got ${actual.length}`,
          expected: expected.length,
          actual: actual.length
        });
      }
      const maxLen = Math.max(actual.length, expected.length);
      for (let i = 0; i < maxLen; i++) {
        const p = `${path}[${i}]`;
        if (i >= actual.length) {
          diffs.push({ path: p, message: `Missing array element at index ${i}`, expected: expected[i], actual: undefined });
        } else if (i >= expected.length) {
          diffs.push({ path: p, message: `Unexpected extra array element at index ${i}`, expected: undefined, actual: actual[i] });
        } else {
          diffObjects(actual[i], expected[i], p, diffs, seen);
        }
      }
      return diffs;
    }

    const keysA = Object.keys(actual);
    const keysB = Object.keys(expected);
    const allKeys = new Set([...keysA, ...keysB]);

    for (const k of allKeys) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in actual)) {
        diffs.push({ path: p, message: `Missing property '${k}' in actual`, expected: expected[k], actual: undefined });
      } else if (!(k in expected)) {
        diffs.push({ path: p, message: `Unexpected extra property '${k}' in actual`, expected: undefined, actual: actual[k] });
      } else {
        diffObjects(actual[k], expected[k], p, diffs, seen);
      }
    }
    return diffs;
  }

  diffs.push({
    path: path || 'root',
    message: `Value mismatch: expected ${formatValue(expected)}, got ${formatValue(actual)}`,
    expected,
    actual
  });
  return diffs;
}

function assertDeepEqual(actual, expected, message) {
  const diffs = diffObjects(actual, expected);
  if (diffs.length > 0) {
    const formattedDiffs = diffs.slice(0, 10).map(d => `    - At ${d.path}: ${d.message}`).join('\n');
    const extra = diffs.length > 10 ? `\n    ... and ${diffs.length - 10} more differences` : '';
    throw new AssertionError({
      message: (message ? `${message}\n` : 'Objects are not deep equal:\n') + formattedDiffs + extra,
      actual,
      expected,
      operator: 'assertDeepEqual',
      diff: formattedDiffs,
      stackStartFn: assertDeepEqual
    });
  }
}

function assertMatch(actual, regex, message) {
  const re = typeof regex === 'string' ? new RegExp(regex) : regex;
  if (!re || typeof re.test !== 'function') {
    throw new AssertionError({
      message: 'assertMatch requires a RegExp or string pattern as second argument',
      stackStartFn: assertMatch
    });
  }
  const str = String(actual);
  if (!re.test(str)) {
    throw new AssertionError({
      message: message || `Expected "${str}" to match ${re}`,
      actual: str,
      expected: re,
      operator: 'assertMatch',
      stackStartFn: assertMatch
    });
  }
}

function validateCaughtError(caughtError, errorPattern, message, stackStartFn) {
  if (!errorPattern) return;
  let matches = false;
  if (errorPattern instanceof RegExp) {
    matches = errorPattern.test(caughtError?.message || String(caughtError));
  } else if (typeof errorPattern === 'function') {
    if (errorPattern.prototype instanceof Error || errorPattern === Error) {
      matches = caughtError instanceof errorPattern;
    } else {
      matches = Boolean(errorPattern(caughtError));
    }
  } else if (typeof errorPattern === 'string') {
    matches = (caughtError?.message || String(caughtError)).includes(errorPattern);
  }

  if (!matches) {
    throw new AssertionError({
      message: message ? `${message} (Error pattern mismatch)` : `Thrown error did not match pattern ${errorPattern}`,
      actual: caughtError?.message || caughtError,
      expected: errorPattern,
      operator: 'assertThrows',
      stackStartFn
    });
  }
}

function assertThrows(fnOrPromise, errorPattern, message) {
  if (typeof fnOrPromise === 'function') {
    let result;
    try {
      result = fnOrPromise();
    } catch (err) {
      validateCaughtError(err, errorPattern, message, assertThrows);
      return err;
    }

    if (result && typeof result.then === 'function') {
      return result.then(
        () => {
          throw new AssertionError({
            message: message || 'Expected async function/promise to throw, but it resolved successfully',
            operator: 'assertThrows',
            stackStartFn: assertThrows
          });
        },
        (err) => {
          validateCaughtError(err, errorPattern, message, assertThrows);
          return err;
        }
      );
    }

    throw new AssertionError({
      message: message || 'Expected function to throw, but it returned without throwing',
      operator: 'assertThrows',
      stackStartFn: assertThrows
    });
  } else if (fnOrPromise && typeof fnOrPromise.then === 'function') {
    return fnOrPromise.then(
      () => {
        throw new AssertionError({
          message: message || 'Expected promise to reject, but it resolved successfully',
          operator: 'assertThrows',
          stackStartFn: assertThrows
        });
      },
      (err) => {
        validateCaughtError(err, errorPattern, message, assertThrows);
        return err;
      }
    );
  } else {
    throw new AssertionError({
      message: 'assertThrows expects a function or Promise as first argument',
      stackStartFn: assertThrows
    });
  }
}

function assertRoughlyEqual(actual, expected, delta = 0.001, message) {
  if (typeof actual !== 'number' || typeof expected !== 'number' || isNaN(actual) || isNaN(expected)) {
    throw new AssertionError({
      message: message || `Expected numbers for assertRoughlyEqual, got actual=${actual}, expected=${expected}`,
      actual,
      expected,
      operator: 'assertRoughlyEqual',
      stackStartFn: assertRoughlyEqual
    });
  }
  const diff = Math.abs(actual - expected);
  if (diff > delta) {
    throw new AssertionError({
      message: message || `Expected ${actual} to be within ${delta} of ${expected} (difference was ${diff})`,
      actual,
      expected,
      operator: 'assertRoughlyEqual',
      stackStartFn: assertRoughlyEqual
    });
  }
}

module.exports = assert;
assert.assert = assert;
assert.assertEqual = assertEqual;
assert.assertNotEqual = assertNotEqual;
assert.assertDeepEqual = assertDeepEqual;
assert.assertMatch = assertMatch;
assert.assertThrows = assertThrows;
assert.assertRoughlyEqual = assertRoughlyEqual;
assert.AssertionError = AssertionError;
