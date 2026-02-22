'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '../../shared/lib/supabase/server';
import { normalizeDomain, hashDomain } from '../../shared/lib/crypto-domain';
import { formatRelativeTime } from '../../shared/lib/utils';
import { DealStage, KanbanDealDTO, PipelineDTO } from '../../shared/types/api';
import { DealHeaderDTO } from './types';
import { MOCK_SEARCHER_PIPELINE } from '../../shared/lib/mocks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export interface ConversionResult {
  success: boolean;
  dealId?: string;
  companyId?: string;
  error?: string;
}

const ConvertTargetSchema = z.object({
  targetId: z.string(),
});

/**
 * Core logic for converting a target to a deal.
 * Performs collision detection and creates/links Company and Deal.
 */
export async function convertTargetToDeal(
  supabase: SupabaseClient,
  targetId: string
): Promise<ConversionResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('User')
    .select('workspaceId')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || !userProfile.workspaceId) {
    return { success: false, error: 'Workspace not found' };
  }

  const workspaceId = userProfile.workspaceId;

  const { data: target, error: targetError } = await supabase
    .from('SourcingTarget')
    .select('*')
    .eq('id', targetId)
    .single();

  if (targetError || !target) {
    return { success: false, error: 'Target not found' };
  }

  const domain = normalizeDomain(target.domain);
  const hashedDomain = hashDomain(domain);

  const { data: localCompany, error: localCompanyError } = await supabase
    .from('Company')
    .select('id')
    .eq('workspaceId', workspaceId)
    .eq('hashedDomain', hashedDomain)
    .maybeSingle();

  if (localCompanyError) {
      return { success: false, error: `Error checking local company: ${localCompanyError.message}` };
  }

  let companyId = localCompany?.id;

  if (!companyId) {
    const { data: globalCollision, error: rpcError } = await supabase.rpc('check_global_collision', {
      hashed_domain: hashedDomain,
    });

    if (rpcError) {
        console.error('RPC check_global_collision failed:', rpcError);
        return { success: false, error: 'System error during collision check. Please try again later.' };
    } else if (globalCollision) {
         const stage = globalCollision.stage;
         const advancedStages = ['NDA_SIGNED', 'CIM_REVIEW', 'LOI_ISSUED', 'DUE_DILIGENCE', 'CLOSED_WON'];

         if (stage && advancedStages.includes(stage)) {
             return {
                 success: false,
                 error: "Cannot convert: Domain hash collision detected. Target already protected under NDA."
             };
         }
    }
  }

  if (!companyId) {
      const { data: newCompany, error: createCompanyError } = await supabase
        .from('Company')
        .insert({
            workspaceId,
            domain: target.domain,
            hashedDomain,
            name: target.name
        })
        .select('id')
        .single();

      if (createCompanyError || !newCompany) {
          return { success: false, error: `Failed to create company: ${createCompanyError?.message}` };
      }
      companyId = newCompany.id;
  }

  const { data: existingDeal, error: existingDealError } = await supabase
      .from('Deal')
      .select('id')
      .eq('workspaceId', workspaceId)
      .eq('companyId', companyId)
      .maybeSingle();

  if (existingDealError) {
      return { success: false, error: `Error checking existing deal: ${existingDealError.message}` };
  }

  let dealId = existingDeal?.id;

  if (!dealId) {
      const { data: newDeal, error: createDealError } = await supabase
          .from('Deal')
          .insert({
              workspaceId,
              companyId,
              stage: 'INBOX',
              status: 'ACTIVE',
              visibilityTier: 'TIER_1_PRIVATE'
          })
          .select('id')
          .single();

      if (createDealError || !newDeal) {
          return { success: false, error: `Failed to create deal: ${createDealError?.message}` };
      }
      dealId = newDeal.id;
  }

  if (target.status !== 'CONVERTED') {
      const { error: updateError } = await supabase
          .from('SourcingTarget')
          .update({ status: 'CONVERTED' })
          .eq('id', targetId);

      if (updateError) {
          console.error('Failed to update target status:', updateError);
      }
  }

  return { success: true, dealId, companyId };
}

