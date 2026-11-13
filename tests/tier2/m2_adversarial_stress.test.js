'use strict';
/**
 * Milestone 2 (Core Logic & Invariants) Adversarial Stress & Verification Suite
 * Exhaustively stress-tests:
 * 1. Gravitron mode toggle, bwMode edge cases (a=0, w=0), history editing, finishSession persistence
 * 2. Rest timer boundaries (<15, >600, negative, NaN, 0), Enter key blur, saverest, cleanData
 * 3. Import with active timer (past, NaN, future, scheduleRestNotice)
 * 4. Screen Wake Lock race conditions (rapid calls, pending session cancel, rejection)
 * 5. Elapsed timer CPU/interval leaks (tab change, visibility, finish, discard, summary view)
 * 6. Export ObjectURL revocation and memory leak prevention
 * 7. Superset alignment, execution order done checks, orphaned cleanup
 * 8. Temporal constraints (hdate ISO sync, future date rejection and filtering)
 * 9. Validation of newly added workout programs (5x5, Arnold, Calisthenics, Bro-split)
 */
const vm = require('vm');
const { describe, it, test, beforeEach, afterEach } = require('../harness/runner');
const assert = require('../harness/assert');
const {
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertMatch
} = assert;
const { createAppInstance } = require('../harness/env');

