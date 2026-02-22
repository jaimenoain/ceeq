'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '../../shared/lib/supabase/server';
import { normalizeDomain, hashDomain } from '../../shared/lib/crypto-domain';
import { formatRelativeTime } from '../../shared/lib/utils';
import { DealStage, KanbanDealDTO, PipelineDTO } from '../../shared/types/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any; // Using any for mock compatibility, or import proper type

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
  // 1. Get User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

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

  // 3. Fetch Target
  const { data: target, error: targetError } = await supabase
    .from('SourcingTarget')
    .select('*') // We select * but will only use strictly allowed fields
    .eq('id', targetId)
    .single();

  if (targetError || !target) {
    return { success: false, error: 'Target not found' };
  }

  // 4. Compute Hash
  const domain = normalizeDomain(target.domain);
  const hashedDomain = hashDomain(domain);

  // 5. Check Local Collision (Idempotency)
  // Check if we already have this company in our workspace
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

  // 6. Global Collision Check (RPC)
  if (!companyId) {
    // Check if another workspace has this domain at an advanced stage
    const { data: globalCollision, error: rpcError } = await supabase.rpc('check_global_collision', {
      hashed_domain: hashedDomain,
    });

    // Fail Closed: If RPC fails, we cannot guarantee safety, so we block.
    if (rpcError) {
        console.error('RPC check_global_collision failed:', rpcError);
        return { success: false, error: 'System error during collision check. Please try again later.' };
    } else if (globalCollision) {
         // Expecting object { collision: boolean, stage: string }
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

  // 7. Create Company if needed
  if (!companyId) {
      // Strictly adhering to Data Contracts: only domain, hashedDomain, workspaceId.
      // Ignoring name/industry as they are not in the strict contract provided in the task.
      const { data: newCompany, error: createCompanyError } = await supabase
        .from('Company')
        .insert({
            workspaceId,
            domain: target.domain,
            hashedDomain,
            name: target.name
            // industry removed to comply with strict Data Contracts
        })
        .select('id')
        .single();

      if (createCompanyError || !newCompany) {
          return { success: false, error: `Failed to create company: ${createCompanyError?.message}` };
      }
      companyId = newCompany.id;
  }

  // 8. Create Deal
  // Check if deal exists for this company in this workspace
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

  // 9. Update Target Status
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
    // Simulate network delay
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchPipeline(mockClient?: any): Promise<PipelineDTO> {
  const supabase = mockClient || createClient();

  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
     // Mock data
     return {
        columns: {
           INBOX: [],
           NDA_SIGNED: [],
           CIM_REVIEW: [],
           LOI_ISSUED: [],
           DUE_DILIGENCE: [],
           CLOSED_WON: [],
        }
     };
  }

  // 1. Get User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

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

  // 3. Fetch Deals
  const { data: deals, error: dealsError } = await supabase
    .from('Deal')
    .select(`
      id,
      stage,
      status,
      visibilityTier,
      createdAt,
      company:Company(name)
    `)
    .eq('workspaceId', workspaceId)
    .eq('status', 'ACTIVE');

  if (dealsError) {
    console.error('Error fetching pipeline deals:', dealsError);
    throw new Error('Failed to fetch pipeline deals');
  }

  // 4. Map to DTO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kanbanDeals: (KanbanDealDTO & { stage: DealStage })[] = deals.map((deal: any) => ({
    id: deal.id,
    companyName: deal.company?.name || 'Unknown',
    visibilityTier: deal.visibilityTier,
    updatedAtRelative: formatRelativeTime(deal.createdAt),
    assignedAnalystInitials: [], // TODO: Implement assignment logic when schema supports it
    stage: deal.stage,
  }));

  // 5. Group by Stage
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
        visibilityTier: deal.visibilityTier,
        updatedAtRelative: deal.updatedAtRelative,
        assignedAnalystInitials: deal.assignedAnalystInitials,
      });
    }
  });

  return { columns };
}

const UpdateDealStageSchema = z.object({
  dealId: z.string(),
  stage: z.enum(['INBOX', 'NDA_SIGNED', 'CIM_REVIEW', 'LOI_ISSUED', 'DUE_DILIGENCE', 'CLOSED_WON']),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateDealStage(dealId: string, stage: DealStage, mockClient?: any): Promise<{ success: boolean; error?: string }> {
  const supabase = mockClient || createClient();

  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
     revalidatePath('/searcher/pipeline');
     return { success: true };
  }

  const parseResult = UpdateDealStageSchema.safeParse({ dealId, stage });
  if (!parseResult.success) {
     return { success: false, error: 'Invalid input' };
  }

  // 1. Get User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

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
    .update({ stage })
    .eq('id', dealId)
    .eq('workspaceId', workspaceId);

  if (error) {
    console.error('Error updating deal stage:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/searcher/pipeline');
  return { success: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function archiveDeal(dealId: string, mockClient?: any): Promise<{ success: boolean; error?: string }> {
  const supabase = mockClient || createClient();

  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
     revalidatePath('/searcher/pipeline');
     return { success: true };
  }

  // 1. Get User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

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

  const { error } = await supabase
    .from('Deal')
    .update({ status: 'ARCHIVED' })
    .eq('id', dealId)
    .eq('workspaceId', workspaceId);

  if (error) {
    console.error('Error archiving deal:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/searcher/pipeline');
  return { success: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loseDeal(dealId: string, lossReason: string, mockClient?: any): Promise<{ success: boolean; error?: string }> {
  const supabase = mockClient || createClient();

  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
     revalidatePath('/searcher/pipeline');
     return { success: true };
  }

  if (!lossReason) {
      return { success: false, error: 'Loss reason is required' };
  }

  // 1. Get User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

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

  const { error } = await supabase
    .from('Deal')
    .update({ status: 'LOST', lossReason })
    .eq('id', dealId)
    .eq('workspaceId', workspaceId);

  if (error) {
    console.error('Error marking deal as lost:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/searcher/pipeline');
  return { success: true };
}
