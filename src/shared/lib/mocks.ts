import { SearcherDashboardDTO, PipelineDTO } from '../types/api';

export const MOCK_SEARCHER_DASHBOARD: SearcherDashboardDTO = {
  metrics: {
    totalSourced: 4201,
    totalEngaged: 312,
    activeDeals: 14,
    loisIssued: 2
  },
  recentDeals: [
    {
      id: "deal_9f8a",
      companyName: "Acme Logistics",
      stage: "CIM_REVIEW",
      visibilityTier: "TIER_1_PRIVATE",
      updatedAtRelative: "2 hours ago"
    },
    {
      id: "deal_b72c",
      companyName: "Delta Industries",
      stage: "LOI_ISSUED",
      visibilityTier: "TIER_2_SHARED",
      updatedAtRelative: "1 day ago"
    }
  ]
};

export const MOCK_SEARCHER_PIPELINE: PipelineDTO = {
  columns: {
    "INBOX": [],
    "NDA_SIGNED": [
      {
        id: "deal_x192",
        companyName: "Alpha Mfg",
        visibilityTier: "TIER_1_PRIVATE",
        updatedAtRelative: "2 days ago",
        assignedAnalystInitials: ["JV", "SM"]
      }
    ],
    "CIM_REVIEW": [
      {
        id: "deal_9f8a",
        companyName: "Acme Logistics",
        visibilityTier: "TIER_1_PRIVATE",
        updatedAtRelative: "5 hours ago",
        assignedAnalystInitials: ["JV"]
      }
    ],
    "LOI_ISSUED": [],
    "DUE_DILIGENCE": [],
    "CLOSED_WON": []
  }
};
