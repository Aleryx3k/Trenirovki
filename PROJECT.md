# Project: Workout PWA/APK (Дневник тренировок)

## Architecture
- **Architecture Type**: Client-side Offline Single-Page Application (SPA) with native Capacitor bridge.
- **Data Layer**:
  - Primary persistent storage: `localStorage` key `workout-log-v1`.
  - Emergency snapshot backup: `localStorage` key `workout-log-v1-auto`.
  - Timestamp of auto-backup: `localStorage` key `workout-log-v1-auto-at`.
  - Corrupt stash: `localStorage` key `workout-log-v1-corrupt`.
  - Zero external network dependencies (no telemetry, no remote cloud sync, offline first).
- **Native Bridge Layer (Capacitor)**:
  - `@capacitor/local-notifications`: Background rest countdown alerts.
  - `@capacitor/haptics`: Vibration pulses on set and rest timer completion.
  - `@capacitor/filesystem`: Local JSON file creation for export sharing.
  - `@capacitor/share`: Native Android share sheet.
  - `WakeLockSentinel` / Screen keep-awake API.
- **Presentation Layer**:
  - `www/index.html`: Shell container with theme boot script, navigation tabs, timer bar, toast container.
  - `www/style.css`: Theme system (`steel` and `chalk`), responsive layouts, touch-optimized stepper controls, SVG chart styles.
  - `www/app.js`: State manager, view renderers (`vTrain`, `vHistory`, `vHDetail`, `vProgress`, `vPlan`, `vMore`), timer controller, and event dispatcher.
- **Build & Packaging**:
  - Reproducible npm package manifest (`package.json`).
  - Capacitor configuration (`capacitor.config.json`).
  - Single-file standalone HTML distribution bundler (`scripts/bundle-single.js`).
  - Automated Node.js / JSDOM test harness (`tests/`).

