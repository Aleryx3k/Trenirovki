'use strict';
/**
 * Tier 1 Feature Coverage: Supersets Test Suite
 * Covers Feature Area 2:
 * - Linking exercises with sslink and set count alignment
 * - Preservation of completed sets during alignment
 * - Round done completion rule before rest trigger (2-way and 3-way supersets)
 * - Out-of-order set completion within superset round
 * - Add full superset round (ssadd) and remove superset round (ssdel) with guards
 * - Direct exercise removal from superset (skipex) with orphan superset cleanup (fixSS)
 * - Unlinking supersets (ssunlink)
 */
const { describe, it, beforeEach, afterEach } = require('../harness/runner');
const assert = require('../harness/assert');
const {
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertMatch
} = assert;
const { createAppInstance } = require('../harness/env');

describe('Tier 1: Supersets Feature Suite', () => {
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

  // 1. LINKING EXERCISES & SET COUNT ALIGNMENT
  describe('Linking Exercises & Set Count Alignment', () => {
    it('links adjacent exercises with sslink and aligns disparate set counts to max', () => {
      // Start empty workout
      app.clickAct('tpls');
      app.clickAct('tpl-empty');

      // Add bench press (entry 0) and add 2 sets -> 3 sets total
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addset', { e: 0 });
      app.clickAct('addset', { e: 0 });
      assertEqual(getActive().entries[0].sets.length, 3);

      // Add cable row (entry 1) -> 1 set
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'rowcable' });
      assertEqual(getActive().entries[1].sets.length, 1);

      // Link entry 1 to entry 0
      app.clickAct('sslink', { e: 1 });

      const active = getActive();
      assert(active.entries[0].ss != null, 'Entry 0 must have superset id');
      assertEqual(active.entries[0].ss, active.entries[1].ss, 'Entry 0 and 1 must share superset id');

      // Entry 1 set count must be aligned from 1 to 3
      assertEqual(active.entries[1].sets.length, 3, 'Entry 1 set count expanded to match entry 0');
      assertEqual(active.entries[1].sets[1].done, false);
      assertEqual(active.entries[1].sets[2].done, false);
    });

    it('preserves existing completed sets and timestamps during superset alignment', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');

      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'benchbb' }); // entry 0, 1 set
      app.clickAct('done', { e: 0, s: 0 }); // Mark set done
      const completedTime = getActive().entries[0].sets[0].t;
      assert(completedTime != null);

      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'rowcable' }); // entry 1, 1 set
      app.clickAct('addset', { e: 1 }); // 2 sets
      app.clickAct('addset', { e: 1 }); // 3 sets

      // Link entry 1 to entry 0
      app.clickAct('sslink', { e: 1 });

      // Entry 0 expanded to 3 sets
      assertEqual(getActive().entries[0].sets.length, 3);
      // Entry 0 set 0 completed state and timestamp preserved
      assertEqual(getActive().entries[0].sets[0].done, true);
      assertEqual(getActive().entries[0].sets[0].t, completedTime);
      // Newly created sets are undone
      assertEqual(getActive().entries[0].sets[1].done, false);
      assertEqual(getActive().entries[0].sets[2].done, false);
    });
  });

  // 2. ROUND DONE COMPLETION & REST TRIGGER
  describe('Superset Round Completion & Rest Trigger', () => {
    beforeEach(() => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');

      // Add benchbb and rowcable, 2 sets each, linked in superset
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addset', { e: 0 });

      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'rowcable' });
      app.clickAct('addset', { e: 1 });

      app.clickAct('sslink', { e: 1 });
    });

    it('does not trigger rest timer until ALL exercises in the round are done', () => {
      // Step 1: Complete exercise 0 set 0
      app.clickAct('done', { e: 0, s: 0 });
      assertEqual(getActive().entries[0].sets[0].done, true);
      assert(!getActive().rest, 'Rest timer must NOT start when only first exercise in round is done');

      // Step 2: Complete exercise 1 set 0 (completes round 0)
      app.clickAct('done', { e: 1, s: 0 });
      assertEqual(getActive().entries[1].sets[0].done, true);
      assert(getActive().rest != null, 'Rest timer must start when all exercises in round are done');
    });

    it('triggers rest timer when round is completed out-of-order (exercise 1 done before exercise 0)', () => {
      // Step 1: Complete exercise 1 set 0 first
      app.clickAct('done', { e: 1, s: 0 });
      assertEqual(getActive().entries[1].sets[0].done, true);
      assert(!getActive().rest, 'Rest timer must NOT start when only second exercise is done');

      // Step 2: Complete exercise 0 set 0 second
      app.clickAct('done', { e: 0, s: 0 });
      assertEqual(getActive().entries[0].sets[0].done, true);
      assert(getActive().rest != null, 'Rest timer must trigger once the entire round is finished');
    });

    it('requires all 3 exercises done in a tri-set before triggering rest', () => {
      // Add a third exercise to superset: latraise
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'latraise' });
      app.clickAct('sslink', { e: 2 });

      assertEqual(getActive().entries[0].ss, getActive().entries[2].ss);

      // Complete exercise 0 set 0 -> no rest
      app.clickAct('done', { e: 0, s: 0 });
      assert(!getActive().rest);

      // Complete exercise 1 set 0 -> no rest
      app.clickAct('done', { e: 1, s: 0 });
      assert(!getActive().rest);

      // Complete exercise 2 set 0 -> all 3 done -> rest starts!
      app.clickAct('done', { e: 2, s: 0 });
      assert(getActive().rest != null, 'Rest timer must trigger only after all 3 exercises are done');
    });
  });

  // 3. ADD AND REMOVE SUPERSET ROUNDS
  describe('Add and Remove Superset Rounds', () => {
    beforeEach(() => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'rowcable' });
      app.clickAct('sslink', { e: 1 });
    });

    it('adds a synchronized round to all exercises in superset via ssadd', () => {
      assertEqual(getActive().entries[0].sets.length, 1);
      assertEqual(getActive().entries[1].sets.length, 1);

      // Add superset round
      app.clickAct('ssadd', { e: 0 });
      assertEqual(getActive().entries[0].sets.length, 2);
      assertEqual(getActive().entries[1].sets.length, 2);
      assertEqual(getActive().entries[0].sets[1].done, false);
      assertEqual(getActive().entries[1].sets[1].done, false);
    });

    it('removes last superset round via ssdel and guards against deleting the only round', () => {
      // Add a round so we have 2 rounds
      app.clickAct('ssadd', { e: 0 });
      assertEqual(getActive().entries[0].sets.length, 2);
      assert(app.exists('[data-act="ssdel"]'), 'ssdel button is available when rounds > 1');

      // Remove second round
      app.clickAct('ssdel', { e: 0 });
      assertEqual(getActive().entries[0].sets.length, 1);
      assertEqual(getActive().entries[1].sets.length, 1);

      // When 1 round remains, UI removes ssdel button to guard against 0 rounds
      assert(!app.exists('[data-act="ssdel"]'), 'ssdel button removed when 1 round remains');

      // Direct defensive test: attempting ssdel when 1 round triggers guard toast
      const guardBtn = app.document.createElement('button');
      guardBtn.dataset.act = 'ssdel';
      guardBtn.dataset.e = '0';
      app.document.body.appendChild(guardBtn);
      guardBtn.click();

      assertEqual(getActive().entries[0].sets.length, 1, 'Last round must be preserved');
      assert(app.exists('#toast'));
      assertEqual(app.text('#toast'), 'Нужен хотя бы один круг');
    });
  });

  // 4. DIRECT EXERCISE REMOVAL & UNLINKING
  describe('Direct Exercise Removal & Unlinking', () => {
    beforeEach(() => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'benchbb' });
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'rowcable' });
      app.clickAct('sslink', { e: 1 });
    });

    it('removes one exercise from 2-exercise superset and cleans up orphan superset id (fixSS)', () => {
      assertEqual(getActive().entries.length, 2);
      assert(getActive().entries[0].ss != null);

      // Remove entry 1 with confirm
      app.setConfirm(true);
      app.clickAct('skipex', { e: 1 });

      const active = getActive();
      assertEqual(active.entries.length, 1);
      assertEqual(active.entries[0].exId, 'benchbb');
      assertEqual(active.entries[0].ss, undefined, 'Orphan superset id cleaned up on single remaining exercise');
    });

    it('removes one exercise from 3-exercise superset and keeps remaining two linked', () => {
      // Add a third exercise to superset
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'latraise' });
      app.clickAct('sslink', { e: 2 });
      assertEqual(getActive().entries.length, 3);

      const ssId = getActive().entries[0].ss;
      assert(ssId != null);

      // Remove middle exercise (entry 1: rowcable)
      app.setConfirm(true);
      app.clickAct('skipex', { e: 1 });

      const active = getActive();
      assertEqual(active.entries.length, 2);
      assertEqual(active.entries[0].exId, 'benchbb');
      assertEqual(active.entries[1].exId, 'latraise');
      assertEqual(active.entries[0].ss, ssId, 'Remaining exercises remain linked');
      assertEqual(active.entries[1].ss, ssId);
    });

    it('unlinks superset into standalone exercises via ssunlink', () => {
      assert(getActive().entries[0].ss != null);
      assert(getActive().entries[1].ss != null);

      // Unlink superset
      app.clickAct('ssunlink', { e: 0 });

      assertEqual(getActive().entries[0].ss, undefined, 'Entry 0 superset unlinked');
      assertEqual(getActive().entries[1].ss, undefined, 'Entry 1 superset unlinked');
      assertEqual(getActive().entries.length, 2, 'Both exercises remain in workout');
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
