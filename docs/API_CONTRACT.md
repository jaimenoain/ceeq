# **API Contract**

### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| POST | /api/auth/onboarding | Complete user/workspace creation | OnboardingForm.tsx |
| GET | /api/searcher/dashboard | High-level metrics & recent deals | SearcherDashboard.tsx |
| GET | /api/searcher/universe | Paginated raw sourcing targets (Sorted by CreatedAt DESC) | DataTable.tsx |
| GET | /api/searcher/pipeline | Kanban board columns & cards | KanbanBoardWrapper.tsx |
| PATCH | /api/searcher/deals/:id/tier | Upgrade deal to Tier 2 | VisibilityModal.tsx \+2 |
| PUT | /api/searcher/deals/:id/financials | Save AI OCR validation data | AIExtraction.tsx |
| GET | /api/investor/dashboard | Portfolio metrics & active searchers | InvestorDashboard.tsx |
| GET | /api/investor/deals | Network Deal Flow (Tier 2 only) | FeedGrid.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

// Shared Enums (Mapped from Prisma)  
export type WorkspaceType \= 'SEARCHER' | 'INVESTOR';  
export type DealStage \= 'INBOX' | 'NDA\_SIGNED' | 'CIM\_REVIEW' | 'LOI\_ISSUED' | 'DUE\_DILIGENCE' | 'CLOSED\_WON';  
export type VisibilityTier \= 'TIER\_1\_PRIVATE' | 'TIER\_2\_SHARED';  
export type SourcingStatus \= 'UNTOUCHED' | 'IN\_SEQUENCE' | 'REPLIED' | 'ARCHIVED' | 'CONVERTED';

// \==========================================  
// SEARCHER DASHBOARD DTOs  
// \==========================================  
export interface SearcherDashboardDTO {  
  metrics: {  
    totalSourced: number;  
    totalEngaged: number;  
    activeDeals: number;  
    loisIssued: number;  
  };  
  recentDeals: DashboardDealCardDTO\[\];  
}

export interface DashboardDealCardDTO {  
  id: string;  
  companyName: string;  
  stage: DealStage;  
  visibilityTier: VisibilityTier;  
  updatedAtRelative: string; // e.g., "2 hours ago"  
}

// \==========================================  
// UNIVERSE DTOs  
// \==========================================  
export interface UniverseListDTO {  
  data: SourcingTargetDTO\[\];  
  meta: {  
    totalCount: number;  
    currentPage: number;  
    totalPages: number;  
  };  
}

export interface SourcingTargetDTO {  
  id: string;  
  name: string;  
  domain: string;  
  status: SourcingStatus;  
  addedRelative: string;   
}

// \==========================================  
// KANBAN PIPELINE DTOs  
// \==========================================  
export interface PipelineDTO {  
  columns: Record\<DealStage, KanbanDealDTO\[\]\>;  
}

export interface KanbanDealDTO {  
  id: string;  
  companyName: string;  
  visibilityTier: VisibilityTier;  
  updatedAtRelative: string;  
  assignedAnalystInitials: string\[\]; // Aggregated mapping for UI Avatars  
}

// \==========================================  
// INVESTOR DASHBOARD & FEED DTOs  
// \==========================================  
export interface InvestorDashboardDTO {  
  metrics: {  
    activeSearchers: number;  
    totalSharedDeals: number;  
    dealsInDiligence: number;  
    recentDocuments: number;  
  };  
  connectedSearchers: ConnectedSearcherDTO\[\];  
  networkActivity: NetworkActivityDTO\[\];  
}

export interface ConnectedSearcherDTO {  
  workspaceId: string;  
  workspaceName: string;  
  sharedDealCount: number;  
  connectionStatus: 'ACTIVE' | 'PENDING';  
}

export interface NetworkActivityDTO {  
  id: string;  
  searcherName: string;  
  description: string;  
  createdAtRelative: string;  
}