describe('Milestone 2 Adversarial Stress & Verification Suite', () => {

  // Helper to read top-level VM variables (let/const)
  const getVm = (app, varName) => vm.runInContext(varName, app.context);

  // =========================================================================
  // 1. GRAVITRON MODE TOGGLE & PERSISTENCE UNDER STRESS
  // =========================================================================
  describe('1. Gravitron Mode Toggle & Invariant Persistence', () => {
    it('1.1 toggles correctly when a=0 and w=0 in history session (bwMode invariant)', () => {
      const app = createAppInstance({
        initialData: {
          sessions: [{
            id: 'sess-bw-1',
            dayId: 'free',
            d: '2026-11-10',
            start: '2026-11-10T10:00:00.000Z',
            end: '2026-11-10T11:00:00.000Z',
            entries: [{
              exId: 'pullup', // bw: true
              sets: [{ w: 0, a: 0, r: 8 }] // no m explicitly defined initially
            }]
          }]
        }
      });

      const s = app.state.sessions[0];
      const set0 = s.entries[0].sets[0];

      // Initially, when a=0, w=0 and no m, bwMode defaults to 'w'
      assertEqual(set0.w, 0);
      assertEqual(set0.a, 0);
      assertEqual(app.context.window.bwMode(set0), 'w');

      // Navigate to history detail view
      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-bw-1' });

      // Click hbw button to flip mode
      app.clickAct('hbw', { id: 'sess-bw-1', e: '0', s: '0' });

      // Invariant: set0.m must now be 'a', a=0, w=0
      assertEqual(set0.m, 'a');
      assertEqual(set0.a, 0);
      assertEqual(set0.w, 0);
      assertEqual(app.context.window.bwMode(set0), 'a');

      // Click hbw button again to flip back
      app.clickAct('hbw', { id: 'sess-bw-1', e: '0', s: '0' });

      // Invariant: set0.m must now be 'w', w=0, a=0
      assertEqual(set0.m, 'w');
      assertEqual(set0.w, 0);
      assertEqual(set0.a, 0);
      assertEqual(app.context.window.bwMode(set0), 'w');

      // Stress test: toggle 20 times in rapid succession
      for (let i = 0; i < 20; i++) {
        const expectedMode = (i % 2 === 0) ? 'a' : 'w';
        app.clickAct('hbw', { id: 'sess-bw-1', e: '0', s: '0' });
        assertEqual(set0.m, expectedMode, `Iteration ${i} failed mode invariant`);
        assertEqual(app.context.window.bwMode(set0), expectedMode);
        assertEqual(set0.a, 0);
        assertEqual(set0.w, 0);
      }
      app.destroy();
    });

    it('1.2 edits history sets via data-hs input with proper mode synchronization and bounds', () => {
      const app = createAppInstance({
        initialData: {
          sessions: [{
            id: 'sess-bw-edit',
            dayId: 'free',
            d: '2026-11-10',
            start: '2026-11-10T10:00:00.000Z',
            end: '2026-11-10T11:00:00.000Z',
            entries: [{
              exId: 'pullup',
              sets: [{ w: 0, a: 0, m: 'w', r: 8 }]
            }]
          }]
        }
      });

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-bw-edit' });

      const set0 = app.state.sessions[0].entries[0].sets[0];

      // Enter added weight
      const inputW = app.query('input[data-hs="w"]');
      assert(inputW, 'Input data-hs="w" must exist for added weight mode');
      inputW.value = '17.5';
      inputW.dispatchEvent({ type: 'input', target: inputW });

      assertEqual(set0.w, 17.5);
      assertEqual(set0.a, 0);
      assertEqual(set0.m, 'w');

      // Switch to assist mode
      app.clickAct('hbw', { id: 'sess-bw-edit', e: '0', s: '0' });
      assertEqual(set0.m, 'a');

      // Assist input should now be rendered
      const inputA = app.query('input[data-hs="a"]');
      assert(inputA, 'Input data-hs="a" must exist for assist mode');

      // Test negative input clamping
      inputA.value = '-25';
      inputA.dispatchEvent({ type: 'input', target: inputA });
      assertEqual(set0.a, 0, 'Negative assist must clamp to 0');
      assertEqual(set0.m, 'a');

      // Test extreme high input clamping (max 2000)
      inputA.value = '5000';
      inputA.dispatchEvent({ type: 'input', target: inputA });
      assertEqual(set0.a, 2000, 'Extreme assist must clamp to 2000');

      // Test reps input clamping (0 to 999)
      const inputR = app.query('input[data-hs="r"]');
      inputR.value = '1500';
      inputR.dispatchEvent({ type: 'input', target: inputR });
      assertEqual(set0.r, 999, 'Reps must clamp to 999');

      inputR.value = '-5';
      inputR.dispatchEvent({ type: 'input', target: inputR });
      assertEqual(set0.r, 0, 'Negative reps must clamp to 0');

      app.destroy();
    });

    it('1.3 persists set.m through finishSession, cleanSet, serialization, and cleanData reload', () => {
      const app = createAppInstance();

      // Start a workout
      app.context.window.startSession('A');

      // Find the pullup exercise (entry 1 in Day A)
      const active = app.state.active;
      const pullupEntryIdx = active.entries.findIndex(e => e.exId === 'pullup');
      assert(pullupEntryIdx >= 0, 'Day A must include pullup');

      const entry = active.entries[pullupEntryIdx];

      // Set 0: Assist mode with 0 kg assist
      entry.sets[0].m = 'a';
      entry.sets[0].a = 0;
      entry.sets[0].w = 0;
      entry.sets[0].r = 8;
      entry.sets[0].done = true;

      // Set 1: Added weight mode with 0 kg added
      entry.sets[1].m = 'w';
      entry.sets[1].w = 0;
      entry.sets[1].a = 0;
      entry.sets[1].r = 10;
      entry.sets[1].done = true;

      // Set 2: Assist mode with 15 kg assist
      entry.sets[2].m = 'a';
      entry.sets[2].a = 15;
      entry.sets[2].w = 0;
      entry.sets[2].r = 6;
      entry.sets[2].done = true;

      // Mark first exercise (incdb) set 0 done so finishSession passes
      active.entries[0].sets[0].done = true;
      active.entries[0].sets[0].r = 12;

      // Complete session
      app.setConfirm(true);
      app.context.window.finishSession();

      // Invariant: Session should be in S.sessions and pullup sets must preserve `m`
      const savedSess = app.state.sessions[app.state.sessions.length - 1];
      const savedPullups = savedSess.entries.find(e => e.exId === 'pullup');
      assert(savedPullups, 'Saved session must contain pullup');

      assertEqual(savedPullups.sets[0].m, 'a');
      assertEqual(savedPullups.sets[0].a, 0);
      assertEqual(savedPullups.sets[0].w, 0);

      assertEqual(savedPullups.sets[1].m, 'w');
      assertEqual(savedPullups.sets[1].w, 0);
      assertEqual(savedPullups.sets[1].a, 0);

      assertEqual(savedPullups.sets[2].m, 'a');
      assertEqual(savedPullups.sets[2].a, 15);

      // Now verify persistence across storage reload
      const exportedJson = JSON.stringify(app.state);
      app.destroy();

      const reloadedApp = createAppInstance({ initialData: exportedJson });
      const reloadedSess = reloadedApp.state.sessions[reloadedApp.state.sessions.length - 1];
      const reloadedPullups = reloadedSess.entries.find(e => e.exId === 'pullup');

      assertEqual(reloadedPullups.sets[0].m, 'a');
      assertEqual(reloadedPullups.sets[0].a, 0);
      assertEqual(reloadedPullups.sets[0].w, 0);
      assertEqual(reloadedApp.context.window.bwMode(reloadedPullups.sets[0]), 'a');

      assertEqual(reloadedPullups.sets[1].m, 'w');
      assertEqual(reloadedPullups.sets[1].w, 0);
      assertEqual(reloadedPullups.sets[1].a, 0);
      assertEqual(reloadedApp.context.window.bwMode(reloadedPullups.sets[1]), 'w');

      reloadedApp.destroy();
    });
  });

  // =========================================================================
  // 2. REST TIMER BOUNDARIES & SANITIZATION UNDER STRESS
  // =========================================================================
  describe('2. Rest Timer Boundaries & Sanitization', () => {
    it('2.1 clamps extreme values on #restIn change event and synchronizes DOM value', () => {
      const app = createAppInstance();
      app.clickTab('more');

      const restInput = app.query('#restIn');
      assert(restInput, '#restIn must exist on settings tab');

      // Case A: Below minimum (< 15)
      restInput.value = '10';
      restInput.dispatchEvent({ type: 'change', target: restInput });
      assertEqual(app.state.settings.rest, 15, '10s must be clamped to 15s');
      assertEqual(restInput.value, '15', 'Input value must be synchronized to 15');

      // Case B: Negative value
      restInput.value = '-50';
      restInput.dispatchEvent({ type: 'change', target: restInput });
      assertEqual(app.state.settings.rest, 15, '-50s must be clamped to 15s');
      assertEqual(restInput.value, '15');

      // Case C: Above maximum (> 600)
      restInput.value = '601';
      restInput.dispatchEvent({ type: 'change', target: restInput });
      assertEqual(app.state.settings.rest, 600, '601s must be clamped to 600s');
      assertEqual(restInput.value, '600', 'Input value must be synchronized to 600');

      restInput.value = '99999';
      restInput.dispatchEvent({ type: 'change', target: restInput });
      assertEqual(app.state.settings.rest, 600, 'Extreme high must be clamped to 600s');
      assertEqual(restInput.value, '600');

      // Case D: Zero, empty, or NaN string
      restInput.value = '0';
      restInput.dispatchEvent({ type: 'change', target: restInput });
      assertEqual(app.state.settings.rest, 90, '0 should fallback to default 90s');
      assertEqual(restInput.value, '90');

      restInput.value = 'not_a_number';
      restInput.dispatchEvent({ type: 'change', target: restInput });
      assertEqual(app.state.settings.rest, 90, 'Invalid string should fallback to 90s');
      assertEqual(restInput.value, '90');

      // Case E: Valid values
      restInput.value = '120';
      restInput.dispatchEvent({ type: 'change', target: restInput });
      assertEqual(app.state.settings.rest, 120);
      assertEqual(restInput.value, '120');

      app.destroy();
    });

    it('2.2 triggers blur and saves on Enter key press in #restIn', () => {
      const app = createAppInstance();
      app.clickTab('more');

      const restInput = app.query('#restIn');
      restInput.value = '180';

      let blurred = false;
      restInput.blur = () => {
        blurred = true;
        // Native blur causes change event
        restInput.dispatchEvent({ type: 'change', target: restInput });
      };

      app.document.dispatchEvent({
        type: 'keydown',
        key: 'Enter',
        target: restInput
      });

      assert(blurred, 'Enter key must trigger blur() on #restIn');
      assertEqual(app.state.settings.rest, 180, 'Rest setting must be saved to 180');
      app.destroy();
    });

    it('2.3 clamps and synchronizes via saverest action button', () => {
      const app = createAppInstance();
      app.clickTab('more');

      const restInput = app.query('#restIn');
      restInput.value = '5'; // invalid (< 15)

      app.clickAct('saverest');

      assertEqual(app.state.settings.rest, 15, 'saverest must clamp to 15s');
      assertEqual(restInput.value, '15', 'saverest must update input.value');

      restInput.value = '1500'; // invalid (> 600)
      app.clickAct('saverest');
      assertEqual(app.state.settings.rest, 600, 'saverest must clamp to 600s');
      assertEqual(restInput.value, '600');

      app.destroy();
    });

    it('2.4 cleanData rigorously enforces [15, 600] boundaries on settings.rest, ssRest, and ex.rest', () => {
      const app = createAppInstance();
      const cleanData = app.context.window.cleanData;

      // Settings rest
      assertEqual(cleanData({ settings: { rest: 5 } }).settings.rest, 15);
      assertEqual(cleanData({ settings: { rest: 14 } }).settings.rest, 15);
      assertEqual(cleanData({ settings: { rest: 601 } }).settings.rest, 600);
      assertEqual(cleanData({ settings: { rest: -10 } }).settings.rest, 15);
      assertEqual(cleanData({ settings: { rest: NaN } }).settings.rest, 90);
      assertEqual(cleanData({ settings: { rest: 'abc' } }).settings.rest, 90);

      // Superset rest
      const ssClean = cleanData({
        settings: {
          ssRest: {
            'bench+fly': 10,
            'squat+press': 800,
            'curl+skull': 45
          }
        }
      });
      assertEqual(ssClean.settings.ssRest['bench+fly'], 15);
      assertEqual(ssClean.settings.ssRest['squat+press'], 600);
      assertEqual(ssClean.settings.ssRest['curl+skull'], 45);

      // Exercise rest
      const exClean = cleanData({
        ex: {
          myex: { name: 'My Exercise', g: 'Грудь', rest: 8 }
        }
      });
      assertEqual(exClean.ex.myex.rest, 15);

      app.destroy();
    });
  });

  // =========================================================================
  // 3. IMPORT WITH ACTIVE TIMER & NOTIFICATIONS
  // =========================================================================
  describe('3. Import with Active Rest Timer', () => {
    it('3.1 discards active rest timer when r.end is in the past', async () => {
      const now = 1700000000000;
      const app = createAppInstance({ initialNow: now });

      const pastBackup = {
        v: 1,
        plan: app.state.plan,
        sessions: [],
        body: [{ d: '2026-11-10', kg: 75 }],
        settings: { rest: 90 },
        ex: app.state.ex,
        active: {
          id: 'act-1',
          dayId: 'free',
          name: 'Active Session',
          d: '2026-11-12',
          start: new Date(now - 3600000).toISOString(),
          entries: [{
            exId: 'benchbb',
            sets: [{ w: 60, r: 10, done: true, t: now - 10000 }]
          }],
          rest: {
            end: now - 5000, // 5 seconds in the past!
            total: 90
          }
        }
      };

      const file = {
        name: 'backup.json',
        _text: JSON.stringify(pastBackup)
      };

      app.setConfirm(true);
      app.context.window.doImport(file);
      await app.flush();

      // Invariant: Since rest.end <= Date.now(), resumeRest must delete rest state
      assert(!app.state.active.rest, 'Active rest timer in the past must be deleted');
      const restEl = app.query('#rest');
      assert(restEl.classList.contains('hidden'), 'Rest bar must remain hidden');
      assertEqual(app.mocks.localNotifications.scheduled.length, 0, 'No notification should be scheduled');

      app.destroy();
    });

    it('3.2 discards active rest timer when r.end is invalid or NaN', async () => {
      const now = 1700000000000;
      const app = createAppInstance({ initialNow: now });

      const invalidRestBackup = {
        v: 1,
        plan: app.state.plan,
        sessions: [],
        body: [{ d: '2026-11-10', kg: 75 }],
        settings: { rest: 90 },
        ex: app.state.ex,
        active: {
          id: 'act-2',
          dayId: 'free',
          name: 'Active Session',
          d: '2026-11-12',
          start: new Date(now - 1000).toISOString(),
          entries: [{
            exId: 'benchbb',
            sets: [{ w: 60, r: 10, done: true }]
          }],
          rest: {
            end: 'not-a-timestamp',
            total: 90
          }
        }
      };

      app.setConfirm(true);
      app.context.window.doImport({ name: 'test.json', _text: JSON.stringify(invalidRestBackup) });
      await app.flush();

      assert(!app.state.active.rest, 'Non-finite rest.end must be pruned');
      app.destroy();
    });

    it('3.3 correctly resumes active rest timer and schedules notification when r.end is in future', async () => {
      const now = 1700000000000;
      const app = createAppInstance({ initialNow: now, isNative: true });

      const futureEnd = now + 45000; // 45 seconds in the future
      const validBackup = {
        v: 1,
        plan: app.state.plan,
        sessions: [],
        body: [{ d: '2026-11-10', kg: 75 }],
        settings: { rest: 90 },
        ex: app.state.ex,
        active: {
          id: 'act-3',
          dayId: 'free',
          name: 'Active Workout',
          d: '2026-11-12',
          start: new Date(now - 120000).toISOString(),
          entries: [{
            exId: 'benchbb',
            sets: [{ w: 80, r: 8, done: true }]
          }],
          rest: {
            end: futureEnd,
            total: 90
          }
        }
      };

      app.setConfirm(true);
      app.context.window.doImport({ name: 'valid.json', _text: JSON.stringify(validBackup) });
      await app.flush();

      // Invariant: rest is active
      assert(app.state.active.rest, 'Active rest timer must be preserved');
      assertEqual(app.state.active.rest.end, futureEnd);

      // Invariant: Rest bar is shown and resting pad applied
      const restEl = app.query('#rest');
      assert(!restEl.classList.contains('hidden'), 'Rest bar must be visible');
      assert(app.document.body.classList.contains('resting'), 'body must have resting class');

      // Invariant: scheduleRestNotice must schedule LocalNotification with id 1001
      const notif = app.mocks.localNotifications.getScheduled(1001);
      assert(notif, 'Local notification for rest end must be scheduled');
      assertEqual(new Date(notif.schedule.at).getTime(), futureEnd);

      app.destroy();
    });
  });

  // =========================================================================
  // 4. SCREEN WAKE LOCK RACE CONDITION UNDER STRESS
  // =========================================================================
  describe('4. Screen Wake Lock Race Conditions', () => {
    it('4.1 survives rapid calls to keepAwake without multiple concurrent requests', async () => {
      const app = createAppInstance();

      let requestCount = 0;
      const originalRequest = app.mocks.wakeLock.request.bind(app.mocks.wakeLock);
      app.mocks.wakeLock.request = async (type) => {
        requestCount++;
        return originalRequest(type);
      };

      // Start session
      app.context.window.startSession('A');

      // Rapidly fire keepAwake 30 times
      for (let i = 0; i < 30; i++) {
        app.context.window.keepAwake();
      }

      await app.flush();

      // Only 1 request should have been made because wakeLockReq guarded re-entry
      assertEqual(requestCount, 1, 'keepAwake must guard against concurrent request calls');
      assert(app.mocks.wakeLock.isActive(), 'WakeLock sentinel should be active');

      app.destroy();
    });

    it('4.2 releases sentinel immediately if workout ends while request promise is pending', async () => {
      const app = createAppInstance();

      let resolvePromise = null;
      let mockSentinel = null;

      // Replace request with a controlled deferred promise
      app.mocks.wakeLock.request = () => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      };

      // Start active workout
      app.context.window.startSession('A');

      assert(resolvePromise !== null, 'wakeLock.request should have been initiated');

      // While promise is still pending, athlete discards the workout!
      app.setConfirm(true);
      app.clickAct('discard');
      assertEqual(app.state.active, null, 'Workout was discarded');

      // Now the async wakeLock request resolves with the sentinel
      let sentinelReleased = false;
      mockSentinel = {
        released: false,
        release: async () => {
          sentinelReleased = true;
          mockSentinel.released = true;
        },
        addEventListener: () => {}
      };

      resolvePromise(mockSentinel);
      await app.flush();

      // INVARIANT: In keepAwake().then(), stillWant must be false, immediately calling l.release()
      assert(sentinelReleased, 'Sentinel MUST be released immediately if workout ended during resolution');
      assertEqual(getVm(app, 'wakeLock'), null, 'Global wakeLock variable must remain null');

      app.destroy();
    });

    it('4.3 gracefully handles wakeLock.request rejections without unhandled exceptions', async () => {
      const app = createAppInstance();
      app.mocks.wakeLock.simulateReject = true;

      // Start workout - should not throw even though request rejects
      app.context.window.startSession('A');

      await app.flush();

      // State is active, wakeLock is null
      assert(app.state.active !== null);
      assertEqual(getVm(app, 'wakeLock'), null);

      // Now recovery: unblock wakeLock, trigger keepAwake
      app.mocks.wakeLock.simulateReject = false;
      app.context.window.keepAwake();
      await app.flush();

      assert(app.mocks.wakeLock.isActive(), 'WakeLock should acquire normally after prior rejection');
      app.destroy();
    });

    it('4.4 releases wakeLock when user disables awake setting', async () => {
      const app = createAppInstance();
      app.context.window.startSession('A');
      await app.flush();

      assert(app.mocks.wakeLock.isActive(), 'WakeLock should be active');

      // Toggle awake setting off
      app.clickTab('more');
      app.clickAct('awake');
      assertEqual(app.state.settings.awake, false);

      // Sentinel must be released
      assert(!app.mocks.wakeLock.isActive(), 'WakeLock should be released when awake setting disabled');

      app.destroy();
    });
  });

  // =========================================================================
  // 5. ELAPSED TIMER CPU & INTERVAL LEAKS
  // =========================================================================
  describe('5. Elapsed Timer CPU & Memory Leak Protection', () => {
    it('5.1 syncElapsed only ticks when active workout is on visible train tab', () => {
      const app = createAppInstance();

      // No active workout
      assertEqual(getVm(app, 'elapsedTimer'), null, 'No timer without active workout');

      // Start workout
      app.context.window.startSession('A');
      assertNotEqual(getVm(app, 'elapsedTimer'), null, 'Timer must tick on active train tab');

      // Switch to History tab
      app.clickTab('history');
      assertEqual(getVm(app, 'elapsedTimer'), null, 'Timer must be stopped on history tab');

      // Switch to Progress tab
      app.clickTab('progress');
      assertEqual(getVm(app, 'elapsedTimer'), null, 'Timer must be stopped on progress tab');

      // Switch to More tab
      app.clickTab('more');
      assertEqual(getVm(app, 'elapsedTimer'), null, 'Timer must be stopped on more tab');

      // Switch back to Train tab
      app.clickTab('train');
      assertNotEqual(getVm(app, 'elapsedTimer'), null, 'Timer must resume on train tab');

      // Minimize app / switch tab (hidden visibility)
      app.triggerVisibilityChange('hidden');
      assertEqual(getVm(app, 'elapsedTimer'), null, 'Timer must be stopped when visibility is hidden');

      // Restore visibility
      app.triggerVisibilityChange('visible');
      assertNotEqual(getVm(app, 'elapsedTimer'), null, 'Timer must resume when visibility returns');

      app.destroy();
    });

    it('5.2 cleans up interval on finish and discard', () => {
      const app = createAppInstance();
      app.context.window.startSession('A');
      assertNotEqual(getVm(app, 'elapsedTimer'), null);

      // Discard workout
      app.setConfirm(true);
      app.clickAct('discard');
      assertEqual(getVm(app, 'elapsedTimer'), null, 'Discard must clean up interval');

      // Start another workout
      app.context.window.startSession('A');
      assertNotEqual(getVm(app, 'elapsedTimer'), null);

      // Mark set done and finish
      app.state.active.entries[0].sets[0].done = true;
      app.state.active.entries[0].sets[0].r = 10;
      app.setConfirm(true);
      app.context.window.finishSession();

      assertEqual(getVm(app, 'elapsedTimer'), null, 'Finish must clean up interval');

      app.destroy();
    });
  });

  // =========================================================================
  // 6. EXPORT MEMORY LEAK (revokeObjectURL)
  // =========================================================================
  describe('6. Export ObjectURL Memory Leak Protection', () => {
    it('6.1 creates ObjectURL and revokes it after 1500ms timeout', () => {
      const app = createAppInstance({ isNative: false });
      app.clickTab('more');

      assertEqual(app.mocks.urlRegistry.activeCount, 0);

      // Trigger export
      app.clickAct('export');

      // Invariant: Blob URL was created and is currently active
      assertEqual(app.mocks.urlRegistry.activeCount, 1);
      assert(app.mocks.urlRegistry.hasLeaks());

      // Advance clock by 1000ms (timer is 1500ms)
      app.advanceTimers(1000);
      assertEqual(app.mocks.urlRegistry.activeCount, 1, 'URL must still be active at 1000ms');

      // Advance clock past 1500ms (501ms more)
      app.advanceTimers(501);
      assertEqual(app.mocks.urlRegistry.activeCount, 0, 'URL must be revoked after 1500ms');
      assert(!app.mocks.urlRegistry.hasLeaks(), 'No blob URL leak permitted');

      app.destroy();
    });

    it('6.2 cleanly revokes multiple consecutive exports without leaks', () => {
      const app = createAppInstance({ isNative: false });
      app.clickTab('more');

      for (let i = 0; i < 5; i++) {
        app.clickAct('export');
      }

      assertEqual(app.mocks.urlRegistry.activeCount, 5);

      app.advanceTimers(2000);
      assertEqual(app.mocks.urlRegistry.activeCount, 0, 'All 5 URLs must be revoked');
      assert(!app.mocks.urlRegistry.hasLeaks());

      app.destroy();
    });
  });

  // =========================================================================
  // 7. SUPERSET ALIGNMENT, ROUND COMPLETION & ORPHAN CLEANUP
  // =========================================================================
  describe('7. Superset Mechanics & Invariants', () => {
    it('7.1 aligns set counts to maxSets when linking superset (sslink)', () => {
      const app = createAppInstance();
      app.context.window.startSession('A');

      const active = app.state.active;
      // Exercise 0 has 4 sets, Exercise 1 has 4 sets. Let's make Ex 1 have 2 sets and Ex 0 have 5 sets
      active.entries[0].sets = [
        { w: 10, r: 10, done: false },
        { w: 10, r: 10, done: false },
        { w: 10, r: 10, done: false },
        { w: 10, r: 10, done: false },
        { w: 10, r: 10, done: false }
      ];
      active.entries[1].sets = [
        { w: 0, a: 0, r: 8, done: false },
        { w: 0, a: 0, r: 8, done: false }
      ];

      // Open card 1 so sslink button is rendered
      app.clickAct('open', { e: '1' });

      // Link entry 1 with entry 0
      app.clickAct('sslink', { e: '1' });

      // Invariant: Both entries must have 5 sets
      assertEqual(active.entries[0].sets.length, 5);
      assertEqual(active.entries[1].sets.length, 5);
      assert(active.entries[0].ss);
      assertEqual(active.entries[0].ss, active.entries[1].ss);

      app.destroy();
    });

    it('7.2 only triggers rest countdown when all exercises in superset have finished round', () => {
      const app = createAppInstance();
      app.context.window.startSession('A');

      const active = app.state.active;
      // Open card 1 and link entry 0 and entry 1 into a superset
      app.clickAct('open', { e: '1' });
      app.clickAct('sslink', { e: '1' });

      // Check rest timer is not running
      assert(!active.rest);

      // Mark set 0 of second exercise (entry 1) done first!
      app.clickAct('done', { e: '1', s: '0' });

      // INVARIANT: Since entry 0 set 0 is NOT done, rest timer MUST NOT start!
      assert(!active.rest, 'Rest timer must NOT start when first exercise of superset round is incomplete');
      assert(app.query('#rest').classList.contains('hidden'));

      // Now mark set 0 of first exercise (entry 0) done!
      app.clickAct('done', { e: '0', s: '0' });

      // INVARIANT: Now both exercises in round 0 are done -> rest timer starts!
      assert(active.rest, 'Rest timer MUST start when all exercises in superset round are done');
      assert(!app.query('#rest').classList.contains('hidden'));

      app.destroy();
    });

    it('7.3 cleans up orphaned superset identifier when exercise is removed (skipex)', () => {
      const app = createAppInstance();
      app.context.window.startSession('A');

      const active = app.state.active;
      // Open card 1 and link entry 0 and entry 1
      app.clickAct('open', { e: '1' });
      app.clickAct('sslink', { e: '1' });
      assert(active.entries[0].ss && active.entries[1].ss);

      // In the open superset block, remove entry 0 (skipex)
      app.setConfirm(true);
      app.clickAct('skipex', { e: '0' });

      // Invariant: Remaining exercise should no longer have .ss property because group size < 2
      assert(!active.entries[0].ss, 'Orphaned superset tag must be pruned by fixSS');

      app.destroy();
    });

    it('7.4 guards against deleting last remaining bodyweight record (delbody)', () => {
      const app = createAppInstance({
        initialData: {
          body: [{ d: '2026-11-10', kg: 72 }]
        }
      });
      app.clickTab('progress');

      assertEqual(app.state.body.length, 1);

      app.setConfirm(true);
      app.clickAct('delbody', { d: '2026-11-10' });

      // Invariant: Single body weight entry cannot be deleted
      assertEqual(app.state.body.length, 1, 'delbody must guard minimum 1 entry');
      assertEqual(app.state.body[0].kg, 72);

      app.destroy();
    });
  });

  // =========================================================================
  // 8. TEMPORAL INVARIANTS & FUTURE DATE GUARDS
  // =========================================================================
  describe('8. History Date Synchronization & Temporal Guards', () => {
    it('8.1 hdate rejects future dates with toast and preserves current date', () => {
      const app = createAppInstance({
        initialData: {
          sessions: [{
            id: 'sess-date-1',
            dayId: 'free',
            d: '2026-11-10',
            start: '2026-11-10T10:00:00.000Z',
            end: '2026-11-10T11:00:00.000Z',
            entries: [{ exId: 'squat', sets: [{ w: 100, r: 5 }] }]
          }]
        }
      });

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-date-1' });

      const dateInput = app.query('input[data-act-change="hdate"]');
      assert(dateInput);

      // Attempt to set date in the far future (2099-01-01)
      dateInput.value = '2099-01-01';
      dateInput.dispatchEvent({ type: 'change', target: dateInput });

      // Invariant: Rejection
      assertEqual(app.state.sessions[0].d, '2026-11-10', 'Future date must be rejected');
      assertEqual(dateInput.value, '2026-11-10');

      app.destroy();
    });

    it('8.2 hdate synchronizes s.d, s.start, and s.end ISO strings while keeping duration', () => {
      const app = createAppInstance({
        initialData: {
          sessions: [{
            id: 'sess-date-2',
            dayId: 'free',
            d: '2026-11-10',
            start: '2026-11-10T14:30:00.000Z',
            end: '2026-11-10T15:45:00.000Z', // 75 minutes duration
            entries: [{ exId: 'squat', sets: [{ w: 100, r: 5 }] }]
          }]
        }
      });

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-date-2' });

      const dateInput = app.query('input[data-act-change="hdate"]');
      dateInput.value = '2026-11-05';
      dateInput.dispatchEvent({ type: 'change', target: dateInput });

      const sess = app.state.sessions[0];
      assertEqual(sess.d, '2026-11-05');
      assertEqual(sess.start, '2026-11-05T14:30:00.000Z');
      assertEqual(sess.end, '2026-11-05T15:45:00.000Z');

      // Verify duration (75 min) preserved
      const durMs = new Date(sess.end) - new Date(sess.start);
      assertEqual(durMs, 75 * 60 * 1000);

      app.destroy();
    });

    it('8.3 filters future dates in weekInfo, vTrain, and vProgress', () => {
      const app = createAppInstance({
        initialData: {
          sessions: [
            {
              id: 'sess-past',
              dayId: 'free',
              d: '2026-11-10',
              start: '2026-11-10T10:00:00.000Z',
              end: '2026-11-10T11:00:00.000Z',
              entries: [{ exId: 'squat', sets: [{ w: 100, r: 5 }] }]
            },
            {
              id: 'sess-future',
              dayId: 'free',
              d: '2099-12-01', // Future session!
              start: '2099-12-01T10:00:00.000Z',
              end: '2099-12-01T11:00:00.000Z',
              entries: [{ exId: 'squat', sets: [{ w: 500, r: 20 }] }]
            }
          ]
        }
      });

      // weekInfo must not count future session
      const wi = app.context.window.weekInfo();
      // sess-past (2026-11-10) falls in current week (starts 2026-11-09), so count is 1. Future session 2099 must NOT count.
      assertEqual(wi.count, 1, 'Only past session in current week should count, future session must be excluded');

      // In vTrain, the last workout must NOT be the future workout
      const sorted = app.context.window.sortedSessions();
      const td = app.context.window.today();
      const lastPast = sorted.filter(s => s.d <= td).pop();
      assertEqual(lastPast.id, 'sess-past', 'Last session must be the past one');

      app.clickTab('train');
      assert(!app.text('#app').includes('2099-12-01'), 'Future date must not appear in train view');

      // vProgress must render without crashing
      app.clickTab('progress');
      assert(app.exists('#app'), 'Progress view must render smoothly');

      app.destroy();
    });
  });

  // =========================================================================
  // 9. NEW WORKOUT PROGRAMS (5x5, Arnold, Calisthenics, Bro-split)
  // =========================================================================
  describe('9. Fitness Community Programs & Template Integrity', () => {
    const EXPECTED_TEMPLATES = [
      { id: 'ss-a', title: '5×5 День A', group: 'Starting Strength · 5×5 (Сила)' },
      { id: 'ss-b', title: '5×5 День B', group: 'Starting Strength · 5×5 (Сила)' },
      { id: 'arnold-cb', title: 'Грудь и спина (Арнольд)', group: 'Золотая эра · Сплит Арнольда' },
      { id: 'arnold-sa', title: 'Плечи и руки (Арнольд)', group: 'Золотая эра · Сплит Арнольда' },
      { id: 'arnold-l', title: 'Ноги и пресс (Арнольд)', group: 'Золотая эра · Сплит Арнольда' },
      { id: 'cal-upper', title: 'Воркаут: Верх тела', group: 'Калистеника · Турники и брусья' },
      { id: 'cal-lower', title: 'Воркаут: Низ и кор', group: 'Калистеника · Турники и брусья' },
      { id: 'bro-chest', title: 'Грудь (День 1)', group: 'Бро-сплит · 5 дней (по группам)' },
      { id: 'bro-back', title: 'Спина (День 2)', group: 'Бро-сплит · 5 дней (по группам)' },
      { id: 'bro-shoulders', title: 'Плечи (День 3)', group: 'Бро-сплит · 5 дней (по группам)' },
      { id: 'bro-arms', title: 'Руки (День 4)', group: 'Бро-сплит · 5 дней (по группам)' },
      { id: 'bro-legs', title: 'Ноги и пресс (День 5)', group: 'Бро-сплит · 5 дней (по группам)' }
    ];

    it('9.1 all 4 requested program groups and 12 templates exist and have valid structure', () => {
      const app = createAppInstance();
      const groups = vm.runInContext('TPL_GROUPS', app.context);

      for (const expected of EXPECTED_TEMPLATES) {
        const grp = groups.find(g => g.title === expected.group);
        assert(grp, `Group "${expected.group}" must exist in TPL_GROUPS`);
        const tpl = grp.items.find(t => t.id === expected.id);
        assert(tpl, `Template "${expected.id}" must exist in group "${expected.group}"`);
        assert(tpl.ex && tpl.ex.length > 0, `Template "${expected.id}" must have exercises`);
      }

      app.destroy();
    });

    it('9.2 every exercise in new templates exists in LIB and has valid parameters', () => {
      const app = createAppInstance();
      const lib = vm.runInContext('LIB', app.context);
      const groups = vm.runInContext('TPL_GROUPS', app.context);

      for (const expected of EXPECTED_TEMPLATES) {
        const grp = groups.find(g => g.title === expected.group);
        const tpl = grp.items.find(t => t.id === expected.id);

        for (const item of tpl.ex) {
          const exId = item[0];
          const setsCount = item[1];
          const repsStr = item[2];

          assert(lib[exId], `Exercise "${exId}" in template "${tpl.id}" must exist in LIB`);
          assert(typeof setsCount === 'number' && setsCount >= 1 && setsCount <= 10, `Sets count for "${exId}" must be reasonable`);
          assert(typeof repsStr === 'string' && repsStr.length > 0, `Reps string for "${exId}" must be non-empty`);
        }
      }

      app.destroy();
    });

    it('9.3 superset configuration in TPL_SS correctly links consecutive pairs', () => {
      const app = createAppInstance();
      const tplSS = vm.runInContext('TPL_SS', app.context);
      const groups = vm.runInContext('TPL_GROUPS', app.context);

      const templatesWithSS = ['arnold-cb', 'arnold-sa', 'bro-arms'];
      for (const tid of templatesWithSS) {
        const pairs = tplSS[tid];
        assert(pairs && pairs.length > 0, `Template "${tid}" must define supersets in TPL_SS`);

        // Find template
        let foundTpl = null;
        for (const g of groups) {
          foundTpl = g.items.find(t => t.id === tid);
          if (foundTpl) break;
        }
        assert(foundTpl);

        for (const p of pairs) {
          assertEqual(p.length, 2, 'Superset pair must have 2 exercise indices');
          assertEqual(p[1], p[0] + 1, 'Superset pair must be consecutive exercises');
          assert(p[1] < foundTpl.ex.length, 'Superset indices must be within template bounds');

          // Check that TPL_GROUPS initialization tagged both exercises with matching 's' + p[0]
          assertEqual(foundTpl.ex[p[0]][3], 's' + p[0]);
          assertEqual(foundTpl.ex[p[1]][3], 's' + p[0]);
        }
      }

      app.destroy();
    });

    it('9.4 starts all 12 templates into active session without errors', () => {
      const app = createAppInstance();

      for (const expected of EXPECTED_TEMPLATES) {
        app.context.window.startTemplate(expected.id);

        const active = app.state.active;
        assert(active, `Active session must be created for template "${expected.id}"`);
        assertEqual(active.dayId, 'tpl:' + expected.id);
        assert(active.entries.length > 0, `Entries must be populated for "${expected.id}"`);

        // Discard session to reset for next template
        app.setConfirm(true);
        app.clickAct('discard');
        assertEqual(app.state.active, null);
      }

      app.destroy();
    });
  });

});
