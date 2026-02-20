### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| GET | /api/dashboard/summary | Fetches Net Worth, Pending Capital, and top entities. \+1 | MetricsGrid.tsx, EntitiesSection.tsx |
| GET | /api/assets/roots | Fetches top-level assets for the directory. | AssetDirectoryTable.tsx |
| GET | /api/assets/:id/children | Lazy-loads nested child assets upon row expansion. | CollapsibleContent.tsx |
| GET | /api/airlock/queue | Lists documents grouped by processing status. | QueueSection.tsx |
| POST | /api/billing/sync | Forces a manual Stripe webhook sync. | GlobalBillingAlert.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

// Shared Enums  
export type GovernanceState \= 'GREEN' | 'YELLOW' | 'RED';  
export type DocumentStatusDTO \= 'PENDING\_EXTRACTION' | 'REVIEW\_REQUIRED' | 'PROCESSED' | 'REJECTED';  
export type AssetTypeDTO \= 'TRUST' | 'LLC' | 'REAL\_ESTATE' | 'PRIVATE\_EQUITY';

// Dashboard DTOs  
export interface TopLevelEntityDTO {  
  id: string;  
  name: string;  
  type: AssetTypeDTO;  
  netValue: string; // Formatted as string to preserve decimal precision  
  governanceState: GovernanceState;  
}

export interface DashboardSummaryDTO {  
  totalNetWorth: string;   
  baseCurrency: string;  
  pendingCapitalSum: string;  
  pendingCapitalCount: number;  
  governanceHealth: {  
    redCount: number;  
    yellowCount: number;  
  };  
  topEntities: TopLevelEntityDTO\[\];  
}

// Asset Directory DTOs  
export interface AssetTreeNodeDTO {  
  id: string;  
  name: string;  
  type: AssetTypeDTO;  
  ownershipPercentage: string; // "100.0000"  
  totalValue: string;  
  governanceState: GovernanceState;  
  hasChildren: boolean; // Tells the UI if it should render the expansion chevron  
}

// Airlock DTOs  
export interface AirlockQueueItemDTO {  
  id: string;  
  fileName: string;  
  uploadedAt: string; // ISO 8601  
  status: DocumentStatusDTO;  
}

export interface GhostEntryReviewDTO {  
  documentId: string;  
  fileUrl: string; // Pre-signed S3 URL for viewing  
  extractedData: {  
    assetName: string | null;  
    totalValue: string | null;  
    effectiveDate: string | null;  
    confidenceScore: number;   
  };  
}

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/dashboard/summary**

JSON

{  
  "totalNetWorth": "125450000.00",  
  "baseCurrency": "USD",  
  "pendingCapitalSum": "1200000.00",  
  "pendingCapitalCount": 4,  
  "governanceHealth": {  
    "redCount": 2,  
    "yellowCount": 1  
  },  
  "topEntities": \[  
    {  
      "id": "a1b2c3d4-e5f6-7890-1234-56789abcdef0",  
      "name": "Alpha Trust (G1)",  
      "type": "TRUST",  
      "netValue": "85000000.00",  
      "governanceState": "GREEN"  
    },  
    {  
      "id": "b2c3d4e5-f6a7-8901-2345-6789abcdef01",  
      "name": "Beta Holding LLC",  
      "type": "LLC",  
      "netValue": "40450000.00",  
      "governanceState": "RED"  
    }  
  \]  
}

**GET /api/airlock/queue?status=REVIEW\_REQUIRED**

JSON

{  
  "items": \[  
    {  
      "id": "doc\_8899aabb",  
      "fileName": "Q4\_Appraisal.pdf",  
      "uploadedAt": "2026-02-20T14:15:00Z",  
      "status": "REVIEW\_REQUIRED"  
    },  
    {  
      "id": "doc\_ccddee11",  
      "fileName": "K1\_AlphaTrust.pdf",  
      "uploadedAt": "2026-02-20T12:30:00Z",  
      "status": "REVIEW\_REQUIRED"  
    }  
  \],  
  "totalCount": 2  
}

