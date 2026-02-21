export function updateSearchParams(
  currentParams: URLSearchParams,
  updates: Record<string, string | number | null | undefined>
): string {
  const newSearchParams = new URLSearchParams(currentParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, String(value));
    }
  }

  return newSearchParams.toString();
}
