'use strict';
/**
 * Workout App Automated Test Harness - Comprehensive Self-Test Suite
 * Verifies assertions, runner lifecycle hooks, async resolution, timeout detection,
 * app boot, DOM event delegation, navigation, workout lifecycle, and deterministic timers.
 */
const { describe, it, test, beforeEach, afterEach, beforeAll, afterAll, Runner } = require('./runner');
const assert = require('./assert');
const {
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertMatch,
  assertThrows,
  assertRoughlyEqual,
  AssertionError
} = assert;
const { createAppInstance, MemoryStorage, VirtualClock, Document } = require('./env');

describe('Harness Self-Test Suite', () => {

  describe('Assertion Library (assert.js)', () => {
    it('assert() passes with truthy values and throws on falsy values', () => {
      assert(true);
      assert(1);
      assert('hello');
      assert({});
      assert([]);

      let threw = false;
      try { assert(false); } catch (e) { threw = true; assert(e instanceof AssertionError); }
      assert(threw, 'assert(false) must throw');

      threw = false;
      try { assert(0); } catch (e) { threw = true; }
      assert(threw, 'assert(0) must throw');

      threw = false;
      try { assert(''); } catch (e) { threw = true; }
      assert(threw, 'assert("") must throw');
    });

    it('assertEqual() tests strict equality and NaN correctly', () => {
      assertEqual(42, 42);
      assertEqual('abc', 'abc');
      assertEqual(true, true);
      assertEqual(null, null);
      assertEqual(undefined, undefined);
      assertEqual(NaN, NaN);

      let threw = false;
      try { assertEqual(1, 2); } catch (e) { threw = true; assert(e instanceof AssertionError); }
      assert(threw);

      threw = false;
      try { assertEqual('5', 5); } catch (e) { threw = true; }
      assert(threw);
    });

    it('assertNotEqual() ensures values differ', () => {
      assertNotEqual(1, 2);
      assertNotEqual('a', 'b');
      assertNotEqual(true, false);

      let threw = false;
      try { assertNotEqual(42, 42); } catch (e) { threw = true; }
      assert(threw);
    });

    it('assertDeepEqual() recursively validates objects and arrays with clear diffs', () => {
      const obj1 = { id: 1, name: 'Bench', sets: [{ w: 100, r: 5 }] };
      const obj2 = { id: 1, name: 'Bench', sets: [{ w: 100, r: 5 }] };
      assertDeepEqual(obj1, obj2);

      const arr1 = [1, { a: 2 }, [3, 4]];
      const arr2 = [1, { a: 2 }, [3, 4]];
      assertDeepEqual(arr1, arr2);

      // Mismatched property detection
      let threw = false;
      try {
        assertDeepEqual(
          { a: 1, b: { c: 2 } },
          { a: 1, b: { c: 99 } }
        );
      } catch (e) {
        threw = true;
        assert(e.message.includes('b.c'), 'Diff should mention path b.c');
      }
      assert(threw);

      // Missing property detection
      threw = false;
      try {
        assertDeepEqual({ a: 1 }, { a: 1, b: 2 });
      } catch (e) {
        threw = true;
        assert(e.message.includes("Missing property 'b'"), 'Diff should report missing property');
      }
      assert(threw);

      // Array length mismatch detection
      threw = false;
      try {
        assertDeepEqual([1, 2], [1, 2, 3]);
      } catch (e) {
        threw = true;
        assert(e.message.includes('Array length mismatch'), 'Diff should report array length');
      }
      assert(threw);
    });

    it('assertMatch() tests string against RegExp patterns', () => {
      assertMatch('workout-log-v1', /^workout/);
      assertMatch('2026-11-13T12:00:00.000Z', '^\\d{4}-\\d{2}-\\d{2}');

      let threw = false;
      try { assertMatch('steel', /chalk/); } catch (e) { threw = true; }
      assert(threw);
    });

    it('assertThrows() verifies synchronous exceptions and error patterns', () => {
      const caught = assertThrows(() => {
        throw new TypeError('Invalid rest duration');
      }, TypeError);
      assert(caught instanceof TypeError);

      assertThrows(() => {
        throw new Error('Database locked');
      }, /locked/);

      let threw = false;
      try {
        assertThrows(() => { /* does not throw */ });
      } catch (e) {
        threw = true;
        assert(e instanceof AssertionError);
      }
      assert(threw);
    });

    it('assertThrows() verifies asynchronous Promise rejections', async () => {
      const caught = await assertThrows(async () => {
        await new Promise(r => setTimeout(r, 5));
        throw new RangeError('Value out of range [15, 600]');
      }, RangeError);
      assert(caught instanceof RangeError);

      let threw = false;
      try {
        await assertThrows(async () => {
          await new Promise(r => setTimeout(r, 5));
          return 'ok';
        });
      } catch (e) {
        threw = true;
        assert(e instanceof AssertionError);
      }
      assert(threw);
    });

    it('assertRoughlyEqual() tests numeric deltas', () => {
      assertRoughlyEqual(3.14159, 3.14, 0.01);
      assertRoughlyEqual(90.0001, 90.0, 0.001);

      let threw = false;
      try {
        assertRoughlyEqual(10, 15, 1);
      } catch (e) {
        threw = true;
        assert(e instanceof AssertionError);
      }
      assert(threw);
    });

    it('assertDeepEqual() handles circular array references without stack overflow', () => {
      const a = []; a.push(a);
      const b = []; b.push(b);
      assertDeepEqual(a, b);

      const nestedA = [1]; nestedA.push([nestedA]);
      const nestedB = [1]; nestedB.push([nestedB]);
      assertDeepEqual(nestedA, nestedB);

      let threw = false;
      try {
        const c1 = [1]; c1.push(c1);
        const c2 = [2]; c2.push(c2);
        assertDeepEqual(c1, c2);
      } catch (e) {
        threw = true;
        assert(e instanceof AssertionError);
      }
      assert(threw, 'Unequal circular arrays should throw AssertionError');
    });

    it('assertDeepEqual() safely compares invalid dates (new Date(NaN))', () => {
      // Two invalid dates are considered equal
      assertDeepEqual(new Date(NaN), new Date(NaN));

      // Invalid date vs valid date throws formatted AssertionError without throwing RangeError
      let threw = false;
      try {
        assertDeepEqual(new Date('2026-01-01T00:00:00.000Z'), new Date(NaN));
      } catch (e) {
        threw = true;
        assert(e instanceof AssertionError);
        assert(e.message.includes('Invalid Date'), 'Diff should mention Invalid Date');
      }
      assert(threw, 'Valid vs Invalid Date should throw AssertionError');

      threw = false;
      try {
        assertDeepEqual(new Date(NaN), new Date(1000));
      } catch (e) {
        threw = true;
        assert(e instanceof AssertionError);
      }
      assert(threw, 'Invalid vs Valid Date should throw AssertionError');
    });

    it('assertDeepEqual() rejects structural object/array/date type mismatches', () => {
      assertThrows(() => assertDeepEqual([], {}), AssertionError);
      assertThrows(() => assertDeepEqual(new Date(), {}), AssertionError);
      assertThrows(() => assertDeepEqual(/abc/, {}), AssertionError);
    });
  });

  describe('Runner Engine (runner.js) Lifecycle Hooks', () => {
    const lifecycleLog = [];

    beforeAll(() => {
      lifecycleLog.push('beforeAll');
    });

    beforeEach(() => {
      lifecycleLog.push('beforeEach');
    });

    afterEach(() => {
      lifecycleLog.push('afterEach');
    });

    afterAll(() => {
      lifecycleLog.push('afterAll');
      assert(lifecycleLog.includes('testA'));
      assert(lifecycleLog.includes('testB'));
    });

    it('executes test A within lifecycle hooks', () => {
      lifecycleLog.push('testA');
      assertEqual(lifecycleLog[0], 'beforeAll');
      assertEqual(lifecycleLog[1], 'beforeEach');
      assertEqual(lifecycleLog[2], 'testA');
    });

    it('executes test B and guarantees separate beforeEach', () => {
      lifecycleLog.push('testB');
      assertEqual(lifecycleLog[3], 'afterEach');
      assertEqual(lifecycleLog[4], 'beforeEach');
      assertEqual(lifecycleLog[5], 'testB');
    });

    it('supports async test functions with await', async () => {
      const start = Date.now();
      await new Promise(r => setTimeout(r, 15));
      const elapsed = Date.now() - start;
      assert(elapsed >= 10, 'Async wait completed');
    });

    it.skip('skips ignored tests gracefully', () => {
      throw new Error('This test was skipped and should not execute');
    });

    it('it.only runs only targeted test while skipping other tests across suites', async () => {
      const runner = new Runner();
      let aRun = false;
      let bRun = false;
      let cRun = false;
      runner.describe('Suite1', () => {
        runner.it('test A', () => { aRun = true; });
        runner.it('test B', () => { bRun = true; }, { only: true });
      });
      runner.describe('Suite2', () => {
        runner.it('test C', () => { cRun = true; });
      });
      const res = await runner.run();
      assertEqual(aRun, false, 'test A should be skipped');
      assertEqual(bRun, true, 'test B should run');
      assertEqual(cRun, false, 'test C should be skipped');
      assertEqual(res.passed, 1);
      assertEqual(res.skipped, 2);
    });

    it('hanging async promise with timeout properly triggers TimeoutError and records failure', async () => {
      const runner = new Runner();
      let subsequentRan = false;
      runner.describe('WatchdogSuite', () => {
        runner.it('hangs indefinitely', async () => {
          await new Promise(() => {}); // never resolves
        }, 50);
        runner.it('subsequent test runs', () => {
          subsequentRan = true;
        });
      });
      const res = await runner.run();
      assertEqual(res.total, 2);
      assertEqual(res.failed, 1);
      assertEqual(res.passed, 1);
      assertEqual(subsequentRan, true, 'Subsequent test must still run');
      assertEqual(res.failures.length, 1);
      assertEqual(res.failures[0].error.name, 'TimeoutError');
    });

    it('afterAll hook failure records failure in results and failure list', async () => {
      const runner = new Runner();
      runner.describe('AfterAllSuite', () => {
        runner.it('test passes', () => {});
        runner.afterAll(() => {
          throw new Error('Teardown crash in cleanup');
        });
      });
      const res = await runner.run();
      assertEqual(res.failed, 1);
      assertEqual(res.failures.length, 1);
      assertEqual(res.failures[0].testName, 'afterAll');
      assertMatch(res.failures[0].error.message, /afterAll hook failed/);
    });
  });

  describe('MemoryStorage and VirtualClock Unit Tests', () => {
    it('MemoryStorage handles standard methods and property-based proxy access', () => {
      const storage = MemoryStorage.create();
      storage.setItem('key1', 'val1');
      assertEqual(storage.getItem('key1'), 'val1');
      assertEqual(storage.length, 1);

      // Property access
      storage.key2 = 'val2';
      assertEqual(storage.getItem('key2'), 'val2');
      assertEqual(storage['key1'], 'val1');

      delete storage.key1;
      assertEqual(storage.getItem('key1'), null);
      assertEqual(storage.length, 1);

      storage.clear();
      assertEqual(storage.length, 0);
    });

    it('VirtualClock advances intervals deterministically and drift-free', () => {
      const clock = new VirtualClock(1000);
      let ticks = 0;
      clock.setInterval(() => { ticks++; }, 250);

      assertEqual(ticks, 0);
      clock.advanceTimers(500);
      assertEqual(ticks, 2);
      assertEqual(clock.now, 1500);

      clock.advanceTimers(500);
      assertEqual(ticks, 4);
      assertEqual(clock.now, 2000);
    });
  });

  describe('Sandboxed App Lifecycle & Navigation (env.js)', () => {
    let app;

    beforeEach(() => {
      app = createAppInstance();
    });

    afterEach(() => {
      if (app) app.destroy();
    });

    it('boots app cleanly with default state and renders HTML containers', () => {
      assert(app != null);
      assert(app.state != null, 'App state S must be initialized');
      assertEqual(app.state.v, 1, 'Schema version should be 1');
      assert(Array.isArray(app.state.plan), 'Default plan should be array');
      assert(app.state.plan.length > 0, 'Plan should contain days');

      // UI state
      assert(app.ui != null, 'UI state must be initialized');
      assertEqual(app.ui.tab, 'train', 'Initial tab should be train');

      // Containers in DOM
      assert(app.exists('#app'), '#app main container exists');
      assert(app.exists('#tabs'), '#tabs navigation exists');
      assertEqual(app.queryAll('#tabs button').length, 4, 'Should have 4 bottom tabs');
    });

    it('switches tabs and updates active button class and DOM view', () => {
      // 1. Switch to history tab
      app.clickTab('history');
      assertEqual(app.ui.tab, 'history', 'UI tab should now be history');
      const historyBtn = app.query('#tabs button[data-tab="history"]');
      assert(historyBtn.classList.contains('on'), 'History tab button has on class');
      const trainBtn = app.query('#tabs button[data-tab="train"]');
      assert(!trainBtn.classList.contains('on'), 'Train tab button lost on class');

      // 2. Switch to progress tab
      app.clickTab('progress');
      assertEqual(app.ui.tab, 'progress', 'UI tab should now be progress');

      // 3. Switch to more tab
      app.clickTab('more');
      assertEqual(app.ui.tab, 'more', 'UI tab should now be more');

      // 4. Switch back to train tab
      app.clickTab('train');
      assertEqual(app.ui.tab, 'train', 'UI tab returned to train');
    });

    it('starts a planned template workout and verifies active state', () => {
      // Click templates modal button
      app.clickAct('tpls');
      assert(app.exists('#sheet'), 'Templates bottom sheet opened');

      // Select first template
      const openTplBtn = app.query('[data-act="tpl-open"]');
      assert(openTplBtn != null, 'Template item exists');
      openTplBtn.click();
      assert(app.ui.tpl.sel != null, 'Template selection updated in UI');

      // Start template workout
      app.clickAct('tpl-start');
      assert(app.state.active != null, 'Workout is now active in state');
      assert(app.state.active.entries.length > 0, 'Active workout has exercise entries');
    });

    it('fills weight/reps, marks set done, and triggers rest timer', () => {
      // Start template workout
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"]');
      app.clickAct('tpl-start');

      // Verify weight input exists
      const wInput = app.query('input[data-k="w"]');
      assert(wInput != null, 'Weight input exists in workout card');

      // Fill weight input
      app.fill(wInput, '85.5');
      assertEqual(app.state.active.entries[0].sets[0].w, 85.5, 'State updated with new weight');

      // Mark set done
      app.clickAct('done');
      assertEqual(app.state.active.entries[0].sets[0].done, true, 'Set marked done');

      // Rest bar is activated
      assert(app.state.active.rest != null, 'Rest timer active in state');
      const restEl = app.query('#rest');
      assert(restEl != null, 'Rest element exists');
      assert(!restEl.classList.contains('hidden'), 'Rest bar is visible');
    });

    it('advances rest countdown with deterministic VirtualClock and cues completion', () => {
      // Start workout and complete set
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"]');
      app.clickAct('tpl-start');
      app.clickAct('done');

      // Advance timers by 10 seconds
      const initialText = app.text('#restText');
      assertMatch(initialText, /^Отдых \d+:\d+/);

      app.advanceTimers(10000);
      const midText = app.text('#restText');
      assertNotEqual(initialText, midText, 'Rest countdown advanced');

      // Advance past remaining rest time (default 90s)
      app.advanceTimers(90000);
      const finalText = app.text('#restText');
      assertEqual(finalText, 'Подход!', 'Rest finished with cue text');
      assert(app.mocks.haptics.wasVibrated(500), 'Haptics cue triggered at rest finish');
    });

    it('verifies Capacitor mock native platform toggle and spies', async () => {
      assertEqual(app.mocks.capacitor.isNativePlatform(), false, 'Default is web platform');
      app.mocks.capacitor.setNative(true);
      assertEqual(app.mocks.capacitor.isNativePlatform(), true, 'Toggled to native platform');

      await app.mocks.haptics.vibrate({ duration: 500 });
      assert(app.mocks.haptics.wasVibrated(500), 'MockHaptics recorded call');

      await app.mocks.filesystem.writeFile({ path: 'backup.json', data: '{"test":1}' });
      const readBack = await app.mocks.filesystem.readFile({ path: 'backup.json' });
      assertEqual(readBack.data, '{"test":1}', 'MockFilesystem saved and returned file');
    });

    it('DOM Element.value correctly returns attribute value from HTML template and supports textarea/select', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      div.innerHTML = '<input id="exW" value="10"><textarea id="notes">Great workout</textarea><select id="grp"><option value="chest">Chest</option><option value="back" selected>Back</option></select>';
      
      const input = div.querySelector('#exW');
      assertEqual(input.value, '10', 'Input value must evaluate to attribute value 10');
      
      // Update value programmatically
      input.value = '25';
      assertEqual(input.value, '25', 'Input value updates on set');
      
      // Clear value programmatically
      input.value = '';
      assertEqual(input.value, '', 'Input value can be cleared without falling back to attribute');

      const textarea = div.querySelector('#notes');
      assertEqual(textarea.value, 'Great workout', 'Textarea value resolves from text content');

      const select = div.querySelector('#grp');
      assertEqual(select.value, 'back', 'Select value resolves from selected option');
    });

    it('DOM Element checked and disabled attributes correctly synchronize with properties', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      div.innerHTML = '<input type="checkbox" id="bw" checked disabled><input type="checkbox" id="active">';

      const bw = div.querySelector('#bw');
      assertEqual(bw.checked, true, 'bw.checked is true when checked attribute present');
      assertEqual(bw.disabled, true, 'bw.disabled is true when disabled attribute present');

      // Test mutation sync from property to attribute
      bw.checked = false;
      assertEqual(bw.checked, false);
      assertEqual(bw.hasAttribute('checked'), false);

      bw.disabled = false;
      assertEqual(bw.disabled, false);
      assertEqual(bw.hasAttribute('disabled'), false);

      const active = div.querySelector('#active');
      assertEqual(active.checked, false);
      assertEqual(active.disabled, false);

      active.setAttribute('checked', '');
      assertEqual(active.checked, true);

      active.removeAttribute('checked');
      assertEqual(active.checked, false);
    });

    it('workout template initialization renders input values correctly without shadowing', () => {
      // Start template workout
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"]');
      app.clickAct('tpl-start');

      // Weight input rendered from template HTML must have value '10'
      const wVal = app.val('input[data-k="w"]');
      assertEqual(wVal, '10', 'Initial template weight input value evaluates to 10');
    });
  });

});

if (require.main === module) {
  const { defaultRunner } = require('./runner');
  defaultRunner.run({ verbose: true }).then(results => {
    if (results.failed > 0) process.exit(1);
    else process.exit(0);
  });
}