**GET /api/assets/roots (Empty State)**

JSON

{  
  "items": \[\],  
  "totalCount": 0,  
  "message": "Your portfolio is empty."  
}

---

### **4\. Zod Validation Schemas (The Guardrails)**

TypeScript

import { z } from 'zod';

export const CreateAssetSchema \= z.object({  
  name: z.string().min(1, "Asset name is required").max(100),  
  type: z.enum(\['TRUST', 'LLC', 'REAL\_ESTATE', 'PRIVATE\_EQUITY'\]),  
  initialValuation: z.number().min(0, "Valuation cannot be negative"),  
  parentAssetId: z.string().uuid("Invalid Parent Entity ID").optional(),  
});

export const ApproveGhostEntrySchema \= z.object({  
  documentId: z.string().uuid(),  
  assetId: z.string().uuid("A parent asset association is mandatory"),  
  verifiedValue: z.number(),  
  effectiveDate: z.string().datetime(),  
});

The **Human-in-the-Loop (HITL) Validation** flow is the most critical juncture in the Vexel platform. It represents the bridge between unstructured external data (PDFs processed by the LLM) and our immutable structural ledger.

Here is the strict API Contract for the Airlock Ghost Entry Review and Approval cycle.

---

### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| GET | /api/airlock/documents/:id/review | Fetches the LLM-extracted "Ghost Entry" and the secure file URL for side-by-side comparison. | DocumentReviewSplitScreen.tsx |
| POST | /api/airlock/documents/:id/approve | Commits the verified data, updates the Asset ledger, and marks the document PROCESSED. | ApproveEntryButton.tsx |
| POST | /api/airlock/documents/:id/reject | Discards the ghost entry and marks the document REJECTED. | RejectEntryButton.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

export type ConfidenceLevelDTO \= 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExtractedDataDTO {  
  assetName: string | null;  
  assetType: AssetTypeDTO | null;  
  totalValue: string | null; // Extracted valuation, preserved as string  
  effectiveDate: string | null; // ISO 8601 Date  
  currency: string;  
}

export interface GhostEntryReviewDTO {  
  documentId: string;  
  fileName: string;  
  fileUrl: string; // Pre-signed, temporary S3/Vault URL  
  status: DocumentStatusDTO;  
  extractedData: ExtractedDataDTO;  
  confidenceScore: number; // 0 to 100  
  confidenceLevel: ConfidenceLevelDTO; // Computed by Backend for UI styling (Green/Yellow/Red)  
  suggestedAssetId: string | null; // If the LLM fuzzily matched an existing Asset in the DB  
}

export interface ApprovalResponseDTO {  
  success: boolean;  
  message: string;  
  documentId: string;  
  committedAssetId: string;  
  newStatus: 'PROCESSED';  
}

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/airlock/documents/doc\_8899aabb/review (High Confidence Match)**

JSON

{  
  "documentId": "doc\_8899aabb",  
  "fileName": "Q4\_2025\_Manhattan\_Appraisal.pdf",  
  "fileUrl": "https://vault.vexel.com/temp/presigned-url-expires-in-15m...",  
  "status": "REVIEW\_REQUIRED",  
  "extractedData": {  
    "assetName": "Manhattan Penthouse",  
    "assetType": "REAL\_ESTATE",  
    "totalValue": "45500000.00",  
    "effectiveDate": "2025-12-31",  
    "currency": "USD"  
  },  
  "confidenceScore": 96,  
  "confidenceLevel": "HIGH",  
  "suggestedAssetId": "c3d4e5f6-7890-1234-5678-9abcdef01234"   
}

**GET /api/airlock/documents/doc\_ccddee11/review (Low Confidence / Missing Data)**

JSON

