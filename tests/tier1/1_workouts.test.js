'use strict';
/**
 * Tier 1 Feature Coverage: Workouts Test Suite
 * Covers Feature Area 1:
 * - Start planned workout (schedule Day A, B, C via hero and template sheet)
 * - Start template workouts (including all 4 community programs: 5x5, Arnold, Calisthenics, Bro-Split)
 * - Start empty workout
 * - Add exercise from picker
 * - Adjust weight & reps with steppers and inputs
 * - Add and remove sets in active exercise
 * - Bodyweight mode toggle (live assistance vs added weight)
 * - Complete sets and verify timestamp / done state
 * - Finish workout to post-workout summary and close summary
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

describe('Tier 1: Workouts Feature Suite', () => {
  let app;

  beforeEach(() => {
    // 2026-11-10 is Tuesday (Day A in default plan has wd: 2)
    app = createAppInstance({ initialNow: new Date('2026-11-10T10:00:00.000Z').getTime() });
  });

  afterEach(() => {
    if (app) {
      app.destroy();
      app = null;
    }
  });

  // 1. START PLANNED WORKOUT
  describe('Start Planned Workout', () => {
    it('starts scheduled plan day (Day A) from hero and initializes entries with default sets/reps and done=false', () => {
      // Tuesday matches Day A (wd: 2)
      const dayA = app.state.plan.find(d => d.id === 'A');
      assert(dayA != null, 'Plan day A must exist in default state');
      assert(dayA.items.length > 0, 'Day A must have scheduled exercise items');

      // Hero button for today's plan exists
      assert(app.exists('[data-act="start"][data-day="A"]'), 'Hero button for Day A must exist on Tuesday');
      app.clickAct('start', { day: 'A' });

      const active = app.state.active;
      assert(active != null, 'Active workout session must be created');
      assertEqual(active.dayId, 'A');

      // Day A has 5 plan items, one of which is a 2-exercise superset (facepull + shrug), total 6 entries
      const expectedTotalEntries = dayA.items.reduce((sum, it) => sum + it.ex.length, 0);
      assertEqual(active.entries.length, expectedTotalEntries);

      // Verify each exercise entry
      let entryIndex = 0;
      dayA.items.forEach(item => {
        item.ex.forEach((exId, k) => {
          const entry = active.entries[entryIndex++];
          assertEqual(entry.exId, exId);
          assertEqual(entry.sets.length, item.sets);
          entry.sets.forEach(st => {
            assertEqual(st.done, false);
            assert(!st.t, 'Timestamp should be falsy/null before completion');
            assert(st.r > 0, 'Reps should be positive');
          });
        });
      });

      // Verify DOM renders active workout container
      assert(app.exists('.active-top') || app.exists('.pbar'), 'Active workout header exists in DOM');
      assert(app.exists('[data-act="finish"]'), 'Finish workout button is visible');
    });

    it('starts planned workout Day B and Day C via templates sheet', () => {
      // Start Day B via templates sheet
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"][data-id="plan:B"]');
      app.clickAct('tpl-start');

      assertEqual(app.state.active.dayId, 'B');
      assert(app.state.active.entries.length > 0);

      // Discard Day B
      app.clickAct('discard');
      assertEqual(app.state.active, null);

      // Start Day C via templates sheet
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"][data-id="plan:C"]');
      app.clickAct('tpl-start');

      assertEqual(app.state.active.dayId, 'C');
      assert(app.state.active.entries.length > 0);
    });
  });

  // 2. START TEMPLATE WORKOUTS & COMMUNITY PROGRAMS
  describe('Start Template Workouts & Community Programs', () => {
    it('starts Starting Strength 5×5 Day A and Day B with 5 sets of 5 reps', () => {
      // 5x5 Day A
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"][data-id="ss-a"]');
      app.clickAct('tpl-start');

      const activeA = app.state.active;
      assert(activeA != null);
      assertEqual(activeA.name, '5×5 День A');
      assertEqual(activeA.entries[0].exId, 'squat');
      assertEqual(activeA.entries[0].sets.length, 5);
      assertEqual(activeA.entries[0].sets[0].r, 5);
      assertEqual(activeA.entries[1].exId, 'benchbb');
      assertEqual(activeA.entries[1].sets.length, 5);
      assertEqual(activeA.entries[2].exId, 'rowbb');
      assertEqual(activeA.entries[2].sets.length, 5);

      // Discard and verify Day B
      app.clickAct('discard');
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"][data-id="ss-b"]');
      app.clickAct('tpl-start');

      const activeB = app.state.active;
      assertEqual(activeB.name, '5×5 День B');
      assertEqual(activeB.entries[0].exId, 'squat');
      assertEqual(activeB.entries[0].sets.length, 5);
      assertEqual(activeB.entries[1].exId, 'ohpbb');
      assertEqual(activeB.entries[1].sets.length, 5);
      assertEqual(activeB.entries[2].exId, 'pullup');
      assertEqual(activeB.entries[3].exId, 'dips');
    });

    it('starts Golden Era Arnold Split with antagonistic superset pairings', () => {
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"][data-id="arnold-cb"]');
      app.clickAct('tpl-start');

      const active = app.state.active;
      assert(active != null);
      assertEqual(active.name, 'Грудь и спина (Арнольд)');

      // Supersets in Arnold Chest & Back:
      // Pair 0: benchbb (0) + pullup (1)
      assert(active.entries[0].ss != null);
      assertEqual(active.entries[0].ss, active.entries[1].ss, 'Bench and pullup share superset group');

      // Pair 1: incdb (2) + rowcable (3)
      assert(active.entries[2].ss != null);
      assertEqual(active.entries[2].ss, active.entries[3].ss, 'Incline db and cable row share superset group');

      // Pair 2: cablefly (4) + latpd (5)
      assert(active.entries[4].ss != null);
      assertEqual(active.entries[4].ss, active.entries[5].ss, 'Fly and lat pulldown share superset group');
    });

    it('starts Calisthenics program with bodyweight exercises and assistance modes', () => {
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"][data-id="cal-upper"]');
      app.clickAct('tpl-start');

      const active = app.state.active;
      assert(active != null);
      assertEqual(active.name, 'Воркаут: Верх тела');

      // Verify pullup and dips are marked as bodyweight
      const pullup = active.entries[0];
      assertEqual(pullup.exId, 'pullup');
      assert(app.state.ex.pullup.bw, 'Pullup must have bw=true flag');
      assertEqual(typeof pullup.sets[0].m, 'string', 'Bodyweight set must have mode m');
      assertEqual(pullup.sets[0].a, 0);
      assertEqual(pullup.sets[0].w, 0);

      // Verify Calisthenics Lower
      app.clickAct('discard');
      app.clickAct('tpls');
      app.click('[data-act="tpl-open"][data-id="cal-lower"]');
      app.clickAct('tpl-start');
      assertEqual(app.state.active.name, 'Воркаут: Низ и кор');
    });

    it('starts Bro-Split 5-Day program and validates all 5 days', () => {
      const broDays = [
        { id: 'bro-chest', name: 'Грудь (День 1)' },
        { id: 'bro-back', name: 'Спина (День 2)' },
        { id: 'bro-shoulders', name: 'Плечи (День 3)' },
        { id: 'bro-arms', name: 'Руки (День 4)' },
        { id: 'bro-legs', name: 'Ноги и пресс (День 5)' }
      ];

      for (const day of broDays) {
        app.clickAct('tpls');
        app.click(`[data-act="tpl-open"][data-id="${day.id}"]`);
        app.clickAct('tpl-start');

        assertEqual(app.state.active.name, day.name);
        assert(app.state.active.entries.length >= 4, `${day.name} should have >= 4 exercises`);

        // Day 4 (bro-arms) has supersets
        if (day.id === 'bro-arms') {
          assertEqual(app.state.active.entries[0].ss, app.state.active.entries[1].ss);
          assertEqual(app.state.active.entries[2].ss, app.state.active.entries[3].ss);
        }

        app.clickAct('discard');
      }
    });
  });

  // 3. START EMPTY WORKOUT & ADD EXERCISE
  describe('Start Empty Workout & Add Exercise', () => {
    it('starts an empty workout and adds exercises from picker', () => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');

      assertEqual(app.state.active.dayId, 'free');
      assertEqual(app.state.active.entries.length, 0);
      assert(app.exists('.empty'), 'Empty active workout view shows empty state message');

      // Open picker
      app.clickAct('addex');
      assert(app.exists('#sheet'), 'Picker bottom sheet is displayed');

      // Pick bench press
      app.clickAct('pick-ex', { id: 'benchbb' });
      assertEqual(app.state.active.entries.length, 1);
      assertEqual(app.state.active.entries[0].exId, 'benchbb');
      assertEqual(app.state.active.entries[0].sets.length, 1, 'Initial sets count is 1');

      // Add a second exercise: rowdb
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'rowdb' });
      assertEqual(app.state.active.entries.length, 2);
      assertEqual(app.state.active.entries[1].exId, 'rowdb');
    });
  });

  // 4. ADJUST WEIGHT & REPS WITH STEPPERS
  describe('Adjust Weight & Reps with Steppers and Inputs', () => {
    beforeEach(() => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'benchbb' });
    });

    it('adjusts weight using positive and negative steppers and clamps to 0', () => {
      const step = 2.5;
      const initialWeight = app.state.active.entries[0].sets[0].w;

      // Click +2.5 stepper on first set
      app.clickAct('step', { e: 0, s: 0, k: 'w', d: '2.5' });
      assertEqual(app.state.active.entries[0].sets[0].w, initialWeight + step);

      // Click -2.5 stepper
      app.clickAct('step', { e: 0, s: 0, k: 'w', d: '-2.5' });
      assertEqual(app.state.active.entries[0].sets[0].w, initialWeight);

      // Set weight to 1.0 directly and click -2.5: should clamp to 0
      app.state.active.entries[0].sets[0].w = 1.0;
      app.setState(app.state);
      app.clickAct('step', { e: 0, s: 0, k: 'w', d: '-2.5' });
      assertEqual(app.state.active.entries[0].sets[0].w, 0);
    });

    it('adjusts reps using steppers and direct input fill', () => {
      // Increase reps by 1
      const initialReps = app.state.active.entries[0].sets[0].r;
      app.clickAct('step', { e: 0, s: 0, k: 'r', d: '1' });
      assertEqual(app.state.active.entries[0].sets[0].r, initialReps + 1);

      // Decrease reps by 1
      app.clickAct('step', { e: 0, s: 0, k: 'r', d: '-1' });
      assertEqual(app.state.active.entries[0].sets[0].r, initialReps);

      // Direct input fill
      const rInput = app.query('input[data-k="r"][data-e="0"][data-s="0"]');
      app.fill(rInput, '15');
      assertEqual(app.state.active.entries[0].sets[0].r, 15);
    });

    it('switches bodyweight exercise mode between assistance and weight (bwmode)', () => {
      // Add pullup (bodyweight exercise)
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'pullup' });

      const pullupEntry = app.state.active.entries[1];
      assertEqual(pullupEntry.exId, 'pullup');
      assertEqual(pullupEntry.sets[0].m, 'w', 'Default mode is w');

      // Set weight to 10
      pullupEntry.sets[0].w = 10;
      app.setState(app.state);

      // Toggle to assistance mode
      app.clickAct('bwmode', { e: 1, s: 0 });
      assertEqual(pullupEntry.sets[0].m, 'a');
      assertEqual(pullupEntry.sets[0].a, 10, 'Previous weight transferred to assistance');
      assertEqual(pullupEntry.sets[0].w, 0);

      // Toggle back to weight mode
      app.clickAct('bwmode', { e: 1, s: 0 });
      assertEqual(pullupEntry.sets[0].m, 'w');
      assertEqual(pullupEntry.sets[0].w, 10, 'Assistance transferred back to weight');
      assertEqual(pullupEntry.sets[0].a, 0);
    });
  });

  // 5. ADD / REMOVE SETS
  describe('Add and Remove Sets in Active Exercise', () => {
    beforeEach(() => {
      app.clickAct('tpls');
      app.clickAct('tpl-empty');
      app.clickAct('addex');
      app.clickAct('pick-ex', { id: 'squat' });
    });

    it('adds a new set cloning weight and reps of previous set with done=false', () => {
      const entry = app.state.active.entries[0];
      assertEqual(entry.sets.length, 1);
      entry.sets[0].w = 95;
      entry.sets[0].r = 6;
      app.setState(app.state);

      // Click addset
      app.clickAct('addset', { e: 0 });
      assertEqual(entry.sets.length, 2);
      assertEqual(entry.sets[1].w, 95);
      assertEqual(entry.sets[1].r, 6);
      assertEqual(entry.sets[1].done, false);
      assertEqual(entry.sets[1].t, null);
    });

    it('removes last set with delset, prompting confirmation if marked done', () => {
      const entry = app.state.active.entries[0];
      assertEqual(entry.sets.length, 1);

      // Add a second and third set
      app.clickAct('addset', { e: 0 });
      app.clickAct('addset', { e: 0 });
      assertEqual(entry.sets.length, 3);

      // Delete undone set (no prompt needed)
      app.clickAct('delset', { e: 0 });
      assertEqual(entry.sets.length, 2);

      // Mark remaining set done
      entry.sets[1].done = true;
      app.setState(app.state);

      // Attempt to delete done set with confirm rejected
      app.setConfirm(false);
      app.clickAct('delset', { e: 0 });
      assertEqual(entry.sets.length, 2, 'Set was not deleted because confirm returned false');

      // Attempt to delete done set with confirm accepted
      app.setConfirm(true);
      app.clickAct('delset', { e: 0 });
      assertEqual(entry.sets.length, 1, 'Set deleted on confirmed prompt');
    });
  });

  // 6. COMPLETE SETS AND FINISH WORKOUT
  describe('Complete Sets and Finish Workout', () => {
    beforeEach(() => {
      app.clickAct('start', { day: 'A' });
    });

    it('toggles set done, records timestamp, and activates rest timer', () => {
      const set0 = app.state.active.entries[0].sets[0];
      assertEqual(set0.done, false);
      assert(!set0.t);

      // Complete set
      app.clickAct('done', { e: 0, s: 0 });
      assertEqual(set0.done, true);
      assert(typeof set0.t === 'number' && set0.t > 0, 'Completion timestamp recorded');
      assert(app.state.active.rest != null, 'Rest timer started on set completion');

      // Untoggle set
      app.clickAct('done', { e: 0, s: 0 });
      assertEqual(set0.done, false);
      assertEqual(set0.t, null);
    });

    it('blocks finishing workout when 0 sets are completed and displays toast', () => {
      // Attempt to finish without marking any set done
      app.clickAct('finish');

      assert(app.state.active != null, 'Workout must remain active');
      assert(app.exists('#toast'), 'Toast container must exist');
      assertEqual(app.text('#toast'), 'Отметь ✓ хотя бы один подход с повторами');
    });

    it('finishes workout, saves session into history, and navigates to summary view', () => {
      // Mark set 0 and set 1 done
      app.clickAct('done', { e: 0, s: 0 });
      app.clickAct('done', { e: 0, s: 1 });

      const initialHistoryCount = app.state.sessions.length;

      // Finish workout with prompt accepted for uncompleted sets
      app.setConfirm(true);
      app.clickAct('finish');

      // Active session cleared
      assertEqual(app.state.active, null, 'Active workout cleared on finish');
      assertEqual(app.state.sessions.length, initialHistoryCount + 1, 'Session added to history');

      // Verified summary view rendered
      assert(app.ui.sub != null && app.ui.sub.view === 'summary', 'UI transitioned to summary view');
      assert(app.exists('.bignum'), 'Summary tonnage displayed');
      assert(app.exists('[data-act="closesum"]'), 'Close summary button visible');

      // Close summary returns to train hero
      app.clickAct('closesum');
      assertEqual(app.ui.sub, null);
      assertEqual(app.ui.tab, 'train');
      assert(app.exists('.hero-title'), 'Returned to main train tab hero');
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
