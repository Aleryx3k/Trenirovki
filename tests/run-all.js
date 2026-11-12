#!/usr/bin/env node
'use strict';
/**
 * Workout App Automated Test Harness - Master Runner
 * Discovers and executes test suites across tiers, reports tabular metrics, and sets exit code.
 */
const fs = require('node:fs');
const path = require('node:path');
const { defaultRunner } = require('./harness/runner');
const assert = require('./harness/assert');

const TIERS = [
  { id: 'harness', name: 'Harness Self-Tests', dir: path.join(__dirname, 'harness') },
  { id: '1', name: 'Tier 1 (Feature Coverage)', dir: path.join(__dirname, 'tier1') },
  { id: '2', name: 'Tier 2 (Boundary & Corner)', dir: path.join(__dirname, 'tier2') },
  { id: '3', name: 'Tier 3 (Cross-Feature)', dir: path.join(__dirname, 'tier3') },
  { id: '4', name: 'Tier 4 (Real-World Scenarios)', dir: path.join(__dirname, 'tier4') }
];

function parseArgs(args) {
  const options = {
    tier: 'all',
    verbose: false,
    filter: null,
    bail: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') {
      options.help = true;
    } else if (a.startsWith('--tier=')) {
      options.tier = a.split('=')[1].toLowerCase().replace(/^tier/, '');
    } else if (a === '--tier' && i + 1 < args.length) {
      options.tier = args[++i].toLowerCase().replace(/^tier/, '');
    } else if (a === '--verbose' || a === '-v') {
      options.verbose = true;
    } else if (a.startsWith('--filter=')) {
      options.filter = new RegExp(a.split('=')[1], 'i');
    } else if (a === '--filter' && i + 1 < args.length) {
      options.filter = new RegExp(args[++i], 'i');
    } else if (a === '--bail' || a === '-b') {
      options.bail = true;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Workout App Test Runner
Usage: node tests/run-all.js [options]

Options:
  --tier=N         Filter by tier: harness, 1, 2, 3, 4, or all (default: all)
  --verbose, -v    Print each test case result as it executes
  --filter=REGEXP  Filter test file names by pattern
  --bail, -b       Stop immediately on first test failure
  --help, -h       Display this help message
`);
}

function findTestFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findTestFiles(fullPath));
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function exposeGlobals() {
  const runner = require('./harness/runner');
  globalThis.describe = runner.describe;
  globalThis.it = runner.it;
  globalThis.test = runner.test;
  globalThis.beforeEach = runner.beforeEach;
  globalThis.afterEach = runner.afterEach;
  globalThis.beforeAll = runner.beforeAll;
  globalThis.afterAll = runner.afterAll;

  globalThis.assert = assert;
  globalThis.assertEqual = assert.assertEqual;
  globalThis.assertNotEqual = assert.assertNotEqual;
  globalThis.assertDeepEqual = assert.assertDeepEqual;
  globalThis.assertMatch = assert.assertMatch;
  globalThis.assertThrows = assert.assertThrows;
  globalThis.assertRoughlyEqual = assert.assertRoughlyEqual;
  globalThis.AssertionError = assert.AssertionError;
}

function pad(str, len, align = 'left') {
  str = String(str);
  if (str.length >= len) return str.slice(0, len);
  const spaces = ' '.repeat(len - str.length);
  return align === 'right' ? spaces + str : str + spaces;
}

function printSummaryTable(tierStats, grandTotal) {
  console.log('\n' + '='.repeat(82));
  console.log(' WORKOUT APP E2E TEST SUITE REPORT');
  console.log('='.repeat(82));
  console.log(`┌──────────┬─────────────────────────────┬───────┬───────┬────────┬────────┬──────────┐`);
  console.log(`│ Tier     │ Description                 │ Files │ Tests │ Passed │ Failed │ Duration │`);
  console.log(`├──────────┼─────────────────────────────┼───────┼───────┼────────┼────────┼──────────┤`);

  for (const t of tierStats) {
    const id = pad(t.id, 8);
    const desc = pad(t.name, 27);
    const files = pad(t.files, 5, 'right');
    const tests = pad(t.tests, 5, 'right');
    const passed = pad(t.passed, 6, 'right');
    const failed = pad(t.failed, 6, 'right');
    const dur = pad(`${t.duration}ms`, 8, 'right');
    console.log(`│ ${id} │ ${desc} │ ${files} │ ${tests} │ ${passed} │ ${failed} │ ${dur} │`);
  }

  console.log(`├──────────┼─────────────────────────────┼───────┼───────┼────────┼────────┼──────────┤`);
  const totFiles = pad(grandTotal.files, 5, 'right');
  const totTests = pad(grandTotal.tests, 5, 'right');
  const totPassed = pad(grandTotal.passed, 6, 'right');
  const totFailed = pad(grandTotal.failed, 6, 'right');
  const totDur = pad(`${grandTotal.duration}ms`, 8, 'right');
  console.log(`│ ${pad('TOTAL', 8)} │ ${pad('', 27)} │ ${totFiles} │ ${totTests} │ ${totPassed} │ ${totFailed} │ ${totDur} │`);
  console.log(`└──────────┴─────────────────────────────┴───────┴───────┴────────┴────────┴──────────┘`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  exposeGlobals();

  const selectedTiers = TIERS.filter(t => options.tier === 'all' || options.tier === t.id);
  if (selectedTiers.length === 0) {
    console.error(`Error: Unknown tier "${options.tier}". Valid tiers are: harness, 1, 2, 3, 4, all.`);
    process.exit(1);
  }

  const tierStats = [];
  const grandTotal = { files: 0, tests: 0, passed: 0, failed: 0, duration: 0, failures: [] };
  const suiteStartTime = Date.now();

  for (const tier of selectedTiers) {
    const testFiles = findTestFiles(tier.dir);
    const filteredFiles = options.filter ? testFiles.filter(f => options.filter.test(f)) : testFiles;

    const currentTierStat = {
      id: tier.id,
      name: tier.name,
      files: filteredFiles.length,
      tests: 0,
      passed: 0,
      failed: 0,
      duration: 0
    };

    if (filteredFiles.length > 0) {
      if (options.verbose) {
        console.log(`\n--- Running [${tier.name}] (${filteredFiles.length} files) ---`);
      }

      for (const file of filteredFiles) {
        const relPath = path.relative(process.cwd(), file);
        if (options.verbose) console.log(`\n• File: ${relPath}`);

        defaultRunner.reset();
        try {
          delete require.cache[require.resolve(file)];
          require(file);
        } catch (loadErr) {
          console.error(`\nFailed to load test file: ${relPath}\n`, loadErr);
          currentTierStat.files++;
          currentTierStat.tests++;
          currentTierStat.failed++;
          grandTotal.failures.push({
            fullName: `${relPath} (Evaluation)`,
            error: loadErr,
            cleanStack: loadErr.stack
          });
          continue;
        }

        const runResult = await defaultRunner.run({ verbose: options.verbose, bail: options.bail });
        currentTierStat.tests += runResult.total;
        currentTierStat.passed += runResult.passed;
        currentTierStat.failed += runResult.failed;
        currentTierStat.duration += runResult.duration;

        if (runResult.failures.length > 0) {
          grandTotal.failures.push(...runResult.failures.map(f => ({ ...f, file: relPath })));
          if (options.bail) break;
        }
      }
    }

    tierStats.push(currentTierStat);
    grandTotal.files += currentTierStat.files;
    grandTotal.tests += currentTierStat.tests;
    grandTotal.passed += currentTierStat.passed;
    grandTotal.failed += currentTierStat.failed;

    if (options.bail && grandTotal.failed > 0) break;
  }

  grandTotal.duration = Date.now() - suiteStartTime;
  printSummaryTable(tierStats, grandTotal);

  if (grandTotal.failures.length > 0) {
    console.log('\n' + '-'.repeat(82));
    console.log(` FAILURES (${grandTotal.failures.length}):`);
    console.log('-'.repeat(82));
    grandTotal.failures.forEach((f, idx) => {
      console.log(`\n ${idx + 1}) ${f.file ? `[${f.file}] ` : ''}${f.fullName}`);
      console.log(`    Error: ${f.error.message}`);
      if (f.error.diff) {
        console.log(`    Diff:\n${f.error.diff}`);
      }
      if (f.cleanStack) {
        console.log(`    Stack:\n${f.cleanStack.split('\n').map(l => '      ' + l).join('\n')}`);
      }
    });
    console.log('\n' + '='.repeat(82));
    console.log(` STATUS: FAILED (${grandTotal.failed} failed, ${grandTotal.passed} passed out of ${grandTotal.tests} tests)`);
    console.log('='.repeat(82) + '\n');
    process.exit(1);
  } else {
    console.log('\n' + '='.repeat(82));
    console.log(` STATUS: SUCCESS (All ${grandTotal.tests} tests passed across ${grandTotal.files} files in ${grandTotal.duration}ms)`);
    console.log('='.repeat(82) + '\n');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Master runner fatal error:', err);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, findTestFiles };
