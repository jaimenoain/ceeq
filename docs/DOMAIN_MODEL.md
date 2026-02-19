# SearchFundOS Domain Model
## Enums
WorkspaceType (SEARCHER, INVESTOR), SubscriptionPlan, Role, DealStage (INBOX, NDA_SIGNED, CIM_REVIEW, LOI_ISSUED, DUE_DILIGENCE, CLOSED_WON), DealStatus, VisibilityTier (TIER_1_PRIVATE, TIER_2_SHARED), SourcingStatus.
## Core Models
- **Workspace**: Multi-tenant container.
- **User**: System actors.
- **SourcingTarget**: The "Universe" top-of-funnel tracking.
- **Company**: Core CRM entity. Contains `hashedDomain` for collision detection.
- **Deal**: Single source of truth for acquisition attempt. Maps to Company and Workspace. Contains `visibilityTier`.
- **FinancialRecord**: Extracted AI data. Must have `isVerifiedByHuman` flag.
- **Document**: S3 mapped vault entities.
