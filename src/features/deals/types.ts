export type DealStage = 'INBOX' | 'NDA_SIGNED' | 'CIM_REVIEW' | 'LOI_ISSUED' | 'DUE_DILIGENCE' | 'CLOSED_WON';
export type PrivacyTier = 'Tier 1' | 'Tier 2';

export interface Deal {
  id: string;
  companyName: string;
  industry: string;
  fitScore?: number; // Optional
  privacyTier: PrivacyTier;
  stage: DealStage;
}

export interface OptimisticAction {
  action: 'MOVE_DEAL' | 'REVERT_MOVE';
  payload: {
    dealId: string;
    targetStage?: DealStage;
    previousStage?: DealStage;
  };
}
