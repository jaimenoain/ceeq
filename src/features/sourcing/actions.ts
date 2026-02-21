
'use server';

import { createClient } from '../../shared/lib/supabase/server';
import { GetUniverseParams, UniverseListDTO, SourcingTargetDTO } from './types';

function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
}

export async function getSourcingUniverseAction(
  params: GetUniverseParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockClient?: any
): Promise<UniverseListDTO> {
  const supabase = mockClient || createClient();

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

  // 3. Build Query
  let query = supabase
    .from('SourcingTarget')
    .select('*', { count: 'exact' })
    .eq('workspaceId', workspaceId);

  // Apply Filters
  if (params.search) {
    const searchTerm = params.search;
    query = query.or(`name.ilike.%${searchTerm}%,domain.ilike.%${searchTerm}%`);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.industry) {
    query = query.eq('industry', params.industry);
  }

  // Apply Pagination
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to);

  // Order by fitScore desc
  query = query.order('fitScore', { ascending: false });

  // Execute
  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching sourcing universe:', error);
    throw new Error('Failed to fetch sourcing universe');
  }

  // 4. Map to DTO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourcingTargets: SourcingTargetDTO[] = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    status: row.status,
    addedRelative: formatRelativeTime(row.createdAt),
  }));

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: sourcingTargets,
    meta: {
      totalCount,
      currentPage: page,
      totalPages,
    },
  };
}