export async function convertTargetToDealAction(targetId: string): Promise<ConversionResult> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = { success: true, dealId: 'mock-deal-id', companyId: 'mock-company-id' };
    revalidatePath('/searcher/universe');
    revalidatePath('/searcher/pipeline');
    return result;
  }

  const parseResult = ConvertTargetSchema.safeParse({ targetId });
  if (!parseResult.success) {
      return { success: false, error: "Invalid target ID" };
  }

  const supabase = createClient();
  const result = await convertTargetToDeal(supabase, targetId);

  if (result.success) {
      revalidatePath('/searcher/universe');
      revalidatePath('/searcher/pipeline');
  }

  return result;
}

// ----------------------------------------------------------------------------
// KANBAN PIPELINE ACTIONS
// ----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPipelineAction(workspaceId: string, mockClient?: any): Promise<PipelineDTO> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return MOCK_SEARCHER_PIPELINE;
  }

  const supabase = mockClient || createClient();

  // 1. Authenticate & Verify Tenant Isolation
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: userProfile, error: profileError } = await supabase
    .from('User')
    .select('workspaceId')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || !userProfile.workspaceId) {
    throw new Error('Workspace not found');
  }

  if (userProfile.workspaceId !== workspaceId) {
    throw new Error('Unauthorized access to workspace');
  }

  // 2. Fetch Active Deals
  const { data: deals, error: dealsError } = await supabase
    .from('Deal')
    .select(`
      id,
      stage,
      status,
      visibilityTier,
      createdAt,
      company:Company(name, industry)
    `)
    .eq('workspaceId', workspaceId)
    .eq('status', 'ACTIVE');

  if (dealsError) {
    console.error('Error fetching pipeline deals:', dealsError);
    throw new Error('Failed to fetch pipeline deals');
  }

  // 3. Map to DTO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kanbanDeals: (KanbanDealDTO & { stage: DealStage })[] = deals.map((deal: any) => ({
    id: deal.id,
    companyName: deal.company?.name || 'Unknown',
    industry: deal.company?.industry || null,
    visibilityTier: deal.visibilityTier,
    privacyTier: deal.visibilityTier === 'TIER_1_PRIVATE' ? 'Tier 1' : 'Tier 2',
    updatedAtRelative: formatRelativeTime(deal.createdAt),
    assignedAnalystInitials: [], // Placeholder for future feature
    stage: deal.stage,
  }));

  // 4. Group by Stage
  const columns: Record<DealStage, KanbanDealDTO[]> = {
    INBOX: [],
    NDA_SIGNED: [],
    CIM_REVIEW: [],
    LOI_ISSUED: [],
    DUE_DILIGENCE: [],
    CLOSED_WON: [],
  };

  kanbanDeals.forEach(deal => {
    if (columns[deal.stage]) {
      columns[deal.stage].push({
        id: deal.id,
        companyName: deal.companyName,
        industry: deal.industry,
        visibilityTier: deal.visibilityTier,
        privacyTier: deal.privacyTier,
        updatedAtRelative: deal.updatedAtRelative,
        assignedAnalystInitials: deal.assignedAnalystInitials,
      });
    }
  });

  return { columns };
}

