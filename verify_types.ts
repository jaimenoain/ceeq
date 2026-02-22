import { Database } from './src/shared/types/supabase';

console.log('Verifying Types...');

// Helper to ensure type safety without runtime execution
function assertType<T>(value: T) {}

// 1. Verify Tables exist and match expected structure
type Tables = Database['public']['Tables'];

// 2. Verify Enums
type Enums = Database['public']['Enums'];
const role: Enums['Role'] = 'ADMIN'; // Should be 'ADMIN' | 'ANALYST'
const workspaceType: Enums['WorkspaceType'] = 'SEARCHER'; // Should be 'SEARCHER' | 'INVESTOR'
const subscriptionPlan: Enums['SubscriptionPlan'] = 'FREE';
const dealStage: Enums['DealStage'] = 'INBOX';
const dealStatus: Enums['DealStatus'] = 'ACTIVE';
const visibilityTier: Enums['VisibilityTier'] = 'TIER_1_PRIVATE';

// 3. Verify Table Rows (Select)
const workspace: Tables['Workspace']['Row'] = {
  id: 'uuid-string',
  workspaceType: 'SEARCHER',
  name: 'Test Workspace',
  stripeCustomerId: null,
  subscriptionPlan: 'FREE',
  createdAt: new Date().toISOString(),
  deletedAt: null
};

const user: Tables['User']['Row'] = {
  id: 'uuid-string',
  workspaceId: 'uuid-string',
  role: 'ADMIN',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  linkedinUrl: null,
  emailNotifications: true
};

const company: Tables['Company']['Row'] = {
  id: 'uuid-string',
  workspaceId: 'uuid-string',
  name: 'Test Company',
  domain: 'example.com',
  hashedDomain: 'hash',
  industry: null,
  location: null,
  employees: null
};

const deal: Tables['Deal']['Row'] = {
  id: 'uuid-string',
  workspaceId: 'uuid-string',
  companyId: 'uuid-string',
  stage: 'INBOX',
  status: 'ACTIVE',
  visibilityTier: 'TIER_1_PRIVATE',
  createdAt: new Date().toISOString(),
  lossReason: null,
  askingPrice: null
};

// 4. Verify Insert Types (Optional fields)
const workspaceInsert: Tables['Workspace']['Insert'] = {
  name: 'New Workspace',
  workspaceType: 'INVESTOR'
  // id, createdAt, subscriptionPlan are optional
};

const userInsert: Tables['User']['Insert'] = {
  workspaceId: 'uuid-string',
  role: 'ANALYST',
  email: 'new@example.com',
  firstName: 'New',
  lastName: 'User'
  // id, emailNotifications are optional
};

const companyInsert: Tables['Company']['Insert'] = {
  workspaceId: 'uuid-string',
  name: 'New Company',
  domain: 'new.com',
  hashedDomain: 'hash'
  // id, industry are optional
};

const dealInsert: Tables['Deal']['Insert'] = {
  workspaceId: 'uuid-string',
  companyId: 'uuid-string'
  // id, stage, status, visibilityTier, createdAt are optional
};

// 5. Verify UUID is string
const checkUuidIsString = (id: string) => id;
checkUuidIsString(workspace.id);
checkUuidIsString(user.id);
checkUuidIsString(company.id);
checkUuidIsString(deal.id);

console.log('✅ Types Verified: Workspace, User, Company, Deal structures match schema.');
console.log('✅ Enums Verified.');
console.log('✅ Insert Types Verified.');
console.log('✅ UUID Mapping Verified (String).');
