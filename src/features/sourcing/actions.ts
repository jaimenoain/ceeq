
'use server';

import { createClient } from '../../shared/lib/supabase/server';
import { GetUniverseParams, UniverseListDTO, SourcingTargetDTO } from './types';
import Papa from 'papaparse';
import { normalizeDomain } from './lib/domain-utils';
import { fetchSourcingUniverse } from './lib/mock-api';

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
  try {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      const mockResult = await fetchSourcingUniverse(params);
      if (!mockResult) {
          throw new Error('Mock fetch returned undefined');
      }
      return mockResult;
    }

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
    } else {
      query = query.neq('status', 'CONVERTED');
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

    const result = {
      data: sourcingTargets,
      meta: {
        totalCount,
        currentPage: page,
        totalPages,
      },
    };

    return result;

  } catch (error) {
    console.error('Error in getSourcingUniverseAction:', error);
    throw error;
  }
}

export interface CsvUploadResult {
  successCount: number;
  skippedCount: number;
  error?: string;
}

export async function uploadSourcingCsvAction(formData: FormData): Promise<CsvUploadResult> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { successCount: 2, skippedCount: 0 };
  }

  const supabase = createClient();

  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { successCount: 0, skippedCount: 0, error: 'Unauthorized' };
  }

  // 2. Get Workspace ID
  const { data: userProfile, error: profileError } = await supabase
    .from('User')
    .select('workspaceId')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || !userProfile.workspaceId) {
    return { successCount: 0, skippedCount: 0, error: 'Workspace not found' };
  }
  const workspaceId = userProfile.workspaceId;

  // 3. Extract File and Config
  const file = formData.get('file') as File;
  const mappingConfigStr = formData.get('mappingConfig') as string;

  if (!file) {
    return { successCount: 0, skippedCount: 0, error: 'No file provided' };
  }

  let mappingConfig: Record<string, string> = {};
  try {
     if (mappingConfigStr) {
        mappingConfig = JSON.parse(mappingConfigStr);
     }
  } catch {
      return { successCount: 0, skippedCount: 0, error: 'Invalid mapping config' };
  }

  // 4. Parse CSV
  const fileContent = await file.text();
  const parseResult = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parseResult.data as Record<string, string>[];
  if (!rows || rows.length === 0) {
      return { successCount: 0, skippedCount: 0, error: 'Empty CSV' };
  }

  // 5. Chunk and Upsert
  let successCount = 0;
  let skippedCount = 0;
  const CHUNK_SIZE = 1000;

  const mappedRows = rows.map(row => {
      let name = '';
      let domain = '';
      let industry: string | null = null;

      for (const [csvHeader, dbField] of Object.entries(mappingConfig)) {
          const val = row[csvHeader];
          if (val) {
              if (dbField === 'name') name = val;
              else if (dbField === 'domain') domain = val;
              else if (dbField === 'industry') industry = val;
          }
      }

      // Fallback strategies
      if (!name && row['name']) name = row['name'];
      if (!name && row['Name']) name = row['Name'];
      if (!domain && row['domain']) domain = row['domain'];
      if (!domain && row['Domain']) domain = row['Domain'];
      if (!domain && row['Website']) domain = row['Website'];
      if (!industry && row['industry']) industry = row['industry'];
      if (!industry && row['Industry']) industry = row['Industry'];

      return {
          workspaceId,
          domain: normalizeDomain(domain),
          name: name || domain || 'Unknown',
          industry,
          status: 'UNTOUCHED' as const
      };
  }).filter(r => r.domain); // Filter out rows without domain

  // 6. Processing Chunks
  for (let i = 0; i < mappedRows.length; i += CHUNK_SIZE) {
    const chunk = mappedRows.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase
        .from('SourcingTarget')
        .upsert(chunk, {
            onConflict: 'workspaceId, domain',
            ignoreDuplicates: true,
        })
        .select('id');

    if (error) {
        console.error('Error upserting chunk:', error);
        return { successCount, skippedCount: skippedCount + (mappedRows.length - successCount), error: error.message };
    }

    const insertedCount = data?.length || 0;
    successCount += insertedCount;
    skippedCount += (chunk.length - insertedCount);
  }

  return { successCount, skippedCount };
}
