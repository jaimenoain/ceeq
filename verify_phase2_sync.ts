import fs from 'fs';
import path from 'path';

const AI_STATUS_PATH = path.join(process.cwd(), '.ai-status.md');
const ARCHITECTURE_PATH = path.join(process.cwd(), 'docs/ARCHITECTURE.md');
const DOMAIN_MODEL_PATH = path.join(process.cwd(), 'docs/DOMAIN_MODEL.md');
const MIDDLEWARE_PATH = path.join(process.cwd(), 'src/middleware.ts');
const SUPABASE_TYPES_PATH = path.join(process.cwd(), 'src/shared/types/supabase.ts');
const AUTH_SCHEMAS_PATH = path.join(process.cwd(), 'src/features/auth/schemas.ts');

function checkFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
}

function verifyAiStatus() {
  console.log('Verifying .ai-status.md...');
  const content = fs.readFileSync(AI_STATUS_PATH, 'utf-8');

  if (!content.includes('Phase 1 - COMPLETE')) {
    console.error('❌ .ai-status.md: Missing "Phase 1 - COMPLETE" marker. Historical record might be erased.');
    return false;
  }

  if (!content.includes('Phase 2 - Data Layer & Identity Provisioning')) {
    console.error('❌ .ai-status.md: Missing "Phase 2 - Data Layer & Identity Provisioning".');
    return false;
  }

  console.log('✅ .ai-status.md verified.');
  return true;
}

function verifyArchitectureMiddlewareSync() {
  console.log('Verifying Middleware Logic in ARCHITECTURE.md...');
  const middlewareContent = fs.readFileSync(MIDDLEWARE_PATH, 'utf-8');
  const architectureContent = fs.readFileSync(ARCHITECTURE_PATH, 'utf-8');

  // Check if middleware has specific routing logic
  const hasSearcherCheck = middlewareContent.includes("workspaceType === 'SEARCHER' && path.startsWith('/investor')");
  const hasInvestorCheck = middlewareContent.includes("workspaceType === 'INVESTOR' && path.startsWith('/searcher')");
  const hasAuthRedirect = middlewareContent.includes("if (hasSession && isAuthPage)");

  if (!hasSearcherCheck || !hasInvestorCheck || !hasAuthRedirect) {
    console.warn('⚠️ src/middleware.ts: Routing logic seems to have changed or is missing expected checks. This might indicate the verification script needs updating.');
  }

  // Verify Architecture docs
  // The documentation should mention:
  // 1. Redirecting authenticated users from auth pages.
  // 2. Tenant isolation / Role-based access (Searcher vs Investor).

  const archMentionsSearcherRedirect = architectureContent.includes('/searcher/') || architectureContent.includes('Searcher');
  const archMentionsInvestorRedirect = architectureContent.includes('/investor/') || architectureContent.includes('Investor');

  // Specific text we expect based on current middleware logic
  // The current middleware logic enforces strict redirects.
  // We check for keywords related to the implementation.
  const expectedKeywords = [
    "middleware.ts",
    "redirect",
    "Searcher",
    "Investor",
    "Forbidden", // or redirect
    "workspaceType"
  ];

  const missingKeywords = expectedKeywords.filter(k => !architectureContent.includes(k));

  if (missingKeywords.length > 0) {
      console.error(`❌ ARCHITECTURE.md: Missing key concepts related to middleware logic: ${missingKeywords.join(', ')}`);
      return false;
  }

  // More specific check for the logic
  const logicDescription = "If a user with a SEARCHER workspace type attempts to access /investor/*, immediately throw a 403 Forbidden or redirect to /searcher/dashboard.";
  if (!architectureContent.includes(logicDescription)) {
      console.warn("⚠️ ARCHITECTURE.md: Exact phrasing for Searcher -> Investor redirect logic might be missing. Checking for semantic equivalent...");
      if (!architectureContent.includes("redirect to /searcher/dashboard") && !architectureContent.includes("403 Forbidden")) {
          console.error("❌ ARCHITECTURE.md: Logic for redirecting Searcher accessing Investor routes is not documented.");
          return false;
      }
  }

  console.log('✅ Middleware logic documented in ARCHITECTURE.md.');
  return true;
}

function verifyZodSupabaseSync() {
  console.log('Verifying Zod Schemas vs Supabase Types...');
  const supabaseContent = fs.readFileSync(SUPABASE_TYPES_PATH, 'utf-8');
  const authSchemasContent = fs.readFileSync(AUTH_SCHEMAS_PATH, 'utf-8');

  // Check WorkspaceType enum in Supabase
  const hasSearcherEnum = supabaseContent.includes('"SEARCHER"');
  const hasInvestorEnum = supabaseContent.includes('"INVESTOR"');

  if (!hasSearcherEnum || !hasInvestorEnum) {
    console.error('❌ src/shared/types/supabase.ts: Missing SEARCHER or INVESTOR in WorkspaceType enum.');
    return false;
  }

  // Check OnboardingSubmitSchema in Zod
  // It should match the enum
  const hasZodEnum = authSchemasContent.includes('z.enum(["SEARCHER", "INVESTOR"]');

  if (!hasZodEnum) {
    console.error('❌ src/features/auth/schemas.ts: OnboardingSubmitSchema does not match WorkspaceType enum (SEARCHER, INVESTOR).');
    return false;
  }

  console.log('✅ Zod Schemas synced with Supabase Types.');
  return true;
}

function main() {
  console.log('🚀 Starting Phase 2 Sync Verification...');

  checkFileExists(AI_STATUS_PATH);
  checkFileExists(ARCHITECTURE_PATH);
  checkFileExists(MIDDLEWARE_PATH);
  checkFileExists(SUPABASE_TYPES_PATH);
  checkFileExists(AUTH_SCHEMAS_PATH);

  const statusOk = verifyAiStatus();
  const archOk = verifyArchitectureMiddlewareSync();
  const zodOk = verifyZodSupabaseSync();

  if (statusOk && archOk && zodOk) {
    console.log('🎉 All checks passed! Documentation is synchronized.');
    process.exit(0);
  } else {
    console.error('⚠️ Verification failed. Please update the documentation.');
    process.exit(1);
  }
}

main();