export interface InvestorDealFeedDTO {  
  deals: SharedDealCardDTO\[\];  
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

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/searcher/dashboard**

JSON

{  
  "metrics": {  
    "totalSourced": 4201,  
    "totalEngaged": 312,  
    "activeDeals": 14,  
    "loisIssued": 2  
  },  
  "recentDeals": \[  
    {  
      "id": "deal\_9f8a",  
      "companyName": "Acme Logistics",  
      "stage": "CIM\_REVIEW",  
      "visibilityTier": "TIER\_1\_PRIVATE",  
      "updatedAtRelative": "2 hours ago"  
    },  
    {  
      "id": "deal\_b72c",  
      "companyName": "Delta Industries",  
      "stage": "LOI\_ISSUED",  
      "visibilityTier": "TIER\_2\_SHARED",  
      "updatedAtRelative": "1 day ago"  
    }  
  \]  
}

**GET /api/searcher/pipeline**

JSON

{  
  "columns": {  
    "INBOX": \[\],  
    "NDA\_SIGNED": \[  
      {  
        "id": "deal\_x192",  
        "companyName": "Alpha Mfg",  
        "visibilityTier": "TIER\_1\_PRIVATE",  
        "updatedAtRelative": "2 days ago",  
        "assignedAnalystInitials": \["JV", "SM"\]  
      }  
    \],  
    "CIM\_REVIEW": \[  
      {  
        "id": "deal\_9f8a",  
        "companyName": "Acme Logistics",  
        "visibilityTier": "TIER\_1\_PRIVATE",  
        "updatedAtRelative": "5 hours ago",  
        "assignedAnalystInitials": \["JV"\]  
      }  
    \],  
    "LOI\_ISSUED": \[\],  
    "DUE\_DILIGENCE": \[\],  
    "CLOSED\_WON": \[\]  
  }  
}

**GET /api/investor/deals (Network Feed)**

JSON

{  
  "deals": \[  
    {  
      "dealId": "deal\_b72c",  
      "companyName": "Delta Industries",  
      "searcherWorkspaceName": "Blue Ocean Search",  
      "stage": "LOI\_ISSUED",  
      "financials": {  
        "revenue": 12500000.00,  
        "ebitda": 5000000.00,  
        "marginPercent": 40.0  
      }  
    },  
    {  
      "dealId": "deal\_c38d",  
      "companyName": "Beta Co",  
      "searcherWorkspaceName": "Apex Acquisitions",  
      "stage": "CIM\_REVIEW",  
      "financials": {  
        "revenue": 8200000.00,  
        "ebitda": 1100000.00,  
        "marginPercent": 15.0  
      }  
    },  
    {  
      "dealId": "deal\_f91e",  
      "companyName": "Gamma Tech",  
      "searcherWorkspaceName": "Blue Ocean Search",  
      "stage": "NDA\_SIGNED",  
      "financials": {  
        "revenue": null,  
        "ebitda": null,  
        "marginPercent": null  
      }  
    }  
  \]  
}

---

### **4\. Zod Validation Schemas (The Guardrails)**

These Zod schemas enforce the exact business invariants defined in the documents .

\+1  
TypeScript

import { z } from "zod";

// Validates the POST payload for the Onboarding Step  
export const OnboardingSubmitSchema \= z.object({  
  workspaceType: z.enum(\["SEARCHER", "INVESTOR"\], {  
    required\_error: "Role selection is irreversible and required.",  
  }),  
  firstName: z.string().min(1, "First name is required"),  
  lastName: z.string().min(1, "Last name is required"),  
  workspaceName: z.string().min(2, "Entity or Fund name must be valid"),  
  linkedinUrl: z.string().url("Must be a valid URL").optional(),  
});

// Validates the PATCH payload for changing Deal Tier Privacy  
export const UpdateDealVisibilitySchema \= z.object({  
  visibilityTier: z.enum(\["TIER\_1\_PRIVATE", "TIER\_2\_SHARED"\]),  
});

// Validates the PUT payload for the AI OCR Extraction Confirmation  
export const SaveFinancialExtractionSchema \= z.object({  
  fiscalYear: z.number().int().min(1900).max(2100),  
  revenue: z.number().nonnegative("Revenue cannot be negative"),  
  ebitda: z.number(), // Allowed to be negative  
  grossMargin: z.number().min(-100).max(100),  
  customMetrics: z.record(z.string(), z.number()).optional(),  
  isVerifiedByHuman: z.literal(true, {  
    errorMap: () \=\> ({ message: "Must be explicitly verified by a human before saving" })  
  })  
});

Here is the deep-dive contract for the **Deal Workspace**, specifically covering the **Document Vault** and the **AI P\&L Split-Screen** functionalities.

---

### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| GET | /api/searcher/deals/:id | Core deal metadata & company info | DealWorkspaceHeader.tsx |
| GET | /api/searcher/deals/:id/documents | List of all uploaded files | DocumentVaultTable.tsx |
| POST | /api/searcher/deals/:id/documents | Upload a new file to the vault | FileUploadDropzone.tsx |
| GET | /api/searcher/deals/:id/financials/ocr | AI-extracted data for split-screen | AIOcrSplitScreen.tsx |
| POST | /api/searcher/deals/:id/financials/ocr | Trigger AI extraction on a document | ExtractDataButton.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

// \==========================================

// DEAL WORKSPACE HEADER DTO

// \==========================================

export interface DealWorkspaceDTO {

  id: string;

  companyName: string;

  domain: string;

  stage: DealStage; // From Shared Enums

  visibilityTier: VisibilityTier; // From Shared Enums

  ownerName: string;

  createdAtRelative: string;

}

// \==========================================

// DOCUMENT VAULT DTOs

// \==========================================

export type DocumentProcessingStatus \= 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentListDTO {

  documents: DocumentDTO\[\];

}

export interface DocumentDTO {

  id: string;

  fileName: string;

  fileSizeBytes: number;

  uploadedByInitials: string;

  uploadedAtRelative: string;

