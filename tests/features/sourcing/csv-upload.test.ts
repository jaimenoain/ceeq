import { describe, it, expect } from 'vitest';
import { normalizeDomain } from '../../../src/features/sourcing/lib/domain-utils';

describe('normalizeDomain', () => {
  it('should remove http protocol', () => {
    expect(normalizeDomain('http://google.com')).toBe('google.com');
  });

  it('should remove https protocol', () => {
    expect(normalizeDomain('https://google.com')).toBe('google.com');
  });

  it('should remove www prefix', () => {
    expect(normalizeDomain('www.google.com')).toBe('google.com');
  });

  it('should remove both protocol and www', () => {
    expect(normalizeDomain('https://www.google.com')).toBe('google.com');
  });

  it('should remove path', () => {
    expect(normalizeDomain('google.com/path/to/resource')).toBe('google.com');
  });

  it('should remove query parameters', () => {
    expect(normalizeDomain('google.com?query=param')).toBe('google.com');
  });

  it('should handle uppercase input', () => {
    expect(normalizeDomain('GOOGLE.COM')).toBe('google.com');
  });

  it('should handle trailing slash', () => {
    expect(normalizeDomain('google.com/')).toBe('google.com');
  });

  it('should handle complex cases', () => {
    expect(normalizeDomain('https://www.google.com/test?q=1')).toBe('google.com');
  });

  it('should handle whitespace', () => {
    expect(normalizeDomain('  google.com  ')).toBe('google.com');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeDomain('')).toBe('');
  });
});
