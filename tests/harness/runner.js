'use strict';
/**
 * Workout App Automated Test Harness - Test Engine
 * Nested describe/it hierarchy, lifecycle hooks, timeouts, stack cleaning, and metrics.
 */

class Suite {
  constructor(name = '', parent = null) {
    this.name = name;
    this.parent = parent;
    this.suites = [];
    this.tests = [];
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.timeout = parent ? parent.timeout : 5000;
  }

  get fullName() {
    if (!this.parent || !this.parent.name) return this.name;
    return `${this.parent.fullName} > ${this.name}`;
  }

  getBeforeEachChain() {
    const chain = this.parent ? this.parent.getBeforeEachChain() : [];
    return chain.concat(this.beforeEachHooks);
  }

  getAfterEachChain() {
    // Inner suite afterEach first, then parent afterEach
    const chain = [...this.afterEachHooks];
    if (this.parent) {
      chain.push(...this.parent.getAfterEachChain());
    }
    return chain;
  }
}

class Test {
  constructor(name, fn, options = {}) {
    this.name = name;
    this.fn = fn;
    this.timeout = options.timeout || null;
    this.skip = options.skip || false;
    this.only = options.only || false;
    this.suite = null;
    this.status = 'pending'; // 'passed' | 'failed' | 'skipped'
    this.error = null;
    this.duration = 0;
  }

  get fullName() {
    return this.suite && this.suite.fullName ? `${this.suite.fullName} > ${this.name}` : this.name;
  }

  get effectiveTimeout() {
    if (this.timeout != null) return this.timeout;
    return this.suite ? this.suite.timeout : 5000;
  }
}

class Runner {
  constructor() {
    this.reset();
  }

  reset() {
    this.rootSuite = new Suite('');
    this.currentSuite = this.rootSuite;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: []
    };
  }

  describe(name, fn) {
    const suite = new Suite(name, this.currentSuite);
    this.currentSuite.suites.push(suite);
    const prev = this.currentSuite;
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = prev;
    }
    return suite;
  }

  it(name, fn, options = {}) {
    if (typeof options === 'number') options = { timeout: options };
    const t = new Test(name, fn, options);
    t.suite = this.currentSuite;
    this.currentSuite.tests.push(t);
    return t;
  }

  beforeAll(fn) {
    this.currentSuite.beforeAllHooks.push(fn);
  }

  afterAll(fn) {
    this.currentSuite.afterAllHooks.push(fn);
  }

  beforeEach(fn) {
    this.currentSuite.beforeEachHooks.push(fn);
  }

  afterEach(fn) {
    this.currentSuite.afterEachHooks.push(fn);
  }

  async runWithTimeout(fn, timeoutMs) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`Test timed out after ${timeoutMs}ms`);
        err.name = 'TimeoutError';
        reject(err);
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        await Promise.race([res, timeoutPromise]);
      }
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }

  cleanStack(stack) {
    if (!stack) return '';
    return stack
      .split('\n')
      .filter(line => {
        if (!line.trim().startsWith('at ')) return true;
        if (line.includes('runner.js') || line.includes('assert.js')) return false;
        if (line.includes('node:internal') || line.includes('node:vm')) return false;
        return true;
      })
      .join('\n');
  }

  recordFailure(test, error) {
    test.status = 'failed';
    test.error = error;
    this.results.failed++;
    this.results.failures.push({
      fullName: test.fullName,
      testName: test.name,
      suiteName: test.suite ? test.suite.fullName : '',
      error,
      cleanStack: this.cleanStack(error.stack),
      duration: test.duration
    });
  }

  async executeSuite(suite, options = {}) {
    const { verbose = false, bail = false } = options;

    // 1. Run beforeAll hooks for this suite
    for (const hook of suite.beforeAllHooks) {
      try {
        await this.runWithTimeout(hook, suite.timeout);
      } catch (err) {
        // Failing beforeAll marks all tests in this suite as failed
        const hookErr = new Error(`beforeAll hook failed: ${err.message}`);
        for (const t of suite.tests) {
          this.results.total++;
          this.recordFailure(t, hookErr);
        }
        return;
      }
    }

    try {
      // 2. Run tests in this suite
      for (const test of suite.tests) {
        if (test.skip) {
          test.status = 'skipped';
          this.results.total++;
          this.results.skipped++;
          if (verbose) console.log(`  - [SKIP] ${test.fullName}`);
          continue;
        }

        this.results.total++;
        const startTime = Date.now();
        const beforeEachHooks = suite.getBeforeEachChain();
        const afterEachHooks = suite.getAfterEachChain();
        let testError = null;

        // Run beforeEach chain
        for (const hook of beforeEachHooks) {
          try {
            await this.runWithTimeout(hook, test.effectiveTimeout);
          } catch (err) {
            testError = new Error(`beforeEach hook failed: ${err.message}`);
            break;
          }
        }

        // Run test function if beforeEach succeeded
        if (!testError && test.fn) {
          try {
            await this.runWithTimeout(test.fn, test.effectiveTimeout);
          } catch (err) {
            testError = err;
          }
        }

        // Always run afterEach chain, even if test or beforeEach failed
        for (const hook of afterEachHooks) {
          try {
            await this.runWithTimeout(hook, test.effectiveTimeout);
          } catch (err) {
            if (!testError) {
              testError = new Error(`afterEach hook failed: ${err.message}`);
            }
          }
        }

        test.duration = Date.now() - startTime;
        if (testError) {
          this.recordFailure(test, testError);
          if (verbose) console.log(`  ✗ [FAIL] ${test.fullName} (${test.duration}ms)`);
          if (bail) return;
        } else {
          test.status = 'passed';
          this.results.passed++;
          if (verbose) console.log(`  ✓ [PASS] ${test.fullName} (${test.duration}ms)`);
        }
      }

      // 3. Recursively run child suites
      for (const sub of suite.suites) {
        await this.executeSuite(sub, options);
        if (bail && this.results.failed > 0) return;
      }
    } finally {
      // 4. Run afterAll hooks for this suite guaranteed in finally block
      for (const hook of suite.afterAllHooks) {
        try {
          await this.runWithTimeout(hook, suite.timeout);
        } catch (err) {
          console.error(`afterAll hook error in ${suite.fullName}:`, err.message);
        }
      }
    }
  }

  async run(options = {}) {
    const startTime = Date.now();
    await this.executeSuite(this.rootSuite, options);
    this.results.duration = Date.now() - startTime;
    return this.results;
  }
}

// Singleton instance for ergonomic test definitions
const defaultRunner = new Runner();

function describe(name, fn) { return defaultRunner.describe(name, fn); }
function it(name, fn, options) { return defaultRunner.it(name, fn, options); }
const test = it;
it.skip = (name, fn) => defaultRunner.it(name, fn, { skip: true });
test.skip = it.skip;
it.only = (name, fn, options) => defaultRunner.it(name, fn, { ...options, only: true });
test.only = it.only;

function beforeEach(fn) { defaultRunner.beforeEach(fn); }
function afterEach(fn) { defaultRunner.afterEach(fn); }
function beforeAll(fn) { defaultRunner.beforeAll(fn); }
function afterAll(fn) { defaultRunner.afterAll(fn); }

module.exports = {
  Runner,
  defaultRunner,
  describe,
  it,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll
};