{  
  "documentId": "doc\_ccddee11",  
  "fileName": "Capital\_Call\_Notice\_Fund\_IV.pdf",  
  "fileUrl": "https://vault.vexel.com/temp/presigned-url-expires-in-15m...",  
  "status": "REVIEW\_REQUIRED",  
  "extractedData": {  
    "assetName": "Sequoia Capital Fund IV",  
    "assetType": "PRIVATE\_EQUITY",  
    "totalValue": null,   
    "effectiveDate": "2026-02-15",  
    "currency": "USD"  
  },  
  "confidenceScore": 42,  
  "confidenceLevel": "LOW",  
  "suggestedAssetId": null   
}

**POST /api/airlock/documents/doc\_8899aabb/approve (Success Response)**

JSON

{  
  "success": true,  
  "message": "Asset valuation updated successfully.",  
  "documentId": "doc\_8899aabb",  
  "committedAssetId": "c3d4e5f6-7890-1234-5678-9abcdef01234",  
  "newStatus": "PROCESSED"  
}

---

### **4\. Zod Validation Schemas (The Guardrails)**

**CRITICAL RULE:** The Frontend *must* send the explicitly verified data, not just an "approve" boolean. The user might have corrected a hallucination from the LLM before clicking Approve. The Backend trusts the Request Body over the original LLM extraction.

TypeScript

import { z } from 'zod';

export const ApproveGhostEntrySchema \= z.object({  
  // We require the user to explicitly link it to an asset (either the suggested one or a new one)  
  assetId: z.string().uuid("A valid Asset ID must be selected or created."),  
    
  // The verified data submitted by the user  
  verifiedData: z.object({  
    totalValue: z.string().regex(/^\\d+(\\.\\d{1,2})?$/, "Value must be a valid decimal string"),  
    effectiveDate: z.string().datetime("Must be a valid ISO-8601 date"),  
    currency: z.string().length(3, "Must be a 3-letter currency code").default("USD")  
  }),  
    
  // Optional notes the Controller might leave for the Principal  
  approvalNotes: z.string().max(500).optional()  
});

export const RejectGhostEntrySchema \= z.object({  
  reason: z.enum(\['INCORRECT\_DATA', 'DUPLICATE\_DOCUMENT', 'NOT\_FINANCIAL\_DOCUMENT', 'OTHER'\]),  
  notes: z.string().max(500).optional()  
});

As the Principal API Architect, I have reviewed the PRD, Domain Model, and UX Spec regarding the **Access & Onboarding Module** and specifically the **Day-31 Hard Lock billing state constraints**.

### **Conflict Report**

* **Client-Side Time vs. Server-Side Enforcement:** The UX Spec requires showing the remaining grace period days and locking the UI on Day 31\. The Domain Model provides overageStartDate. If the Frontend calculates the 30-day limit using the user's local browser time, a user could bypass the lock by changing their system clock.  
* **Resolution:** The Backend must be the sole source of truth for time. The API will calculate daysInOverage and a strict isCreationLocked boolean on the server. The Frontend will simply consume these flags to render the UI and disable/enable structural POST buttons.  
* **Billing Status Enum Mapping:** The DB schema has BillingStatus (ACTIVE, PAST\_DUE, FROZEN). A tenant in a 15-day grace period is technically still ACTIVE but with an active overageStartDate. The DTO must abstract this complexity into a unified BillingStateDTO.

Here is the strict API Contract for the Billing & Access Lock flow.

---

### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| GET | /api/tenant/billing-status | Evaluates overage dates and returns strict UI lock flags. | GlobalBillingAlert.tsx, AddAssetButton.tsx |
| POST | /api/billing/checkout | Generates a secure Stripe Checkout session URL for upgrades. | UpgradePlanButton.tsx |
| POST | /api/billing/sync | Forces a synchronous check against Stripe to resolve webhook delays. | RefreshPaymentButton.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

export type OverageSeverityDTO \= 'NONE' | 'WARNING' | 'CRITICAL\_LOCK';

export interface BillingStateDTO {  
  tenantId: string;  
  planName: string;  
  assetLimit: number;  
  currentAssetCount: number;  
    
  // Computed by Backend using server time vs overageStartDate  
  isInOverage: boolean;  
  daysInOverage: number | null;   
  daysRemaining: number | null;   
    