  isVisibleToInvestors: boolean; // Maps to Tier 1 vs Tier 2 firewall

  processingStatus: DocumentProcessingStatus;

  downloadUrl: string; // Presigned S3/GCS URL

}

// \==========================================

// AI OCR P\&L SPLIT-SCREEN DTO

// \==========================================

export interface AIExtractionSplitScreenDTO {

  sourceDocumentId: string;

  sourceDocumentUrl: string; // URL to render the PDF in the left pane

  isHumanVerified: boolean;

  lastVerifiedAt: string | null;

  lastVerifiedByInitials: string | null;

  extractedYears: FinancialYearExtractionDTO\[\];

}

export interface FinancialYearExtractionDTO {

  fiscalYear: number;

  metrics: {

    revenue: ExtractedMetricDTO;

    ebitda: ExtractedMetricDTO;

    grossMargin: ExtractedMetricDTO;

  };

}

export interface ExtractedMetricDTO {

  value: number | null;

  confidenceScore: number | null; // 0.0 to 1.0 (e.g., 0.98 \= 98%)

  boundingBox: BoundingBoxDTO | null; // Coordinates to highlight the PDF

}

// Used to draw a yellow highlight box over the exact text in the PDF

export interface BoundingBoxDTO {

  pageNumber: number;

  x: number;

  y: number;

  width: number;

  height: number;

}

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/searcher/deals/deal\_9f8a/documents (Document Vault)**

JSON

{

  "documents": \[

    {

      "id": "doc\_771a",

      "fileName": "Acme\_Logistics\_Public\_CIM.pdf",

      "fileSizeBytes": 4520192,

      "uploadedByInitials": "JV",

      "uploadedAtRelative": "2 days ago",

      "isVisibleToInvestors": true,

      "processingStatus": "COMPLETED",

      "downloadUrl": "https://storage.provider.com/presigned-url-123"

    },

    {

      "id": "doc\_882b",

      "fileName": "Acme\_Private\_Valuation\_Model.xlsx",

      "fileSizeBytes": 1048576,

      "uploadedByInitials": "SM",

      "uploadedAtRelative": "5 hours ago",

      "isVisibleToInvestors": false,

      "processingStatus": "IDLE",

      "downloadUrl": "https://storage.provider.com/presigned-url-456"

    }

  \]

}

**GET /api/searcher/deals/deal\_9f8a/financials/ocr (AI P\&L Split-Screen)**

JSON

{

  "sourceDocumentId": "doc\_771a",

  "sourceDocumentUrl": "https://storage.provider.com/presigned-url-123",

  "isHumanVerified": false,

  "lastVerifiedAt": null,

  "lastVerifiedByInitials": null,

  "extractedYears": \[

    {

      "fiscalYear": 2023,

      "metrics": {

        "revenue": {

          "value": 14500000.00,

          "confidenceScore": 0.98,

          "boundingBox": { "pageNumber": 12, "x": 150, "y": 300, "width": 80, "height": 15 }

        },

        "ebitda": {

          "value": 3200000.00,

          "confidenceScore": 0.85,

          "boundingBox": { "pageNumber": 12, "x": 150, "y": 340, "width": 80, "height": 15 }

        },

        "grossMargin": {

          "value": 42.5,

          "confidenceScore": 0.99,

          "boundingBox": null

        }

      }

    },

    {

      "fiscalYear": 2022,

      "metrics": {

        "revenue": {

          "value": 12100000.00,

          "confidenceScore": 0.95,

          "boundingBox": { "pageNumber": 12, "x": 250, "y": 300, "width": 80, "height": 15 }

        },

        "ebitda": {

          "value": null,

          "confidenceScore": null,

          "boundingBox": null

        },

        "grossMargin": {

          "value": 38.0,

          "confidenceScore": 0.91,

          "boundingBox": null

        }

      }

    }

  \]

}

---

### **4\. Zod Validation Schemas (The Guardrails)**

These guardrails ensure the Searcher Analyst interacts with the Document Vault and AI engine correctly.

TypeScript

import { z } from "zod";

// Validates the POST request when uploading a new document to a Deal

export const UploadDocumentSchema \= z.object({

  fileName: z.string().min(1, "File name is required"),

  fileSize: z.number().max(50 \* 1024 \* 1024, "File exceeds 50MB limit"),

  isVisibleToInvestors: z.boolean().default(false), // Defaults to Tier 1 / Private

  mimeType: z.enum(\[

    "application/pdf", 

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx

    "text/csv"

  \], {

    errorMap: () \=\> ({ message: "Only PDF, XLSX, and CSV files are supported" })

  })

});

// Validates the POST request to trigger the AI Extraction microservice

export const TriggerAIExtractionSchema \= z.object({

  documentId: z.string().uuid("Must provide a valid Document ID"),

  extractionTargets: z.array(z.enum(\["REVENUE", "EBITDA", "GROSS\_MARGIN"\])).min(1)

});

