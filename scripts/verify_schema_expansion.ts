import { Database } from '../src/shared/types/supabase';

function verifyDealExpansion() {
  // This should fail compilation because lossReason and askingPrice are not yet in the Deal type
  const deal: Database['public']['Tables']['Deal']['Row'] = {
    // Existing fields
    id: 'test-id',
    companyId: 'test-company-id',
    workspaceId: 'test-workspace-id',
    createdAt: new Date().toISOString(),
    stage: 'INBOX',
    status: 'ACTIVE',
    visibilityTier: 'TIER_1_PRIVATE',

    // New fields
    lossReason: 'Too expensive',
    askingPrice: 1000000,
  };

  console.log('Deal object created:', deal);
}

function verifyCompanyExpansion() {
  // This should fail compilation because location and employees are not yet in the Company type
  const company: Database['public']['Tables']['Company']['Row'] = {
    // Existing fields
    id: 'test-id',
    workspaceId: 'test-workspace-id',
    name: 'Test Company',
    domain: 'test.com',
    hashedDomain: 'hashed-domain',
    industry: 'Software',

    // New fields
    location: 'New York',
    employees: 50,
  };

  console.log('Company object created:', company);
}

verifyDealExpansion();
verifyCompanyExpansion();
