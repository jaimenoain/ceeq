
import { Database } from '@/shared/types/supabase';

export type SourcingStatus = Database['public']['Enums']['SourcingStatus'];

export interface SourcingTargetDTO {
  id: string;
  name: string;
  domain: string;
  status: SourcingStatus;
  addedRelative: string; // e.g., "2 days ago"
}

export interface UniverseListDTO {
  data: SourcingTargetDTO[];
  meta: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface GetUniverseParams {
  page?: number;
  limit?: number;
  search?: string; // Matches against 'name' or 'domain'
  status?: SourcingStatus;
  industry?: string;
}
