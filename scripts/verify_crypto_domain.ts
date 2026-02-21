import assert from 'node:assert';
// @ts-ignore
import { normalizeDomain, hashDomain } from '../src/shared/lib/crypto-domain';

console.log('Starting verification of Cryptographic Domain Hashing Utility...');

async function verify() {
  console.log('Verifying normalizeDomain...');

  // Test case 1: Strips protocol and path
  const test1 = 'https://www.acme.com/about';
  const expected1 = 'acme.com';
  try {
    assert.strictEqual(normalizeDomain(test1), expected1, `Failed to strip protocol/path from ${test1}`);
    console.log('Passed: Protocol and path stripping');
  } catch (e) {
    console.error(`Failed: Protocol and path stripping. Expected ${expected1}, got ${normalizeDomain(test1)}`);
    throw e;
  }

  // Test case 2: Strips only protocol
  const test2 = 'http://startup.io/';
  const expected2 = 'startup.io';
  try {
    assert.strictEqual(normalizeDomain(test2), expected2, `Failed to strip http protocol from ${test2}`);
    console.log('Passed: Simple http stripping');
  } catch (e) {
    console.error(`Failed: Simple http stripping. Expected ${expected2}, got ${normalizeDomain(test2)}`);
    throw e;
  }

  // Test case 3: Strips www prefix
  const test3 = 'www.sub.domain.co.uk';
  const expected3 = 'sub.domain.co.uk';
  try {
    assert.strictEqual(normalizeDomain(test3), expected3, `Failed to strip www from ${test3}`);
    console.log('Passed: www prefix stripping');
  } catch (e) {
    console.error(`Failed: www prefix stripping. Expected ${expected3}, got ${normalizeDomain(test3)}`);
    throw e;
  }

  // Test case 4: Strips query parameters without slash
  const test4 = 'acme.com?foo=bar';
  const expected4 = 'acme.com';
  try {
    assert.strictEqual(normalizeDomain(test4), expected4, `Failed to strip query params from ${test4}`);
    console.log('Passed: Query parameters stripping');
  } catch (e) {
    console.error(`Failed: Query parameters stripping. Expected ${expected4}, got ${normalizeDomain(test4)}`);
    throw e;
  }

  console.log('Verifying hashDomain...');

  const domain = 'acme.com';
  let hash1, hash2;

  try {
    hash1 = hashDomain(domain);
    hash2 = hashDomain(domain);
  } catch (e) {
    console.error('Failed to execute hashDomain');
    throw e;
  }

  // Assert deterministic output
  try {
    assert.strictEqual(hash1, hash2, 'Hash output must be deterministic');
    console.log('Passed: Deterministic output');
  } catch (e) {
    console.error('Failed: Deterministic output check');
    throw e;
  }

  // Assert format (64-char hex string)
  try {
    assert.match(hash1, /^[a-f0-9]{64}$/, 'Hash output must be a 64-character hex string');
    console.log('Passed: Output format (64-char hex)');
  } catch (e) {
    console.error(`Failed: Output format. Got ${hash1}`);
    throw e;
  }

  // Verify consistent hashing across different formats
  console.log('Verifying consistency across formats...');
  const raw1 = 'https://www.Example.com/';
  const raw2 = 'http://example.com';
  const raw3 = 'example.com';

  const n1 = normalizeDomain(raw1);
  const n2 = normalizeDomain(raw2);
  const n3 = normalizeDomain(raw3);

  assert.strictEqual(n1, 'example.com');
  assert.strictEqual(n2, 'example.com');
  assert.strictEqual(n3, 'example.com');

  const h1 = hashDomain(n1);
  const h2 = hashDomain(n2);
  const h3 = hashDomain(n3);

  assert.strictEqual(h1, h2, 'https://www.Example.com/ hash mismatch');
  assert.strictEqual(h1, h3, 'example.com hash mismatch');
  console.log('Passed: Consistent hashing across formats');

  console.log('All verifications passed!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
