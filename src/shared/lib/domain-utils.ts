export function normalizeDomain(url: string): string {
  if (!url) return '';

  let domain = url.trim().toLowerCase();

  // Remove protocol
  if (domain.startsWith('http://')) {
    domain = domain.substring(7);
  } else if (domain.startsWith('https://')) {
    domain = domain.substring(8);
  }

  // Remove www.
  if (domain.startsWith('www.')) {
    domain = domain.substring(4);
  }

  // Remove path and query params
  const pathIndex = domain.indexOf('/');
  if (pathIndex !== -1) {
    domain = domain.substring(0, pathIndex);
  }

  const queryIndex = domain.indexOf('?');
  if (queryIndex !== -1) {
    domain = domain.substring(0, queryIndex);
  }

  return domain;
}
