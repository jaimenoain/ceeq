export function getRedirectPath() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return '/searcher/dashboard';
  }
  return '/login';
}
