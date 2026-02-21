'use server';

import crypto from 'node:crypto';
import { normalizeDomain } from './domain-utils';

export { normalizeDomain };

/**
 * Hashes a normalized domain using SHA-256.
 *
 * @param normalizedDomain The domain string to hash
 * @returns A 64-character hex string representing the hash
 */
export function hashDomain(normalizedDomain: string): string {
  return crypto.createHash('sha256').update(normalizedDomain).digest('hex');
}