  // The ultimate source of truth for the UI  
  severity: OverageSeverityDTO;  
  isCreationLocked: boolean; // If true, disable all POST /assets buttons  
}

export interface CheckoutSessionDTO {  
  checkoutUrl: string; // Stripe URL  
}

export interface BillingSyncResponseDTO {  
  success: boolean;  
  message: string;  
  paymentDetected: boolean;  
  updatedBillingState: BillingStateDTO; // Returns the fresh state so the UI updates instantly  
}

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/tenant/billing-status (State: Grace Period \- Day 15\)**

JSON

{  
  "tenantId": "tnt\_89012345",  
  "planName": "UHNW Standard",  
  "assetLimit": 50,  
  "currentAssetCount": 55,  
  "isInOverage": true,  
  "daysInOverage": 15,  
  "daysRemaining": 15,  
  "severity": "WARNING",  
  "isCreationLocked": false   
}

**GET /api/tenant/billing-status (State: Hard Lock \- Day 31+)**

JSON

{  
  "tenantId": "tnt\_89012345",  
  "planName": "UHNW Standard",  
  "assetLimit": 50,  
  "currentAssetCount": 58,  
  "isInOverage": true,  
  "daysInOverage": 32,  
  "daysRemaining": 0,  
  "severity": "CRITICAL\_LOCK",  
  "isCreationLocked": true   
}

**POST /api/billing/sync (State: Payment Found, Lock Removed)**

JSON

{  
  "success": true,  
  "message": "Payment verified. Platform unlocked.",  
  "paymentDetected": true,  
  "updatedBillingState": {  
    "tenantId": "tnt\_89012345",  
    "planName": "Family Office Enterprise",  
    "assetLimit": 9999,  
    "currentAssetCount": 58,  
    "isInOverage": false,  
    "daysInOverage": null,  
    "daysRemaining": null,  
    "severity": "NONE",  
    "isCreationLocked": false  
  }  
}

**POST /api/billing/sync (State: Webhook Delay / No Payment Found)**

JSON

{  
  "success": true,  
  "message": "No recent payment detected. If you just paid, please wait a moment and try again.",  
  "paymentDetected": false,  
  "updatedBillingState": {  
    "tenantId": "tnt\_89012345",  
    "planName": "UHNW Standard",  
    "assetLimit": 50,  
    "currentAssetCount": 58,  
    "isInOverage": true,  
    "daysInOverage": 32,  
    "daysRemaining": 0,  
    "severity": "CRITICAL\_LOCK",  
    "isCreationLocked": true  
  }  
}

---

### **4\. Zod Validation Schemas (The Guardrails)**

Because GET /api/tenant/billing-status and POST /api/billing/sync act entirely on the authenticated user's secure server-side session/cookie, they require no request body.

However, the checkout endpoint needs to know which plan the user is upgrading to.

TypeScript

import { z } from 'zod';

export const CreateCheckoutSessionSchema \= z.object({  
  targetPlanId: z.string().min(1, "A target plan must be specified"),  
  successUrl: z.string().url("Must provide a valid return URL for post-checkout redirection"),  
  cancelUrl: z.string().url("Must provide a valid return URL for cancellation")  
});

As the Principal API Architect, I have reviewed the Domain Model’s EntityOwnership junction table and the Functional Spec's mandate for "mathematically rigorous, recursive Net Worth calculations."

### **Conflict Report**

* **Graph Traversal Constraint:** The Domain Model stores totalValue on the Asset table and percentage on the EntityOwnership table. If the Frontend calculates the rollups, it must download the *entire* asset graph to memory to compute a single Trust's net worth. For UHNW portfolios with deep, multi-tiered LLC structures, this will crash the client.  
* **Resolution:** The Backend must execute a Recursive CTE (Common Table Expression) in PostgreSQL to walk the Directed Acyclic Graph (DAG). The API will deliver pre-calculated contributedValue fields in the DTO. The Frontend simply renders the math; it never computes it.  
* **Cyclic Ownership Protection:** The DB schema does not inherently prevent an LLC from owning its Parent Trust (a cyclic loop). The Backend API must intercept POST requests and throw an HTTP 409 Conflict if a cyclic graph is detected. The DTO reflects a strictly acyclic tree.

