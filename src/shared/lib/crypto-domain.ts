'use server';

import crypto from 'node:crypto';

/**
 * Normalizes a domain by stripping protocol, www, and paths.
 *
 * Rules:
 * 1. Remove http:// or https://
 * 2. Remove www. prefix (if present at the start after protocol removal)
 * 3. Remove everything after the first / (paths/query params)
 *
 * @param url The raw URL string
 * @returns The normalized domain string
 */
export function normalizeDomain(url: string): string {
  // 1. Remove protocol (http:// or https://)
  let domain = url.replace(/^https?:\/\//i, '');

  // 2. Remove www. prefix
  domain = domain.replace(/^www\./i, '');

  // 3. Remove path and query parameters (everything after the first /)
  const slashIndex = domain.indexOf('/');
  if (slashIndex !== -1) {
    domain = domain.substring(0, slashIndex);
  }

  // 4. Remove query parameters if they exist without a slash (e.g., domain.com?q=1)
  const queryIndex = domain.indexOf('?');
  if (queryIndex !== -1) {
    domain = domain.substring(0, queryIndex);
  }

  return domain;
}

/**
 * Hashes a normalized domain using HMAC-SHA256 and a server-side secret.
 *
 * @param normalizedDomain The domain string to hash
 * @returns A 64-character hex string representing the hash
 * @throws Error if DOMAIN_HASH_SECRET environment variable is missing
 */
export function hashDomain(normalizedDomain: string): string {
  const secret = process.env.DOMAIN_HASH_SECRET;

  if (!secret) {
    throw new Error('DOMAIN_HASH_SECRET is not defined');
  }

  // Create HMAC using SHA-256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(normalizedDomain);

  return hmac.digest('hex');
}
