
import fs from 'fs';
import path from 'path';
import { NextRequest } from './mocks/next_server';

console.log('Running Middleware Execution Test (Risk Area 2 Fix)...');

const middlewarePath = path.join(process.cwd(), 'src/middleware.ts');
const tempMiddlewarePath = path.join(process.cwd(), 'tests/temp_middleware.ts');

async function runTest() {
  try {
    // 1. Prepare Temp File
    let content = fs.readFileSync(middlewarePath, 'utf-8');

    // Replace imports
    content = content.replace(
      "import { createServerClient } from '@supabase/ssr'",
      "import { createServerClient } from './mocks/supabase_ssr'"
    );

    content = content.replace(
      "import { NextResponse, type NextRequest } from 'next/server'",
      "import { NextResponse, NextRequest } from './mocks/next_server'"
    );

    // Replace aliases
    content = content.replace(/@\/shared\/types\/supabase/g, '../src/shared/types/supabase');
    content = content.replace(/@\/shared\/types\/api/g, '../src/shared/types/api');

    fs.writeFileSync(tempMiddlewarePath, content);
    console.log('Created temporary middleware file with mocks.');

    // 2. Dynamic Import
    // We use a query parameter to bypass cache if re-running in same process (unlikely here but safe)
    // @ts-ignore
    const { middleware } = await import('./temp_middleware');

    // 3. Execution Logic
    // Scenario: User accesses /searcher/dashboard
    // Mock user has workspaceType: 'INVESTOR'
    // Should redirect to /investor/dashboard
    // Should have refreshed cookies ('sb-access-token')

    const req = new NextRequest('http://localhost:3000/searcher/dashboard', {
      headers: { cookie: 'sb-access-token=old-token' },
    });

    const response = await middleware(req);

    // Verify Redirect
    const location = response.headers.get('Location');
    console.log(`Debug: Location header: ${location}`);

    if (!location || !location.includes('/investor/dashboard')) {
      // Mock returns workspaceType: 'INVESTOR'
      // Path starts with '/searcher'
      // getProtectedRedirect -> '/investor/dashboard'
      console.error(`❌ Failed: Expected redirect to /investor/dashboard, got ${location}`);
      process.exit(1);
    }
    console.log(`✅ Redirect verify: Got ${location}`);

    // Verify Cookies (Session Persistence)
    // The mock createServerClient sets 'sb-access-token' to 'refreshed-token' via setAll
    // middleware calls setAll -> updates 'response' cookies
    // middleware copies 'response' cookies to 'redirectResponse' cookies

    // Check redirectResponse cookies
    const cookies = response.cookies.getAll();
    // console.log('Debug: Cookies found:', cookies);

    const hasRefreshedToken = cookies.some((c: any) => c.name === 'sb-access-token' && c.value === 'refreshed-token');

    if (!hasRefreshedToken) {
      console.error('❌ Failed: Session cookies were not copied to the redirect response.');
      console.log('Cookies found:', cookies);
      process.exit(1);
    }
    console.log('✅ Session Persistence verify: Refreshed token found in redirect response.');

    console.log('\nAll execution tests passed!');
  } catch (err) {
    console.error('❌ Execution Error:', err);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(tempMiddlewarePath)) {
      fs.unlinkSync(tempMiddlewarePath);
      console.log('Cleaned up temp file.');
    }
  }
}

runTest();