Here is the strict API Contract for the Asset Ledger and Cap Table Rollups.

---

### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| GET | /api/assets/:id/rollup | Fetches an asset's total value, broken down by its direct value and the exact value contributed by its children. | AssetNetWorthBreakdown.tsx |
| POST | /api/assets | Creates a new base asset in the ledger. | CreateAssetModal.tsx |
| POST | /api/assets/:id/ownership | Creates a cap table entry linking a child asset to a parent asset at a specific ownership percentage. | AddChildEntityForm.tsx |
| PUT | /api/ownership/:ownershipId | Adjusts an existing ownership percentage (e.g., selling 10% of an LLC). | EditOwnershipModal.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

// Shared Types  
export type AssetTypeDTO \= 'TRUST' | 'LLC' | 'REAL\_ESTATE' | 'PRIVATE\_EQUITY';

export interface OwnershipEdgeDTO {  
  ownershipId: string;  
  childAssetId: string;  
  childAssetName: string;  
  childAssetType: AssetTypeDTO;  
    
  // The raw values from the DB  
  ownershipPercentage: string; // e.g., "50.0000"  
  childTotalValue: string;     // e.g., "10000000.00" (Total standalone value of the child)  
    
  // Computed by Backend CTE  
  contributedValue: string;    // e.g., "5000000.00" (percentage \* childTotalValue)  
  effectiveDate: string;       // ISO 8601  
}

export interface AssetRollupDTO {  
  assetId: string;  
  name: string;  
  type: AssetTypeDTO;  
    
  // Direct value held natively by this entity (e.g., cash in the Trust's bank account)  
  directStandaloneValue: string;   
    
  // The sum of all \`contributedValue\` from child entities  
  rolledUpValue: string;   
    
  // The grand total: directStandaloneValue \+ rolledUpValue  
  totalNetValue: string;   
    
  // The Cap Table breakdown to render the UI table  
  holdings: OwnershipEdgeDTO\[\];  
}

export interface OwnershipMutationResponseDTO {  
  success: boolean;  
  message: string;  
  updatedRollup: AssetRollupDTO; // Returns the newly calculated rollup instantly  
}

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/assets/asset\_trust\_123/rollup (Master Trust Rollup)**

*Scenario: The Master Trust holds $2M in cash directly. It owns 100% of Waystar HoldCo ($200M) and 50% of a Manhattan Penthouse ($45M).*

JSON

{  
  "assetId": "asset\_trust\_123",  
  "name": "Master Generation Trust",  
  "type": "TRUST",  
  "directStandaloneValue": "2000000.00",  
  "rolledUpValue": "222500000.00",   
  "totalNetValue": "224500000.00",   
  "holdings": \[  
    {  
      "ownershipId": "own\_abc123",  
      "childAssetId": "asset\_llc\_456",  
      "childAssetName": "Waystar HoldCo LLC",  
      "childAssetType": "LLC",  
      "ownershipPercentage": "100.0000",  
      "childTotalValue": "200000000.00",  
      "contributedValue": "200000000.00",  
      "effectiveDate": "2020-01-01T00:00:00Z"  
    },  
    {  
      "ownershipId": "own\_def456",  
      "childAssetId": "asset\_re\_789",  
      "childAssetName": "Manhattan Penthouse",  
      "childAssetType": "REAL\_ESTATE",  
      "ownershipPercentage": "50.0000",  
      "childTotalValue": "45000000.00",  
      "contributedValue": "22500000.00",  
      "effectiveDate": "2025-06-01T00:00:00Z"  
    }  
  \]  
}

**POST /api/assets/asset\_trust\_123/ownership (Error State: Cyclic Ownership)**

JSON

{  
  "error": "Conflict",  
  "message": "Cyclic ownership detected. 'Waystar HoldCo LLC' cannot own 'Master Generation Trust' because 'Master Generation Trust' is already an upstream parent.",  
  "code": "CYCLIC\_GRAPH\_DETECTED"  
}

