import { describe, it, expect } from 'vitest';
import { normalizeDomain, hashDomain } from '../../src/shared/lib/crypto-domain';

describe('Crypto Domain Logic', () => {
  it('normalizes and hashes visually different URLs to the exact same value', () => {
    const url1 = 'https://www.acme.com/about';
    const url2 = 'http://acme.com';
    const url3 = 'ACME.COM/';

    const hash1 = hashDomain(normalizeDomain(url1));
    const hash2 = hashDomain(normalizeDomain(url2));
    const hash3 = hashDomain(normalizeDomain(url3));

    // Verify all hashes match
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);

    // Verify they are valid SHA-256 strings
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);

    // Explicit verification of the normalization behavior
    const norm1 = normalizeDomain(url1);
    const norm2 = normalizeDomain(url2);
    const norm3 = normalizeDomain(url3);

    expect(norm1).toBe('acme.com');
    expect(norm2).toBe('acme.com');
    expect(norm3).toBe('acme.com');
  });
});