## Feature Inventory
Every feature identified during the Survey phase mapped to its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Start Planned Workout | Starts workout session from scheduled plan day (A, B, C) | M4 | Survey / spec_miner |
| 2 | Start Template Workout | Starts workout session from pre-made template | M4 | Survey / spec_miner |
| 3 | Start Empty Workout | Starts blank custom workout with exercise picker | M4 | Survey / spec_miner |
| 4 | Add Exercise to Workout | Appends an exercise card to active workout | M4 | Survey / spec_miner |
| 5 | Adjust Weight & Reps | Stepper buttons (±) or input for weight/assistance/reps | M4 | Survey / spec_miner |
| 6 | Toggle Set Done | Marks set completed, triggers rest timer | M2 | Survey / explorer_logic |
| 7 | Add / Remove Set | Appends new set or deletes last set in exercise | M4 | Survey / spec_miner |
| 8 | Bodyweight Mode Toggle (Live) | Toggles assistance weight vs added weight in active session | M4 | Survey / spec_miner |
| 9 | Bodyweight Mode Toggle (History) | Toggles assistance weight vs added weight on past sets (`hbw`) | M2 | Survey / explorer_logic |
| 10 | Remove Exercise from Workout | Removes exercise card (`skipex`) with orphan superset cleanup | M2 | Survey / explorer_logic |
| 11 | Screen Keep-Awake Lifecycle | Prevents screen dimming; handles async race conditions safely | M2 | Survey / explorer_logic |
| 12 | Finish Workout | Validates completed sets, calculates volume/PRs, saves to history | M4 | Survey / spec_miner |
| 13 | Discard Workout | Aborts active workout without saving; cleans up timers & locks | M2 | Survey / explorer_logic |
| 14 | Link Superset in Workout | Groups exercise with previous one, aligning set counts | M2 | Survey / explorer_logic |
| 15 | Unlink Superset | Disbands superset into separate standalone exercises | M4 | Survey / spec_miner |
| 16 | Superset Round Completion | Only starts rest when ALL exercises in round are marked done | M2 | Survey / explorer_logic |
| 17 | Superset Exercise Removal | Direct removal of exercise from within superset block | M2 | Survey / explorer_logic |
| 18 | Add / Remove Superset Round | Adds or removes a full round across exercises in superset | M4 | Survey / spec_miner |
| 19 | Rest Timer Countdown & Bar | Displays floating countdown bar with progress | M4 | Survey / spec_miner |
| 20 | Rest Timer Bounds Harmonization | Harmonizes minimum rest to 15s in saverest & cleanData, syncs input | M2 | Survey / explorer_logic |
| 21 | Extend Rest (+15s) | Adds 15 seconds to running rest countdown and notification | M4 | Survey / spec_miner |
| 22 | Stop Rest | Cancels running rest countdown immediately | M4 | Survey / spec_miner |
| 23 | Rest Cue (Haptic & Audio) | Vibrates / alerts when rest reaches zero | M4 | Survey / spec_miner |
| 24 | Rest Background Notification | Schedules exact alarm notification via LocalNotifications | M2 | Survey / explorer_logic |
| 25 | Active Rest Restore on Import | Calls `scheduleRestNotice()` on active rest resume | M2 | Survey / explorer_logic |
| 26 | Post-Workout Summary | Shows total tonnage, duration, PRs, and comparison to last workout | M4 | Survey / spec_miner |
| 27 | Session Log List | Chronological descending list of completed workouts | M4 | Survey / spec_miner |
| 28 | Workout Detail View | Inspection of past session with editable fields | M4 | Survey / spec_miner |
| 29 | Edit History Date | Changes calendar date of workout and syncs `s.start`/`s.end` | M2 | Survey / explorer_logic |
| 30 | Future Date Validation | Rejects future dates in workout, history, and body weight | M2 | Survey / explorer_logic |
| 31 | Edit Past Sets & Reps | Directly modifies weights or reps of logged workouts | M4 | Survey / spec_miner |
| 32 | Delete Past Set / Exercise | Removes set or exercise from history | M4 | Survey / spec_miner |
| 33 | Delete Entire Workout | Permanently removes session from history with confirmation | M4 | Survey / spec_miner |
| 34 | Progress Charts (1RM & Weight) | SVG charts for estimated 1RM (Epley) and working weight | M4 | Survey / spec_miner |
| 35 | Period Filter | Filters progress graphs by 3m, 6m, 1y, all | M4 | Survey / spec_miner |
| 36 | Volume Bar Chart | Aggregate tonnage lifted per week or month | M4 | Survey / spec_miner |
| 37 | Log Body Weight | Logs body weight in kg with date, validated [30, 250] | M4 | Survey / spec_miner |
| 38 | Delete Body Weight Entry | Removes weight entry with guard preventing 0 entries | M2 | Survey / explorer_logic |
| 39 | Plan Editor Schedule View | Displays scheduled plan items for days A, B, C | M4 | Survey / spec_miner |
| 40 | Plan Editor Reorder | Moves exercises up or down within a plan day | M4 | Survey / spec_miner |
| 41 | Plan Editor Sets & Reps Edit | Modifies target sets [1, 20] and reps string with change sync | M2 | Survey / explorer_logic |
| 42 | Plan Editor Add / Remove Exercise | Appends or deletes exercise in plan day | M4 | Survey / spec_miner |
| 43 | Exercise Catalog Search & Filter | Fast search and group filter; optimized single-pass `pickList` | M2 | Survey / explorer_logic |
| 44 | Create / Edit Custom Exercise | Adds custom exercise with validation | M4 | Survey / spec_miner |
| 45 | Soft-Delete Exercise | Hides exercise if used in history; deletes if unused | M4 | Survey / spec_miner |
| 46 | Visual Themes (Steel & Chalk) | Palette switching with early boot `meta[theme-color]` sync | M3 | Survey / explorer_ui |
| 47 | Android 8 CSS Fallbacks | Fallbacks for `color-mix()` on WebView < 111 | M3 | Survey / explorer_ui |
| 48 | Responsive Media Query Cascade | Proper ordering of `@media (max-width: 360px)` and safe-area | M3 | Survey / explorer_ui |
| 49 | Touch Target Sizing | Enlarge `.modebtn` and buttons to mobile touch standards (>=44px) | M3 | Survey / explorer_ui |
| 50 | Accessible Toast Component | Semantic `#toast` with safe-area positioning & resting awareness | M3 | Survey / explorer_ui |
| 51 | Form Focus Indication | Explicit `:focus` and `:focus-visible` styles for `select` | M3 | Survey / explorer_ui |
| 52 | Today Ring Box-Shadow Gap | Fix halo ring on `.wkd.today i` using `--hero-ring-gap` | M3 | Survey / explorer_ui |
| 53 | CSS Cleanup & Dead Code | Remove dead selector `.day`, consolidate trailing duplicates | M3 | Survey / explorer_ui |
| 54 | Accessibility (A11y) Semantics | ARIA roles, `role="timer"`, `aria-current`, `aria-hidden` SVGs | M3 | Survey / explorer_ui |
| 55 | Reduced Motion Support | `@media (prefers-reduced-motion: reduce)` support | M3 | Survey / explorer_ui |
| 56 | Manual Export / Import JSON | Export/import data; memory leak fix (`URL.revokeObjectURL`) | M2 | Survey / explorer_logic |
| 57 | Auto-Backup & Restore | Emergency snapshot in `workout-log-v1-auto`; restore feature | M4 | Survey / spec_miner |
| 58 | Factory Reset | Deletes all user data with double confirmation | M4 | Survey / spec_miner |
| 59 | Standalone Bundler | Single-file HTML generator script (`scripts/bundle-single.js`) | M1 | Survey / spec_miner |
| 60 | Build Infrastructure | `package.json`, Capacitor configs, npm test automation | M1 | Survey / spec_miner |
| 61 | Starting Strength 5×5 Program | Verified templates (Day A & Day B) with progressive loading | M4 | User follow-up |
| 62 | Golden Era Arnold Split Program | 3-day split with antagonistic supersets (Chest/Back, Shoulders/Arms, Legs) | M4 | User follow-up |
| 63 | Calisthenics Program | Bodyweight workout program with weighted / assistance gravitron options | M4 | User follow-up |
| 64 | Bro-Split 5-Day Program | 5-day classic hypertrophy program (Chest, Back, Shoulders, Arms, Legs) | M4 | User follow-up |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Build Infra & Automation | Reproducible `package.json`, Capacitor config, standalone HTML bundler script, automated Node.js test harness | none | DONE |
| M2 | Core Logic & Invariants | Fix all 14 logic, state, timing, leak, and performance defects in `www/app.js` | M1 | DONE |
| M3 | UI, Styling & Accessibility | Android 8 CSS fallbacks, media query cascade fix, touch targets, safe-area toast, A11y ARIA attributes, theme boot sync | M1 | DONE |
| M4 | E2E Testing & Final Gate | 100% pass on E2E test suite (Tiers 1–4) + Adversarial Coverage Hardening (Tier 5) + Forensic Audit | M2, M3 | PLANNED |
| E2E | E2E Testing Track | Independent opaque-box 4-tier test suite & harness | none | IN_PROGRESS (Conv: a5f03362-c92a-481c-a521-c2436d455f24) |