---

### **4\. Zod Validation Schemas (The Guardrails)**

TypeScript

import { z } from 'zod';

export const CreateAssetSchema \= z.object({  
  name: z.string().min(1, "Asset name is required").max(120),  
  type: z.enum(\['TRUST', 'LLC', 'REAL\_ESTATE', 'PRIVATE\_EQUITY'\]),  
  directStandaloneValue: z.string().regex(/^\\d+(\\.\\d{1,2})?$/, "Value must be a valid decimal string").default("0.00")  
});

export const CreateOwnershipEdgeSchema \= z.object({  
  childAssetId: z.string().uuid("Invalid Child Asset ID"),  
    
  // String validation to preserve precision without float rounding errors in transit  
  percentage: z.string()  
    .regex(/^\\d{1,3}(\\.\\d{1,4})?$/, "Percentage must be a decimal string (e.g. '50.0000')")  
    .refine((val) \=\> parseFloat(val) \> 0 && parseFloat(val) \<= 100, {  
      message: "Percentage must be greater than 0 and less than or equal to 100"  
    }),  
      
  effectiveDate: z.string().datetime("Must be a valid ISO-8601 date")  
});

export const UpdateOwnershipEdgeSchema \= CreateOwnershipEdgeSchema.pick({  
  percentage: true,  
  effectiveDate: true  
});

As the Principal API Architect, I have reviewed the Functional Spec’s mandate for strict Role-Based Access Control (RBAC) and the Domain Model’s division of users into ADMIN, PRINCIPAL, and CONTROLLER.

### **Conflict Report**

* **The Controller "Structural Approval" Dilemma:** The Functional Spec restricts Controllers from creating structural assets (no POST /assets). However, during the Airlock workflow, a Controller might review a document where the LLM suggests creating a *new* asset. If the Controller clicks "Approve and Create", the database will throw an error.  
* **Resolution:** The Frontend should never rely on hardcoded if (user.role \=== 'CONTROLLER') checks to hide buttons, as business rules change. The API must append a strict, pre-calculated allowedActions matrix to every Document and Vault DTO. If a Controller views a document requiring a new asset, the API will pass canCreateStructuralAsset: false, prompting the UI to render a "Request Principal Approval" button instead of "Approve".  
* **Vault Cohort Visibility:** The Domain Model mentions "Cohorts" for granular visibility. The backend will silently filter the GET lists based on the user's session token. The DTO remains identical; the Controller simply receives a smaller array of documents.

Here is the strict API Contract for the Document Vault and RBAC implementation.

---

### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| GET | /api/vault/documents | Lists securely stored documents, heavily filtered by the requesting user's role and cohort. | VaultDataGrid.tsx |
| POST | /api/vault/upload | Generates a pre-signed S3 upload URL. All roles can upload, but they cannot all dictate destination. | SecureUploadDropzone.tsx |
| PATCH | /api/vault/documents/:id | Updates document metadata (e.g., tags, cohort assignments). | DocumentPropertiesPanel.tsx |
| DELETE | /api/vault/documents/:id | Cryptographically shreds the document. Restricted strictly to Admins and Principals. | DeleteDocumentModal.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

export type RoleLevelDTO \= 'ADMIN' | 'PRINCIPAL' | 'CONTROLLER';

// The Backend computes this boolean matrix based on the user's Role and the specific Document's state.  
// The UI purely consumes this to enable/disable buttons or hide them entirely.  
export interface DocumentPermissionsDTO {  
  canViewFile: boolean;  
  canEditMetadata: boolean;  
  canDeleteFile: boolean;  
  canProcessInAirlock: boolean;  
  canCreateStructuralAsset: boolean; // False for Controllers  
}

export interface VaultDocumentDTO {  
  id: string;  
  fileName: string;  
  fileSizeBytes: number;  
  mimeType: string;  
  uploadedBy: {  
    userId: string;  
    name: string;  
    role: RoleLevelDTO;  
  };  
  uploadedAt: string; // ISO 8601  
  tags: string\[\];  
  associatedAssetId: string | null; // Null if it's unassigned or in the general vault  
    
