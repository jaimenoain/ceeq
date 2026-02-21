
import { getProtectedRedirect } from '../src/middleware';
import { strict as assert } from 'assert';

console.log('Running Middleware Logic Verification...');

const tests = [
  // 1. Unauthenticated Access
  { path: '/searcher/dashboard', hasSession: false, wsType: null, expected: '/login' },
  { path: '/investor/deals', hasSession: false, wsType: null, expected: '/login' },
  { path: '/public', hasSession: false, wsType: null, expected: null }, // Public routes ignored
  { path: '/login', hasSession: false, wsType: null, expected: null }, // Allow login page

  // 2. Authenticated, No Workspace
  { path: '/searcher/dashboard', hasSession: true, wsType: null, expected: '/onboarding' },
  { path: '/investor/dashboard', hasSession: true, wsType: null, expected: '/onboarding' },
  { path: '/onboarding', hasSession: true, wsType: null, expected: null }, // Allowed
  { path: '/login', hasSession: true, wsType: null, expected: '/onboarding' }, // Redirect to onboarding if no workspace

  // 3. Searcher Access
  { path: '/investor/deals', hasSession: true, wsType: 'SEARCHER', expected: '/searcher/dashboard' }, // Wrong Role -> Dashboard
  { path: '/searcher/dashboard', hasSession: true, wsType: 'SEARCHER', expected: null }, // Correct Role -> Allow
  { path: '/searcher/deals', hasSession: true, wsType: 'SEARCHER', expected: null },
  { path: '/login', hasSession: true, wsType: 'SEARCHER', expected: '/searcher/dashboard' }, // Redirect away from login
  { path: '/signup', hasSession: true, wsType: 'SEARCHER', expected: '/searcher/dashboard' }, // Redirect away from signup

  // 4. Investor Access
  { path: '/searcher/deals', hasSession: true, wsType: 'INVESTOR', expected: '/investor/dashboard' }, // Wrong Role -> Dashboard
  { path: '/investor/dashboard', hasSession: true, wsType: 'INVESTOR', expected: null }, // Correct Role -> Allow
  { path: '/investor/deals', hasSession: true, wsType: 'INVESTOR', expected: null },
  { path: '/login', hasSession: true, wsType: 'INVESTOR', expected: '/investor/dashboard' }, // Redirect away from login
  { path: '/signup', hasSession: true, wsType: 'INVESTOR', expected: '/investor/dashboard' }, // Redirect away from signup
];

let failures = 0;

for (const t of tests) {
  // Use 'any' for wsType to match string literals if strict typing is an issue in test without explicit type import
  const actual = getProtectedRedirect(t.path, t.hasSession, t.wsType as any);
  try {
    assert.equal(actual, t.expected);
    // console.log(`✅ Passed: ${t.path} [${t.hasSession ? (t.wsType || 'No WS') : 'No Session'}] -> ${actual ?? 'ALLOW'}`);
  } catch (e) {
    console.error(`❌ Failed: ${t.path} [${t.hasSession ? (t.wsType || 'No WS') : 'No Session'}]`);
    console.error(`   Expected: ${t.expected ?? 'ALLOW'}`);
    console.error(`   Actual:   ${actual ?? 'ALLOW'}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} tests failed.`);
  process.exit(1);
}

console.log(`\nAll ${tests.length} tests passed!`);