const UpdateDealStageSchema = z.object({
  dealId: z.string(),
  newStage: z.enum(['INBOX', 'NDA_SIGNED', 'CIM_REVIEW', 'LOI_ISSUED', 'DUE_DILIGENCE', 'CLOSED_WON']),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateDealStageAction(payload: { dealId: string; newStage: DealStage }, mockClient?: any): Promise<{ success: boolean; error?: string }> {
  const supabase = mockClient || createClient();
  const parseResult = UpdateDealStageSchema.safeParse(payload);

  if (!parseResult.success) {
     return { success: false, error: 'Invalid input' };
  }

  const { dealId, newStage } = parseResult.data;

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  // 2. Get Workspace ID
  const { data: userProfile, error: profileError } = await supabase
    .from('User')
    .select('workspaceId')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || !userProfile.workspaceId) {
    return { success: false, error: 'Workspace not found' };
  }
  const workspaceId = userProfile.workspaceId;

  // 3. Update Deal
  const { error } = await supabase
    .from('Deal')
    .update({ stage: newStage })
    .eq('id', dealId)
    .eq('workspaceId', workspaceId);

  if (error) {
    console.error('Error updating deal stage:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/searcher/pipeline');
  return { success: true };
}

const ArchiveDealSchema = z.object({
  dealId: z.string(),
  lossReason: z.string().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function archiveDealAction(payload: { dealId: string; lossReason?: string }, mockClient?: any): Promise<{ success: boolean; error?: string }> {
  const supabase = mockClient || createClient();
  const parseResult = ArchiveDealSchema.safeParse(payload);

  if (!parseResult.success) {
      return { success: false, error: 'Invalid input' };
  }

  const { dealId, lossReason } = parseResult.data;

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  // 2. Get Workspace ID
  const { data: userProfile, error: profileError } = await supabase
    .from('User')
    .select('workspaceId')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || !userProfile.workspaceId) {
    return { success: false, error: 'Workspace not found' };
  }
  const workspaceId = userProfile.workspaceId;

  // 3. Check Current Stage
  const { data: deal, error: dealError } = await supabase
    .from('Deal')
    .select('stage')
    .eq('id', dealId)
    .eq('workspaceId', workspaceId)
    .single();

  if (dealError || !deal) {
      return { success: false, error: 'Deal not found' };
  }

  const stageOrder = ['INBOX', 'NDA_SIGNED', 'CIM_REVIEW', 'LOI_ISSUED', 'DUE_DILIGENCE', 'CLOSED_WON'];
  const currentStageIndex = stageOrder.indexOf(deal.stage);
  const cimReviewIndex = stageOrder.indexOf('CIM_REVIEW');

  // Validate lossReason for late stage deals
  if (currentStageIndex >= cimReviewIndex && !lossReason) {
      return { success: false, error: 'Loss reason is required for deals in CIM Review or later' };
  }

  // 4. Update Status
  const status = lossReason ? 'LOST' : 'ARCHIVED';

  const { error } = await supabase
    .from('Deal')
    .update({
        status,
        lossReason: lossReason || null
    })
    .eq('id', dealId)
    .eq('workspaceId', workspaceId);

  if (error) {
    console.error(`Error marking deal as ${status}:`, error);
    return { success: false, error: error.message };
  }

  revalidatePath('/searcher/pipeline');
  return { success: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDealHeaderAction(dealId: string, mockClient?: any): Promise<DealHeaderDTO> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return {
      id: dealId,
      companyName: 'Mock Company Inc.',
      rootDomain: 'mock-company.com',
      stage: 'Active',
      privacyTier: 'Tier 1',
    };
  }

  const supabase = mockClient || createClient();

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  // 2. Get Workspace ID
  const { data: userProfile, error: profileError } = await supabase
    .from('User')
    .select('workspaceId')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || !userProfile.workspaceId) {
    throw new Error('Workspace not found');
  }
  const workspaceId = userProfile.workspaceId;

  // 3. Fetch Deal with Company
  const { data: deal, error: dealError } = await supabase
    .from('Deal')
    .select(`
      id,
      stage,
      visibilityTier,
      company:Company(name, domain)
    `)
    .eq('id', dealId)
    .eq('workspaceId', workspaceId)
    .single();

  if (dealError || !deal) {
    throw new Error('Deal not found');
  }

  // 4. Map to DTO
  const stageMapping: Record<DealStage, DealHeaderDTO['stage']> = {
    INBOX: 'Lead',
    NDA_SIGNED: 'Active',
    CIM_REVIEW: 'Active',
    LOI_ISSUED: 'LOI',
    DUE_DILIGENCE: 'LOI',
    CLOSED_WON: 'Closed'
  };

  const domain = normalizeDomain(deal.company?.domain || '');

  return {
    id: deal.id,
    companyName: deal.company?.name || 'Unknown',
    rootDomain: domain,
    stage: stageMapping[deal.stage as DealStage] || 'Lead', // Fallback
    privacyTier: deal.visibilityTier === 'TIER_1_PRIVATE' ? 'Tier 1' : 'Tier 2',
  };
}