  // Strict UI enforcement contract  
  permissions: DocumentPermissionsDTO;  
}

export interface VaultListResponseDTO {  
  items: VaultDocumentDTO\[\];  
  totalCount: number;  
  // Global permissions for the Vault view (e.g., "Upload" button)  
  globalPermissions: {  
    canUpload: boolean;  
    canCreateCohorts: boolean;  
  };  
}

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/vault/documents (View as: PRINCIPAL or ADMIN)**

*Scenario: The Principal sees everything and has full structural rights.*

JSON

{  
  "items": \[  
    {  
      "id": "doc\_vlt\_998877",  
      "fileName": "2025\_Master\_Trust\_Formation.pdf",  
      "fileSizeBytes": 4502048,  
      "mimeType": "application/pdf",  
      "uploadedBy": {  
        "userId": "usr\_lawyer\_1",  
        "name": "Tom Wambsgans",  
        "role": "CONTROLLER"  
      },  
      "uploadedAt": "2025-01-15T09:00:00Z",  
      "tags": \["Legal", "Formation", "K1"\],  
      "associatedAssetId": "asset\_trust\_123",  
      "permissions": {  
        "canViewFile": true,  
        "canEditMetadata": true,  
        "canDeleteFile": true,  
        "canProcessInAirlock": true,  
        "canCreateStructuralAsset": true  
      }  
    }  
  \],  
  "totalCount": 1,  
  "globalPermissions": {  
    "canUpload": true,  
    "canCreateCohorts": true  
  }  
}

**GET /api/vault/documents (View as: CONTROLLER)**

*Scenario: The Controller views the exact same document, but the Backend strips their destructive and structural capabilities.*

JSON

{  
  "items": \[  
    {  
      "id": "doc\_vlt\_998877",  
      "fileName": "2025\_Master\_Trust\_Formation.pdf",  
      "fileSizeBytes": 4502048,  
      "mimeType": "application/pdf",  
      "uploadedBy": {  
        "userId": "usr\_lawyer\_1",  
        "name": "Tom Wambsgans",  
        "role": "CONTROLLER"  
      },  
      "uploadedAt": "2025-01-15T09:00:00Z",  
      "tags": \["Legal", "Formation", "K1"\],  
      "associatedAssetId": "asset\_trust\_123",  
      "permissions": {  
        "canViewFile": true,  
        "canEditMetadata": true,  
        "canDeleteFile": false,   
        "canProcessInAirlock": true,  
        "canCreateStructuralAsset": false   
      }  
    }  
  \],  
  "totalCount": 1,  
  "globalPermissions": {  
    "canUpload": true,  
    "canCreateCohorts": false   
  }  
}

---

### **4\. Zod Validation Schemas (The Guardrails)**

When interacting with the Vault, the backend will verify the session token's RoleLevel internally. The validation schemas here strictly govern the shape of the data being sent.

TypeScript

import { z } from 'zod';

export const RequestUploadUrlSchema \= z.object({  
  fileName: z.string().min(1).max(255),  
  fileSizeBytes: z.number().max(50000000, "File size exceeds 50MB limit"),  
  mimeType: z.enum(\['application/pdf', 'image/png', 'image/jpeg', 'text/csv'\]),  
  targetAssetId: z.string().uuid().optional(),  
  tags: z.array(z.string().max(30)).max(10).optional()  
});

export const UpdateDocumentMetadataSchema \= z.object({  
  fileName: z.string().min(1).max(255).optional(),  
  tags: z.array(z.string().max(30)).max(10).optional(),  
  associatedAssetId: z.string().uuid().nullable().optional() // Allow unlinking via null  
});

This completes the foundational API Contracts required by the Product Requirements Document.

We have successfully mapped:

1. Dashboard & Core Types  
2. Airlock (HITL) Validation  
3. Billing Lockout States  
4. Asset Cap Table Rollups  
5. Document Vault & RBAC