## Interface Contracts

### State Storage ↔ Application (`www/app.js`)
- Store Key: `workout-log-v1`
- Auto Key: `workout-log-v1-auto`
- Schema Version: `v: 1`
- `cleanData(raw)` contract: guarantees non-null object with valid `settings` (rest in [15, 600]), non-empty `plan`, non-empty `body` (minimum 1 entry), valid `sessions` array, and restored missing exercise stubs.
- Mode discriminator: `st.m: 'a' | 'w'` with backward compatibility: `bwMode(st) => st.m || (st.a > 0 ? 'a' : 'w')`.

### Shell ↔ Application (`www/index.html` ↔ `www/app.js`)
- Early Boot Theme Sync: Inline script in `<head>` reads `localStorage['workout-log-v1'].settings.theme`. If `'chalk'`, immediately applies `data-theme="chalk"` on `<html>` AND updates `<meta name="theme-color">` to `#170b0e`. Default `#0c1117` for `steel`.
- Landmark navigation: `<nav id="tabs">` with `aria-label="Основная навигация"`. In `render()`, active button receives `aria-current="page"`.
- Floating rest timer: `<aside id="rest" class="rest hidden" role="timer" aria-label="Таймер отдыха">`.
- Toast container: `<div id="toast" role="status" aria-live="polite" class="toast hidden">`.

### Stylesheet ↔ WebView Compatibility (`www/style.css`)
- Color Fallbacks:
  - `--card-open-border`: `#56728b` (steel), `#a2794d` (chalk).
  - `--accent-tint`: `rgba(123, 165, 201, 0.14)` (steel), `rgba(232, 184, 98, 0.14)` (chalk).
  - `--accent-tint-subtle`: `rgba(123, 165, 201, 0.08)` (steel), `rgba(232, 184, 98, 0.08)` (chalk).
  - `--hero-ring-gap`: `#1c2838` (steel), `#f5efe6` (chalk).
  - Fallback rule precedes `color-mix()` for every property.
- Media Queries:
  - Base rules defined first.
  - `@media (max-width: 360px)` placed at bottom to ensure 20px stepper font size and 10px main padding take effect.

## Code Layout
- **Exclusive Write Ownership**:
  - `M1 (Build Infra)`: `package.json`, `package-lock.json`, `capacitor.config.json`, `scripts/bundle-single.js`.
  - `M2 (Core Logic)`: `www/app.js`.
  - `M3 (UI & A11y)`: `www/index.html`, `www/style.css`.
  - `E2E Testing Track`: `tests/*`, `TEST_INFRA.md`, `TEST_READY.md`.
  - `M4 (Integration)`: verification and gate orchestration.
