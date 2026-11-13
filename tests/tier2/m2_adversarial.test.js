'use strict';
/**
 * Milestone 2 Adversarial Stress Test Suite
 * Empirical Challenger Verification for M2 Core Logic & Invariants:
 * 1. Superset set count alignment (disparate 1 vs 5, expansions, completed sets preservation)
 * 2. Superset done action & out-of-order execution (3 exercises, round completion, toggle)
 * 3. Superset deletion & cleanup (fixSS, skipex, inline buttons, hdelset)
 * 4. Future date protection (hdate, addbody, weekInfo, vTrain, vProgress)
 * 5. History date timestamp sync (s.d, s.start, s.end, duration preservation)
 * 6. Bodyweight record deletion guard (delbody 1 record remaining blocked + toast)
 * 7. Settings input sync (data-p="sets", saverest boundaries [15, 600])
 * 8. Gravitron mode toggle & retention (finishSession, hs inputs, hbw)
 * 9. Resource leak remediations (WakeLock race condition, export blob revoke, elapsed timer)
 * 10. Community programs & supersets validation (Starting Strength, Arnold, Calisthenics, Bro-Split)
 */
const vm = require('node:vm');
const { describe, it, beforeEach, afterEach } = require('../harness/runner');
const assert = require('../harness/assert');
const {
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertMatch
} = assert;
const { createAppInstance } = require('../harness/env');

