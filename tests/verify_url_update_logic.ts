import { updateSearchParams } from '../src/features/sourcing/lib/url-utils';

console.log('Verifying URL update logic...');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

// Test Case 1: Add a new parameter
{
  const current = new URLSearchParams('');
  const result = updateSearchParams(current, { search: 'test' });
  assert(result === 'search=test', 'Should add search parameter');
}

// Test Case 2: Update existing parameter
{
  const current = new URLSearchParams('search=test');
  const result = updateSearchParams(current, { search: 'new' });
  assert(result === 'search=new', 'Should update search parameter');
}

// Test Case 3: Remove parameter (null)
{
  const current = new URLSearchParams('search=test&page=1');
  const result = updateSearchParams(current, { search: null });
  assert(result === 'page=1', 'Should remove parameter when value is null');
}

// Test Case 4: Remove parameter (undefined)
{
  const current = new URLSearchParams('search=test&page=1');
  const result = updateSearchParams(current, { search: undefined });
  assert(result === 'page=1', 'Should remove parameter when value is undefined');
}

// Test Case 5: Remove parameter (empty string)
{
  const current = new URLSearchParams('search=test&page=1');
  const result = updateSearchParams(current, { search: '' });
  assert(result === 'page=1', 'Should remove parameter when value is empty string');
}

// Test Case 6: Multiple updates
{
  const current = new URLSearchParams('search=old&page=1&limit=10');
  const result = updateSearchParams(current, { search: 'new', page: 2, limit: null });
  // Order of query params is not guaranteed in all environments but typically follows insertion order or browser impl.
  // URLSearchParams implementation in Node usually preserves order or appends new ones.
  // Let's check if the string contains the expected parts.
  const hasSearch = result.includes('search=new');
  const hasPage = result.includes('page=2');
  const hasLimit = result.includes('limit=');
  assert(hasSearch && hasPage && !hasLimit, 'Should handle multiple updates (add/update/remove)');
}

// Test Case 7: Status Filter
{
    const current = new URLSearchParams('page=1');
    const result = updateSearchParams(current, { status: 'UNTOUCHED' });
    assert(result.includes('status=UNTOUCHED'), 'Should add status filter');
}

// Test Case 8: Pagination Reset
{
    // Simulation of handleSearchChange: updateUrl({ search: value, page: 1 })
    const current = new URLSearchParams('page=5&search=old');
    const result = updateSearchParams(current, { search: 'new', page: 1 });
    assert(result.includes('search=new') && result.includes('page=1'), 'Should update search and reset page');
}

console.log('All URL update logic tests passed.');
