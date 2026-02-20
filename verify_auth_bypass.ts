
import { getInitialUser } from './src/shared/components/providers/dummy-auth-provider';
import { getRedirectPath } from './src/shared/lib/auth-utils';

console.log('Running Auth Bypass Verification...');

// 1. Verify getInitialUser with mocks enabled
process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
const userWithMocks = getInitialUser();
if (userWithMocks && userWithMocks.role === 'SEARCHER' && userWithMocks.name === 'Jane Analyst') {
    console.log('✅ Auth Verification Passed: Mock user correctly injected when mocks are enabled.');
} else {
    console.error('❌ Auth Verification Failed: Mock user incorrect.', userWithMocks);
    process.exit(1);
}

// 2. Verify getRedirectPath with mocks enabled
const redirectWithMocks = getRedirectPath();
if (redirectWithMocks === '/searcher/dashboard') {
    console.log('✅ Redirect Verification Passed: Correct redirect path when mocks are enabled.');
} else {
    console.error('❌ Redirect Verification Failed: Incorrect redirect path.', redirectWithMocks);
    process.exit(1);
}

// 3. Verify getInitialUser with mocks disabled
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
const userWithoutMocks = getInitialUser();
if (userWithoutMocks === null) {
    console.log('✅ Auth Verification Passed: No user injected when mocks are disabled.');
} else {
    console.error('❌ Auth Verification Failed: User injected when mocks are disabled.', userWithoutMocks);
    process.exit(1);
}

// 4. Verify getRedirectPath with mocks disabled
const redirectWithoutMocks = getRedirectPath();
if (redirectWithoutMocks === '/login') {
    console.log('✅ Redirect Verification Passed: Correct redirect path when mocks are disabled.');
} else {
    console.error('❌ Redirect Verification Failed: Incorrect redirect path.', redirectWithoutMocks);
    process.exit(1);
}
