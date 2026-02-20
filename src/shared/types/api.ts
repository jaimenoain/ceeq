// Shared Enums
export type WorkspaceType = 'SEARCHER' | 'INVESTOR';
export type DealStage = 'INBOX' | 'NDA_SIGNED' | 'CIM_REVIEW' | 'LOI_ISSUED' | 'DUE_DILIGENCE' | 'CLOSED_WON';
export type VisibilityTier = 'TIER_1_PRIVATE' | 'TIER_2_SHARED';
export type SourcingStatus = 'UNTOUCHED' | 'IN_SEQUENCE' | 'REPLIED' | 'ARCHIVED' | 'CONVERTED';

// SEARCHER DASHBOARD DTOs
export interface SearcherDashboardDTO {
  metrics: {
    totalSourced: number;
    totalEngaged: number;
    activeDeals: number;
    loisIssued: number;
  };
  recentDeals: DashboardDealCardDTO[];
}

export interface DashboardDealCardDTO {
  id: string;
  companyName: string;
  stage: DealStage;
  visibilityTier: VisibilityTier;
  updatedAtRelative: string;
}

// KANBAN PIPELINE DTOs
export interface PipelineDTO {
  columns: Record<DealStage, KanbanDealDTO[]>;
}

export interface KanbanDealDTO {
  id: string;
  companyName: string;
  visibilityTier: VisibilityTier;
  updatedAtRelative: string;
  assignedAnalystInitials: string[];
}

// INVESTOR FEED DTOs
export interface InvestorDealFeedDTO {
  deals: SharedDealCardDTO[];
}

export interface SharedDealCardDTO {
  dealId: string;
  companyName: string;
  searcherWorkspaceName: string;
  stage: DealStage;
  financials: {
    revenue: number | null;
    ebitda: number | null;
    marginPercent: number | null;
  };
}