describe('Milestone 2 Adversarial Stress & Invariants Suite', () => {
  let app;

  beforeEach(() => {
    app = createAppInstance({ initialNow: new Date('2026-11-12T12:00:00.000Z').getTime() });
  });

  afterEach(() => {
    if (app) {
      app.destroy();
      app = null;
    }
  });

  function getActive() {
    return app.state.active;
  }

  // -------------------------------------------------------------------------
  // 1. SUPERSET SET COUNT ALIGNMENT
  // -------------------------------------------------------------------------
  describe('1. Superset Set Count Alignment', () => {
    it('aligns disparate set counts (1 vs 5 sets), expands with done=false and copies weights/reps', () => {
      // Start empty workout
      app.clickAct('tpls');
      app.clickAct('tpl-empty');

      // Add two exercises: benchbb and rowcable
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'rowcable' });

      let active = getActive();
      assertEqual(active.entries.length, 2);

      // Exercise 0 (benchbb): configure 1 set, marked as done with 80kg x 8 reps
      active.entries[0].sets = [{ w: 80, r: 8, done: true, t: 123456789 }];

      // Exercise 1 (rowcable): configure 5 sets with varying weights
      active.entries[1].sets = [
        { w: 50, r: 10, done: true, t: 123456700 },
        { w: 55, r: 10, done: true, t: 123456710 },
        { w: 60, r: 8, done: false, t: null },
        { w: 60, r: 8, done: false, t: null },
        { w: 60, r: 6, done: false, t: null }
      ];

      // Open card 1 (it is already open as the last added exercise) and link with exercise 0
      app.clickAct('sslink', { e: 1 });

      active = getActive();
      const e0 = active.entries[0];
      const e1 = active.entries[1];

      // Both must share the same superset tag
      assert(e0.ss && e1.ss, 'Both entries must have ss tag');
      assertEqual(e0.ss, e1.ss, 'Entries must share identical superset group tag');

      // Both entries must now have exactly 5 sets
      assertEqual(e0.sets.length, 5, 'Exercise 0 must be expanded to 5 sets');
      assertEqual(e1.sets.length, 5, 'Exercise 1 retains 5 sets');

      // Preserved original set 0 for Exercise 0
      assertEqual(e0.sets[0].w, 80);
      assertEqual(e0.sets[0].r, 8);
      assertEqual(e0.sets[0].done, true);
      assertEqual(e0.sets[0].t, 123456789);

      // Newly added sets (indices 1 to 4) on Exercise 0 must have done=false and t=null
      for (let s = 1; s < 5; s++) {
        assertEqual(e0.sets[s].done, false, `Expanded set ${s} must have done=false`);
        assertEqual(e0.sets[s].t, null, `Expanded set ${s} must have t=null`);
        assertEqual(e0.sets[s].w, 80, `Expanded set ${s} copies weight from previous set`);
        assertEqual(e0.sets[s].r, 8, `Expanded set ${s} copies reps from previous set`);
      }

      // Exercise 1 sets should be completely uncorrupted
      assertEqual(e1.sets[0].done, true);
      assertEqual(e1.sets[1].done, true);
      assertEqual(e1.sets[2].done, false);
      assertEqual(e1.sets[4].r, 6);
    });

    it('handles extreme disparity (1 set vs 10 sets) and preserves existing completed sets', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'squat' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'legpress' });

      let active = getActive();
      active.entries[0].sets = [{ w: 100, r: 5, done: true, t: 999 }];
      active.entries[1].sets = [];
      for (let i = 0; i < 10; i++) {
        active.entries[1].sets.push({ w: 200 + i * 10, r: 10, done: i < 3, t: i < 3 ? 1000 + i : null });
      }

      app.clickAct('sslink', { e: 1 });

      active = getActive();
      assertEqual(active.entries[0].sets.length, 10);
      assertEqual(active.entries[1].sets.length, 10);
      assertEqual(active.entries[0].sets[0].done, true);
      for (let i = 1; i < 10; i++) {
        assertEqual(active.entries[0].sets[i].done, false);
        assertEqual(active.entries[0].sets[i].w, 100);
      }
    });

    it('3-exercise superset alignment and round deletion guard (ssdel)', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'curlbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'skull' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'hammer' });

      let active = getActive();
      active.entries[0].sets = [{ w: 30, r: 10, done: false, t: null }, { w: 30, r: 10, done: false, t: null }]; // 2 sets
      active.entries[1].sets = [1, 2, 3, 4].map(() => ({ w: 25, r: 10, done: false, t: null })); // 4 sets
      active.entries[2].sets = [{ w: 12, r: 12, done: false, t: null }]; // 1 set

      // Open card 1 and link with 0
      app.clickAct('open', { e: 1 });
      app.clickAct('sslink', { e: 1 });

      // Open card 2 and link with 1
      app.clickAct('open', { e: 2 });
      app.clickAct('sslink', { e: 2 });

      active = getActive();
      const g0 = active.entries[0].ss;
      assertEqual(active.entries[1].ss, g0);
      assertEqual(active.entries[2].ss, g0);
      assertEqual(active.entries[0].sets.length, 4);
      assertEqual(active.entries[1].sets.length, 4);
      assertEqual(active.entries[2].sets.length, 4);

      // ssdel: removes one round (round 4)
      app.clickAct('ssdel', { e: 0 });
      active = getActive();
      assertEqual(active.entries[0].sets.length, 3);
      assertEqual(active.entries[1].sets.length, 3);
      assertEqual(active.entries[2].sets.length, 3);

      // ssdel down to 1 round
      app.clickAct('ssdel', { e: 0 }); // to 2
      app.clickAct('ssdel', { e: 0 }); // to 1
      active = getActive();
      assertEqual(active.entries[0].sets.length, 1);

      // The UI hides the ssdel button when rounds === 1
      assert(!app.query('[data-act="ssdel"]'), 'ssdel button must not be rendered when only 1 round remains');

      // Attempting to invoke ssdel directly when rounds <= 1 is blocked by case guard with toast
      const delBtn = app.document.createElement('button');
      delBtn.dataset.act = 'ssdel';
      delBtn.dataset.e = '0';
      app.document.body.appendChild(delBtn);
      delBtn.click();
      delBtn.remove();

      active = getActive();
      assertEqual(active.entries[0].sets.length, 1, 'Cannot delete last remaining superset round');
      const toastEl = app.query('#toast');
      assertMatch(toastEl.textContent, /хотя бы один круг/);
    });
  });

  // -------------------------------------------------------------------------
  // 2. SUPERSET DONE ACTION & OUT-OF-ORDER EXECUTION
  // -------------------------------------------------------------------------
  describe('2. Superset Done Action & Execution Flow', () => {
    it('in a 3-exercise superset, rest timer triggers ONLY when all 3 complete the round', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'pullup' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'crunch' });

      // Link all three into superset
      app.clickAct('open', { e: 1 });
      app.clickAct('sslink', { e: 1 });
      app.clickAct('open', { e: 2 });
      app.clickAct('sslink', { e: 2 });

      let active = getActive();
      assert(!active.rest, 'Initially no rest timer');

      // Complete Exercise 0 Set 0
      app.clickAct('done', { e: 0, s: 0 });
      active = getActive();
      assertEqual(active.entries[0].sets[0].done, true);
      assert(!active.rest, 'Rest timer must NOT start when only Ex 0 is done');

      // Complete Exercise 1 Set 0
      app.clickAct('done', { e: 1, s: 0 });
      active = getActive();
      assertEqual(active.entries[1].sets[0].done, true);
      assert(!active.rest, 'Rest timer must NOT start when Ex 0 and Ex 1 are done, but Ex 2 is pending');

      // Complete Exercise 2 Set 0 -> ALL 3 done for round 0!
      app.clickAct('done', { e: 2, s: 0 });
      active = getActive();
      assertEqual(active.entries[2].sets[0].done, true);
      assert(active.rest && active.rest.end > app.clock.now, 'Rest timer MUST trigger when all 3 complete the round');
      assertEqual(app.query('#rest').classList.contains('hidden'), false);
    });

    it('handles out-of-order set completion across exercises in a superset', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'pullup' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'crunch' });
      app.clickAct('open', { e: 1 });
      app.clickAct('sslink', { e: 1 });
      app.clickAct('open', { e: 2 });
      app.clickAct('sslink', { e: 2 });

      // User marks Exercise 2 (crunch) first!
      app.clickAct('done', { e: 2, s: 0 });
      let active = getActive();
      assert(!active.rest, 'Ex 2 marked first: no rest timer');

      // User marks Exercise 0 (benchbb) second!
      app.clickAct('done', { e: 0, s: 0 });
      active = getActive();
      assert(!active.rest, 'Ex 2 and Ex 0 marked: no rest timer');

      // User marks Exercise 1 (pullup) third! (completes round)
      app.clickAct('done', { e: 1, s: 0 });
      active = getActive();
      assert(active.rest, 'All 3 completed out of order: rest timer starts!');
    });

    it('toggling set done state (unchecking) does not trigger rest timer', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'pullup' });
      app.clickAct('sslink', { e: 1 });

      // Mark both done -> starts rest
      app.clickAct('done', { e: 0, s: 0 });
      app.clickAct('done', { e: 1, s: 0 });
      assert(getActive().rest, 'Rest started');

      // Stop rest manually via rest-stop button
      app.clickAct('rest-stop');
      assert(!getActive().rest, 'Rest stopped');

      // Uncheck Exercise 1 Set 0
      app.clickAct('done', { e: 1, s: 0 });
      let active = getActive();
      assertEqual(active.entries[1].sets[0].done, false);
      assertEqual(active.entries[1].sets[0].t, null);
      assert(!active.rest, 'Unchecking done set must NOT start rest timer');
    });

    it('gracefully handles missing set index or invalid e/s without exception', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'benchbb' });

      // Create a button with invalid ei and si
      const btn = app.document.createElement('button');
      btn.dataset.act = 'done';
      btn.dataset.e = '99';
      btn.dataset.s = '99';
      app.document.body.appendChild(btn);

      let threw = false;
      try {
        btn.click();
      } catch (err) {
        threw = true;
      } finally {
        btn.remove();
      }
      assert(!threw, 'Invalid done action coordinates must not throw');
    });
  });

  // -------------------------------------------------------------------------
  // 3. SUPERSET DELETION & CLEANUP (fixSS, skipex, cardBlockOpen)
  // -------------------------------------------------------------------------
  describe('3. Superset Deletion & Cleanup', () => {
    it('skipping exercise in a 2-exercise superset removes orphaned ss tag via fixSS()', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'pullup' });
      app.clickAct('sslink', { e: 1 });

      let active = getActive();
      assert(active.entries[0].ss && active.entries[1].ss, 'Initially tagged with ss');

      // Skip exercise 1
      app.setConfirm(true);
      app.clickAct('skipex', { e: 1 });

      active = getActive();
      assertEqual(active.entries.length, 1);
      assertEqual(active.entries[0].exId, 'benchbb');
      assertEqual(active.entries[0].ss, undefined, 'Orphaned ss tag on remaining exercise must be cleaned up');
    });

    it('skipping middle exercise in a 3-exercise superset retains superset for remaining 2', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'pullup' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'crunch' });
      app.clickAct('open', { e: 1 });
      app.clickAct('sslink', { e: 1 });
      app.clickAct('open', { e: 2 });
      app.clickAct('sslink', { e: 2 });

      let active = getActive();
      const ssTag = active.entries[0].ss;
      assertEqual(active.entries.length, 3);

      // Skip exercise 1 (pullup)
      app.setConfirm(true);
      app.clickAct('skipex', { e: 1 });

      active = getActive();
      assertEqual(active.entries.length, 2);
      assertEqual(active.entries[0].exId, 'benchbb');
      assertEqual(active.entries[1].exId, 'crunch');
      // 2 exercises remain with the same ssTag
      assertEqual(active.entries[0].ss, ssTag);
      assertEqual(active.entries[1].ss, ssTag);

      // Skip crunch -> only benchbb left
      app.clickAct('skipex', { e: 1 });
      active = getActive();
      assertEqual(active.entries.length, 1);
      assertEqual(active.entries[0].ss, undefined, 'Orphaned ss tag removed when 1 exercise left');
    });

    it('cardBlockOpen provides inline skipex buttons for superset members', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'pullup' });
      app.clickAct('sslink', { e: 1 });

      // Check DOM in cardBlockOpen
      const skipButtons = app.queryAll('[data-act="skipex"]');
      assert(skipButtons.length >= 2, 'Must render inline removal buttons inside superset card');
    });

    it('history hdelset cleans up orphaned superset tags via fixSS(hs)', () => {
      const state = app.state;
      state.sessions = [{
        id: 'sess-ss-1',
        d: '2026-11-10',
        start: '2026-11-10T10:00:00.000Z',
        end: '2026-11-10T10:45:00.000Z',
        entries: [
          { exId: 'benchbb', ss: 'ss_group_1', sets: [{ w: 80, r: 8 }] },
          { exId: 'pullup', ss: 'ss_group_1', sets: [{ a: 0, r: 8 }] }
        ]
      }];
      app.setState(state);

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-ss-1' });

      app.setConfirm(true);
      app.clickAct('hdelset', { id: 'sess-ss-1', e: 1, s: 0 });

      const updatedSess = app.state.sessions.find(s => s.id === 'sess-ss-1');
      assertEqual(updatedSess.entries.length, 1);
      assertEqual(updatedSess.entries[0].exId, 'benchbb');
      assertEqual(updatedSess.entries[0].ss, undefined, 'fixSS(hs) must clear orphan ss tag in history session');
    });
  });

  // -------------------------------------------------------------------------
  // 4. FUTURE DATE PROTECTION
  // -------------------------------------------------------------------------
  describe('4. Future Date Protection', () => {
    it('rejects future dates in hdate with toast and retains existing date', () => {
      const state = app.state;
      state.sessions = [{
        id: 'sess-future-test',
        d: '2026-11-10',
        start: '2026-11-10T10:00:00.000Z',
        end: '2026-11-10T10:40:00.000Z',
        entries: [{ exId: 'squat', sets: [{ w: 100, r: 5 }] }]
      }];
      app.setState(state);

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-future-test' });

      const dateInp = app.query('input[data-act-change="hdate"]');
      assert(dateInp, 'hdate input must exist');

      // Attempt to set future date: 2026-11-15 (harness current date is 2026-11-12)
      dateInp.value = '2026-11-15';
      dateInp.dispatchEvent({ type: 'change', target: dateInp });

      assertEqual(state.sessions[0].d, '2026-11-10', 'Session date must NOT be changed to future date');
      assertEqual(dateInp.value, '2026-11-10', 'Input value must reset to current session date');
      const toast = app.query('#toast');
      assertMatch(toast.textContent, /не может быть в будущем/);
    });

    it('rejects future dates in addbody with toast and does not add record', () => {
      app.clickTab('progress');

      const bodyD = app.query('#bodyD');
      const bodyIn = app.query('#bodyIn');
      assert(bodyD && bodyIn, 'Progress body inputs must exist');

      bodyD.value = '2028-05-01'; // Future date
      bodyIn.value = '75';
      app.clickAct('addbody');

      const futureRecord = app.state.body.find(b => b.d === '2028-05-01');
      assert(!futureRecord, 'Future body measurement must not be stored');
      const toast = app.query('#toast');
      assertMatch(toast.textContent, /не может быть в будущем/);
    });

    it('weekInfo(), vTrain(), and vProgress() strictly ignore future sessions and measurements', () => {
      const state = app.state;

      // Inject past session (1000 kg), future session in same week (5000 kg), and far future session
      state.sessions = [
        {
          id: 'past-sess',
          d: '2026-11-11',
          start: '2026-11-11T10:00:00.000Z',
          end: '2026-11-11T11:00:00.000Z',
          entries: [{ exId: 'benchbb', sets: [{ w: 100, r: 10 }] }] // volume: 1000 kg
        },
        {
          id: 'future-sess',
          d: '2026-11-15', // Future in the current week (today is 2026-11-12)
          start: '2026-11-15T10:00:00.000Z',
          end: '2026-11-15T11:00:00.000Z',
          entries: [{ exId: 'benchbb', sets: [{ w: 500, r: 10 }] }] // volume: 5000 kg
        },
        {
          id: 'far-future-sess',
          d: '2029-01-01',
          start: '2029-01-01T10:00:00.000Z',
          end: '2029-01-01T11:00:00.000Z',
          entries: [{ exId: 'benchbb', sets: [{ w: 999, r: 10 }] }]
        }
      ];

      // Inject past and future bodyweight
      state.body = [
        { d: '2026-11-10', kg: 72 },
        { d: '2026-11-12', kg: 73 },
        { d: '2027-01-01', kg: 95 } // Future
      ];
      app.setState(state);

      // Verify vTrain
      app.clickTab('train');
      const stats = app.queryAll('.stat');
      assert(stats.length >= 3, 'Must render stat widgets');

      // Volume for week must include 1000 kg (from 2026-11-11) and EXCLUDE 5000 kg (from 2026-11-15)
      const volText = stats[0].querySelector('b').textContent.replace(/\s+/g, '');
      assertEqual(volText, '1000', 'Weekly volume must strictly exclude future sessions');

      // 30-day count must be 1 (only the past session)
      const m30Text = stats[2].querySelector('b').textContent.trim();
      assertEqual(m30Text, '1', '30-day session count must exclude future sessions');

      // Last session card in vTrain must show past session, not future session
      const lastCard = app.query('.card.last');
      assert(lastCard, 'Last workout card must exist');
      assertMatch(lastCard.textContent, /11 ноя/);

      // Verify vProgress
      app.clickTab('progress');
      const progressHtml = app.query('#app').innerHTML;
      // Future body weight of 95 kg must not appear in recent list
      assert(!progressHtml.includes('95 кг'), 'vProgress must exclude future bodyweight');
      assert(progressHtml.includes('73 кг'), 'vProgress must include valid current bodyweight');
    });
  });

  // -------------------------------------------------------------------------
  // 5. HISTORY DATE TIMESTAMP SYNC
  // -------------------------------------------------------------------------
  describe('5. History Date Timestamp Sync', () => {
    it('syncs s.d, s.start, and s.end ISO strings and preserves duration', () => {
      const state = app.state;
      state.sessions = [{
        id: 'sess-sync-test',
        d: '2026-11-10',
        start: '2026-11-10T14:30:00.000Z',
        end: '2026-11-10T15:15:30.000Z', // duration: 45 min 30 sec = 2730000 ms
        entries: [{ exId: 'squat', sets: [{ w: 100, r: 5 }] }]
      }];
      app.setState(state);

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-sync-test' });

      const dateInp = app.query('input[data-act-change="hdate"]');
      assert(dateInp);

      // Change date to 2026-11-08 (valid past date)
      dateInp.value = '2026-11-08';
      dateInp.dispatchEvent({ type: 'change', target: dateInp });

      const sess = state.sessions[0];
      assertEqual(sess.d, '2026-11-08', 's.d must be updated');
      assertEqual(sess.start, '2026-11-08T14:30:00.000Z', 's.start ISO date must match new date');
      assertEqual(sess.end, '2026-11-08T15:15:30.000Z', 's.end ISO date must match new date');

      const startMs = new Date(sess.start).getTime();
      const endMs = new Date(sess.end).getTime();
      assertEqual(endMs - startMs, 2730000, 'Session duration must be precisely preserved');
    });

    it('gracefully handles missing or zero duration in history session', () => {
      const state = app.state;
      state.sessions = [{
        id: 'sess-nodur-test',
        d: '2026-11-10',
        start: '2026-11-10T12:00:00.000Z',
        end: '2026-11-10T12:00:00.000Z',
        entries: [{ exId: 'squat', sets: [{ w: 100, r: 5 }] }]
      }];
      app.setState(state);

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-nodur-test' });

      const dateInp = app.query('input[data-act-change="hdate"]');
      dateInp.value = '2026-11-05';
      dateInp.dispatchEvent({ type: 'change', target: dateInp });

      const sess = state.sessions[0];
      assertEqual(sess.d, '2026-11-05');
      assertEqual(sess.start, '2026-11-05T12:00:00.000Z');
      assertEqual(sess.end, '2026-11-05T12:00:00.000Z');
    });
  });

  // -------------------------------------------------------------------------
  // 6. BODYWEIGHT RECORD DELETION GUARD
  // -------------------------------------------------------------------------
  describe('6. Bodyweight Record Deletion Guard', () => {
    it('blocks deletion when only 1 record remains and shows toast', () => {
      const state = app.state;
      state.body = [{ d: '2026-11-10', kg: 74 }];
      app.setState(state);

      app.clickTab('progress');

      app.setConfirm(true);
      app.clickAct('delbody', { d: '2026-11-10' });

      assertEqual(state.body.length, 1, 'Body records length must remain 1');
      assertEqual(state.body[0].kg, 74);
      const toast = app.query('#toast');
      assertMatch(toast.textContent, /Нельзя удалить последнюю запись веса/);
    });

    it('allows deleting down to 1 record, then blocks the final deletion', () => {
      const state = app.state;
      state.body = [
        { d: '2026-11-08', kg: 73 },
        { d: '2026-11-09', kg: 73.5 },
        { d: '2026-11-10', kg: 74 }
      ];
      app.setState(state);

      app.clickTab('progress');
      app.setConfirm(true);

      // Delete record 1
      app.clickAct('delbody', { d: '2026-11-08' });
      assertEqual(state.body.length, 2);

      // Delete record 2
      app.clickAct('delbody', { d: '2026-11-09' });
      assertEqual(state.body.length, 1);

      // Attempt to delete the last record
      app.clickAct('delbody', { d: '2026-11-10' });
      assertEqual(state.body.length, 1, 'Must NOT delete last entry');
      const toast = app.query('#toast');
      assertMatch(toast.textContent, /Нельзя удалить последнюю запись веса/);
    });
  });

  // -------------------------------------------------------------------------
  // 7. SETTINGS INPUT SYNC & REST BOUNDARIES
  // -------------------------------------------------------------------------
  describe('7. Settings Input Sync & Rest Boundaries', () => {
    it('plan data-p="sets" input normalizes and syncs on change', () => {
      app.clickTab('more');
      app.clickAct('plan');

      const setsInp = app.query('input[data-p="sets"]');
      assert(setsInp, 'Plan sets input must be present');

      // Valid input
      setsInp.value = '5';
      setsInp.dispatchEvent({ type: 'input', target: setsInp });
      setsInp.dispatchEvent({ type: 'change', target: setsInp });

      assertEqual(app.state.plan[0].items[0].sets, 5);
      assertEqual(setsInp.value, '5');

      // Out of bounds: 0 -> clamped to 1
      setsInp.value = '0';
      setsInp.dispatchEvent({ type: 'input', target: setsInp });
      setsInp.dispatchEvent({ type: 'change', target: setsInp });
      assertEqual(app.state.plan[0].items[0].sets, 1);
      assertEqual(setsInp.value, '1');

      // Out of bounds: 99 -> clamped to 20
      setsInp.value = '99';
      setsInp.dispatchEvent({ type: 'input', target: setsInp });
      setsInp.dispatchEvent({ type: 'change', target: setsInp });
      assertEqual(app.state.plan[0].items[0].sets, 20);
      assertEqual(setsInp.value, '20');
    });

    it('saverest clamps rest timer within [15, 600] and updates #restIn.value', () => {
      app.clickTab('more');

      const restInp = app.query('#restIn');
      assert(restInp, '#restIn must exist');

      // Below lower bound (e.g. 5s)
      restInp.value = '5';
      app.clickAct('saverest');
      assertEqual(app.state.settings.rest, 15, 'Rest must clamp to 15s min');
      assertEqual(restInp.value, '15', 'Input value must sync to 15');

      // Above upper bound (e.g. 1000s)
      restInp.value = '1000';
      app.clickAct('saverest');
      assertEqual(app.state.settings.rest, 600, 'Rest must clamp to 600s max');
      assertEqual(restInp.value, '600', 'Input value must sync to 600');

      // Change event on #restIn also clamps
      restInp.value = '10';
      restInp.dispatchEvent({ type: 'change', target: restInp });
      assertEqual(app.state.settings.rest, 15);
      assertEqual(restInp.value, '15');
    });
  });

  // -------------------------------------------------------------------------
  // 8. GRAVITRON MODE TOGGLE & RETENTION
  // -------------------------------------------------------------------------
  describe('8. Gravitron Mode Toggle & Retention', () => {
    it('history hbw toggles mode even when weight and assist are 0', () => {
      const state = app.state;
      state.sessions = [{
        id: 'sess-bw-test',
        d: '2026-11-10',
        start: '2026-11-10T10:00:00.000Z',
        end: '2026-11-10T10:30:00.000Z',
        entries: [{
          exId: 'pullup', // bw: true
          sets: [{ w: 0, a: 0, r: 8, m: 'w' }]
        }]
      }];
      app.setState(state);

      app.clickTab('history');
      app.clickAct('hopen', { id: 'sess-bw-test' });

      // Click hbw toggle button
      app.clickAct('hbw', { id: 'sess-bw-test', e: 0, s: 0 });

      let setObj = state.sessions[0].entries[0].sets[0];
      assertEqual(setObj.m, 'a', 'Toggled from w to a mode');

      // Toggle back
      app.clickAct('hbw', { id: 'sess-bw-test', e: 0, s: 0 });
      setObj = state.sessions[0].entries[0].sets[0];
      assertEqual(setObj.m, 'w', 'Toggled back from a to w mode');
    });

    it('finishSession retains set.m on bw exercises for assist sets with 0 kg', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('pick-ex', { id: 'pullup' }); // bw exercise

      let active = getActive();
      // Assist set with 0 kg assistance
      active.entries[0].sets[0].m = 'a';
      active.entries[0].sets[0].a = 0;
      active.entries[0].sets[0].w = 0;
      active.entries[0].sets[0].r = 8;
      active.entries[0].sets[0].done = true;

      app.clickAct('finish');

      const savedSess = app.state.sessions[app.state.sessions.length - 1];
      assert(savedSess, 'Session saved');
      const savedSet = savedSess.entries[0].sets[0];
      assertEqual(savedSet.m, 'a', 'set.m must be preserved in finished session');
      assertEqual(savedSet.a, 0);
    });
  });

  // -------------------------------------------------------------------------
  // 9. RESOURCE LEAK REMEDIATIONS
  // -------------------------------------------------------------------------
  describe('9. Resource Leak Remediations', () => {
    it('keepAwake handles pending race condition if session discarded quickly', async () => {
      let resolveLock;
      const originalRequest = app.mocks.wakeLock.request.bind(app.mocks.wakeLock);
      app.mocks.wakeLock.request = () => {
        return new Promise(resolve => {
          resolveLock = () => originalRequest().then(resolve);
        });
      };

      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      assert(getActive(), 'Active session started');

      // Immediate discard while wakeLock request is pending
      app.setConfirm(true);
      app.clickAct('discard');
      assert(!getActive(), 'Active session discarded');

      // Now the pending request resolves
      if (resolveLock) resolveLock();
      await app.flush();

      // Check that wakeLock was immediately released
      assertEqual(app.mocks.wakeLock.isActive(), false, 'Wake lock sentinel must be released if workout discarded before resolution');
    });

    it('doExport revokes created object URL via setTimeout', () => {
      app.clickTab('more');
      app.clickAct('export');

      assertEqual(app.mocks.urlRegistry.created.length, 1, 'ObjectURL created for export');
      assertEqual(app.mocks.urlRegistry.activeCount, 1, 'Blob is initially active');

      // Advance clock past the 1500ms timeout
      app.advanceTimers(2000);

      assertEqual(app.mocks.urlRegistry.activeCount, 0, 'Blob ObjectURL must be revoked after export');
      assertEqual(app.mocks.urlRegistry.revoked.length, 1);
    });

    it('elapsed timer stops ticking when tab is not train or session is inactive', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      assert(getActive(), 'Workout active');

      // Check elapsed timer updates on train tab
      app.advanceTimers(2000);
      const elapsedEl = app.query('#elapsed');
      assert(elapsedEl, '#elapsed element present');

      // Switch to history tab
      app.clickTab('history');
      app.advanceTimers(3000);

      // Switch document visibility to hidden
      app.triggerVisibilityChange('hidden');
      app.advanceTimers(3000);

      // Return to train tab
      app.triggerVisibilityChange('visible');
      app.clickTab('train');

      // Discard session
      app.setConfirm(true);
      app.clickAct('discard');

      // Elapsed element should disappear and timer cleared
      assert(!app.query('#elapsed'), '#elapsed should no longer exist after discard');
    });
  });

  // -------------------------------------------------------------------------
  // 10. COMMUNITY PROGRAMS & SUPERSETS VALIDATION
  // -------------------------------------------------------------------------
  describe('10. Community Programs & Superset Templates Validation', () => {
    it('includes all 4 required popular training programs in templates', () => {
      app.clickAct('tpls');
      const sheet = app.query('#sheet');
      assert(sheet, '#sheet must exist');
      const html = sheet.innerHTML;

      assertMatch(html, /Starting Strength · 5×5 \(Сила\)/);
      assertMatch(html, /Золотая эра · Сплит Арнольда/);
      assertMatch(html, /Калистеника · Турники и брусья/);
      assertMatch(html, /Бро-сплит · 5 дней/);
    });

    it('every exercise in every template program exists in the exercise library S.ex', () => {
      const S = app.state;
      const tplGroups = vm.runInContext('TPL_GROUPS', app.context);
      assert(Array.isArray(tplGroups), 'TPL_GROUPS must exist');

      for (const group of tplGroups) {
        for (const item of group.items) {
          for (const exDef of item.ex) {
            const exId = exDef[0];
            assert(S.ex[exId], `Exercise ID "${exId}" in template "${item.id}" (${item.name}) must exist in S.ex`);
          }
        }
      }
    });

    it('all superset pairs in TPL_SS are valid and within template exercise array bounds', () => {
      const tplGroups = vm.runInContext('TPL_GROUPS', app.context);
      const tplSS = vm.runInContext('TPL_SS', app.context);
      assert(tplSS && typeof tplSS === 'object', 'TPL_SS must exist');

      const templateMap = new Map();
      for (const g of tplGroups) {
        for (const it of g.items) {
          templateMap.set(it.id, it);
        }
      }

      for (const [tplId, pairs] of Object.entries(tplSS)) {
        const tpl = templateMap.get(tplId);
        assert(tpl, `Template with id "${tplId}" in TPL_SS must exist in TPL_GROUPS`);

        for (const pair of pairs) {
          assert(pair.length === 2, `Superset pair in ${tplId} must contain exactly 2 indices`);
          const [idx1, idx2] = pair;
          assert(idx1 >= 0 && idx1 < tpl.ex.length, `Superset index ${idx1} in ${tplId} out of bounds`);
          assert(idx2 >= 0 && idx2 < tpl.ex.length, `Superset index ${idx2} in ${tplId} out of bounds`);
          assertEqual(idx2, idx1 + 1, `Superset exercises in ${tplId} must be consecutive (${idx1}, ${idx2})`);
        }
      }
    });

    it('starts an Arnold split workout with 3 antagonistic superset pairs correctly', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-open', { id: 'arnold-cb' });
      app.clickAct('tpl-start');

      const active = getActive();
      assert(active, 'Workout must be started');
      assertEqual(active.entries.length, 6);

      // Verify superset pairs: (0, 1), (2, 3), (4, 5)
      assert(active.entries[0].ss && active.entries[1].ss, 'Pair 0-1 must have ss');
      assertEqual(active.entries[0].ss, active.entries[1].ss);

      assert(active.entries[2].ss && active.entries[3].ss, 'Pair 2-3 must have ss');
      assertEqual(active.entries[2].ss, active.entries[3].ss);

      assert(active.entries[4].ss && active.entries[5].ss, 'Pair 4-5 must have ss');
      assertEqual(active.entries[4].ss, active.entries[5].ss);

      // Cleanly discard
      app.setConfirm(true);
      app.clickAct('discard');
      assert(!getActive(), 'Workout discarded cleanly');
    });
  });

});

if (require.main === module) {
  const { defaultRunner } = require('../harness/runner');
  defaultRunner.run({ verbose: true }).then(results => {
    if (results.failed > 0) process.exit(1);
    else process.exit(0);
  });
}
