import { describe, it, expect } from 'vitest';
import { normalizeDomain, hashDomain } from '../src/shared/lib/crypto-domain';

describe('Domain Hashing Utility', () => {
    it('normalizes domains correctly', () => {
        expect(normalizeDomain('https://www.google.com')).toBe('google.com');
        expect(normalizeDomain('http://google.com')).toBe('google.com');
        expect(normalizeDomain('google.com')).toBe('google.com');
        expect(normalizeDomain('GOOGLE.COM')).toBe('google.com');
        expect(normalizeDomain('google.com/foo/bar')).toBe('google.com');
        expect(normalizeDomain('google.com?q=1')).toBe('google.com');
    });

    it('hashes domains deterministically', () => {
        const domain = 'example.com';
        const hash1 = hashDomain(domain);
        const hash2 = hashDomain(domain);
        expect(hash1).toBe(hash2);
    });

    it('produces 64-character SHA-256 hex string', () => {
        const hash = hashDomain('example.com');
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('maps visually different URLs to the same hash', () => {
        const urls = [
            'https://www.example.com',
            'http://example.com/',
            'example.com',
            'https://example.com/foo',
            'www.example.com?q=test'
        ];

        const hashes = urls.map(url => hashDomain(normalizeDomain(url)));
        const firstHash = hashes[0];

        hashes.forEach(hash => {
            expect(hash).toBe(firstHash);
        });
    });
});
