# **Ceeq: Domain Model**

## **1\. Data Contracts (The Schema)**

Here is the definitive Prisma ORM schema. It enforces strict referential integrity, implements the global hashing strategy for collision detection , and properly isolates the raw "Universe" from the active Deal pipeline.

Code snippet

// schema.prisma

generator client {  
  provider \= "prisma-client-js"  
}

datasource db {  
  provider \= "postgresql"  
  url      \= env("DATABASE\_URL")  
}

// \================= ENUMS \=================

enum WorkspaceType {  
  SEARCHER  
  INVESTOR  
}

enum SubscriptionPlan {  
  FREE  
  SEARCHER\_PRO  
  INVESTOR\_PREMIUM  
}

enum Role {  
  ADMIN  
  ANALYST  
}

enum DealStage {  
  INBOX  
  NDA\_SIGNED  
  CIM\_REVIEW  
  LOI\_ISSUED  
  DUE\_DILIGENCE  
  CLOSED\_WON  
}

enum DealStatus {  
  ACTIVE  
  ARCHIVED  
  LOST  
}

enum VisibilityTier {  
  TIER\_1\_PRIVATE  
  TIER\_2\_SHARED  
}

enum SourcingStatus {  
  UNTOUCHED  
  IN\_SEQUENCE  
  REPLIED  
  ARCHIVED  
  CONVERTED  
}

// \================= MODELS \=================

/// Core multi-tenant container isolating Searchers and Investors.  
model Workspace {  
  id                 String           @id @default(uuid()) @db.Uuid  
  workspaceType      WorkspaceType  
  name               String  
  stripeCustomerId   String?          @unique  
  subscriptionPlan   SubscriptionPlan @default(FREE)  
  createdAt          DateTime         @default(now())  
  deletedAt          DateTime?        // Soft delete for GDPR/auditing  
    
  users              User\[\]  
  deals              Deal\[\]  
  companies          Company\[\]  
  sourcingTargets    SourcingTarget\[\]  
  sponsoredLicenses  SponsoredLicense\[\] @relation("Sponsor")  
  receivedLicenses   SponsoredLicense\[\] @relation("Recipient")

  @@index(\[workspaceType\])  
}

/// System actors (Searchers or Investors).   
model User {  
  id                 String    @id @default(uuid()) @db.Uuid  
  workspaceId        String    @db.Uuid  
  role               Role  
  email              String    @unique  
  firstName          String  
  lastName           String  
  linkedinUrl        String?  
  emailNotifications Boolean   @default(true)  
    
  workspace          Workspace @relation(fields: \[workspaceId\], references: \[id\])  
  tasks              Task\[\]  
  uploadedDocs       Document\[\]

  @@index(\[workspaceId, role\])  
}

/// Handles Investor-sponsored Pro seats for Searchers.  
model SponsoredLicense {  
  id                   String   @id @default(uuid()) @db.Uuid  
  sponsorWorkspaceId   String   @db.Uuid  
  recipientWorkspaceId String   @db.Uuid  
  isActive             Boolean  @default(false)  
    
  sponsor              Workspace @relation("Sponsor", fields: \[sponsorWorkspaceId\], references: \[id\])  
  recipient            Workspace @relation("Recipient", fields: \[recipientWorkspaceId\], references: \[id\])

  @@unique(\[sponsorWorkspaceId, recipientWorkspaceId\])  
}

/// The "Universe": Top-of-funnel scraping and CSV targets.  
model SourcingTarget {  
  id                 String         @id @default(uuid()) @db.Uuid  
  workspaceId        String         @db.Uuid  
  domain             String         // E.g., acme.com  
  name               String  
  industry           String?  
  estimatedRevenue   Decimal?       @db.Decimal(15, 2\)  
  estimatedMargins   Decimal?       @db.Decimal(5, 2\)  
  fitScore           Int            @default(0)  
  scoreMetadata      Json?          // Stores custom weights and variables  
  status             SourcingStatus @default(UNTOUCHED)  
    
  workspace          Workspace      @relation(fields: \[workspaceId\], references: \[id\])

  @@unique(\[workspaceId, domain\])  
  @@index(\[workspaceId, fitScore(sort: Desc)\])  
}

/// The "Core CRM": Qualified targets actively being worked or historically tracked.  
model Company {  
  id                 String    @id @default(uuid()) @db.Uuid  
  workspaceId        String    @db.Uuid  
  name               String  
  domain             String  
  /// Globally peppered SHA-256 hash for cross-workspace collision detection  
  hashedDomain       String    @db.VarChar(64)   
  industry           String?  
    
  workspace          Workspace @relation(fields: \[workspaceId\], references: \[id\])  
  deals              Deal\[\]

  @@unique(\[workspaceId, domain\])  
  @@index(\[hashedDomain\]) // Crucial for rapid global collision lookups  
}

/// The Deal Container: The single source of truth for an acquisition attempt.  
model Deal {  
  id                 String         @id @default(uuid()) @db.Uuid  
  workspaceId        String         @db.Uuid  
  companyId          String         @db.Uuid  
  stage              DealStage      @default(INBOX)  
  status             DealStatus     @default(ACTIVE)  
  visibilityTier     VisibilityTier @default(TIER\_1\_PRIVATE)  
  createdAt          DateTime       @default(now())  
    
  workspace          Workspace      @relation(fields: \[workspaceId\], references: \[id\])  
  company            Company        @relation(fields: \[companyId\], references: \[id\])  
  financials         FinancialRecord\[\]  
  documents          Document\[\]  
  tasks              Task\[\]

  @@index(\[workspaceId, stage, status\])  
  @@index(\[visibilityTier\]) // Crucial for Investor OS queries  
}

/// Extracted financial data with Human-in-the-Loop validation status.  
model FinancialRecord {  
  id                 String    @id @default(uuid()) @db.Uuid  
  dealId             String    @db.Uuid  
  fiscalYear         Int  
  revenue            Decimal?  @db.Decimal(15, 2\)  
  ebitda             Decimal?  @db.Decimal(15, 2\)  
  grossMargin        Decimal?  @db.Decimal(5, 2\)  
  /// Flexible JSONB for custom add-backs, capex, etc.  
  customMetrics      Json?       
  isVerifiedByHuman  Boolean   @default(false)  
    
  deal               Deal      @relation(fields: \[dealId\], references: \[id\], onDelete: Cascade)

  @@unique(\[dealId, fiscalYear\])  
}

/// Document Vault entity mapped to S3.  
model Document {  
  id                     String   @id @default(uuid()) @db.Uuid  
  dealId                 String   @db.Uuid  
  uploaderId             String   @db.Uuid  
  fileName               String  
  s3ObjectKey            String   @unique  
  isSharedWithInvestor   Boolean  @default(false)  
    
  deal                   Deal     @relation(fields: \[dealId\], references: \[id\], onDelete: Cascade)  
  uploader               User     @relation(fields: \[uploaderId\], references: \[id\])

  @@index(\[dealId, isSharedWithInvestor\])  
}

/// Operational tasks mapped globally or to specific deals.  
model Task {  
  id                 String    @id @default(uuid()) @db.Uuid  
  dealId             String?   @db.Uuid  
  assigneeId         String    @db.Uuid  
  title              String  
  isCompleted        Boolean   @default(false)  
  dueDate            DateTime?  
    
  deal               Deal?     @relation(fields: \[dealId\], references: \[id\], onDelete: Cascade)  
  assignee           User      @relation(fields: \[assigneeId\], references: \[id\])

  @@index(\[assigneeId, isCompleted\])  
}

---

## **2\. Runtime Validation (The Guardrails)**

We will use **Zod** to catch logic errors at the application boundary before they hit the database.

TypeScript

import { z } from "zod";

// Password & User Guardrails  
export const UserRegistrationSchema \= z.object({  
  email: z.string().email("Must be a universally valid email"),  
  password: z.string()  
    .min(12, "Password must be at least 12 characters")  
    .regex(/\[A-Z\]/, "Must contain at least one uppercase letter")  
    .regex(/\[0-9\]/, "Must contain at least one number")  
    .regex(/\[^a-zA-Z0-9\]/, "Must contain at least one special character"),  
  firstName: z.string().min(1),  
  lastName: z.string().min(1),  
  linkedinUrl: z.string().url("Must be a valid URL").optional(),  
  role: z.enum(\["ADMIN", "ANALYST"\])  
});

// Domain Sourcing Target Guardrails  
export const SourcingTargetCreateSchema \= z.object({  
  domain: z.string().refine((val) \=\> /^\[a-zA-Z0-9.-\]+\\.\[a-zA-Z\]{2,}$/.test(val), {  
    message: "Must be a valid FQDN (e.g., acme.com)",  
  }),  
  name: z.string().min(2),  
  estimatedRevenue: z.number().nonnegative().optional(),  
  estimatedMargins: z.number().min(0).max(100).optional(),  
});

// AI OCR Financial Validation Guardrails  
export const FinancialRecordVerificationSchema \= z.object({  
  fiscalYear: z.number().int().min(1900).max(2100),  
  revenue: z.number().nonnegative().optional(),  
  ebitda: z.number().optional(), // EBITDA can technically be negative  
  grossMargin: z.number().min(-100).max(100).optional(),  
  isVerifiedByHuman: z.literal(true, {  
    errorMap: () \=\> ({ message: "Must be verified by a human before saving" })  
  }),  
  customMetrics: z.record(z.string(), z.number()).optional() // Validating the JSONB shape  
});

---

## **3\. Domain Relationships (The Map)**

This ERD visualizes the strict boundaries between the multi-tenant Workspace, the raw SourcingTarget (Universe), and the structured Deal pipeline.

Code snippet

erDiagram  
    WORKSPACE ||--o{ USER : "has many"  
    WORKSPACE ||--o{ SOURCING\_TARGET : "has many (Universe)"  
    WORKSPACE ||--o{ COMPANY : "has many"  
    WORKSPACE ||--o{ DEAL : "has many"  
    WORKSPACE ||--o{ SPONSORED\_LICENSE : "grants/receives"  
      
    COMPANY ||--o{ DEAL : "can have multiple historical"  
      
    DEAL ||--o{ FINANCIAL\_RECORD : "contains"  
    DEAL ||--o{ DOCUMENT : "contains"  
    DEAL ||--o{ TASK : "has operational"  
      
    USER ||--o{ TASK : "assigned to"  
    USER ||--o{ DOCUMENT : "uploads"

---

## **4\. Security & Access Policies (The Firewall)**

Given your requirement for multi-tenancy and cryptographic privacy, here is the core Application-Level Access Control logic (to be enforced via backend middleware).

\+2

* **Tenant Isolation Rule:** A user can *only* read/write data where record.workspaceId \=== user.workspaceId.  
* **Searcher RBAC:**  
  * ADMIN: Full CRUD on Workspace, User, Deal, Company, Document, FinancialRecord.  
  * ANALYST: Can Create/Read/Update Deal, Company, Document, FinancialRecord. **Cannot** Delete Deal (Archive only). **Cannot** access Workspace settings/billing.  
  * \+1  
* **Investor Tier 2 Firewall:**  
  * If user.workspaceType \=== INVESTOR and attempts to fetch Deal details:  
    * **Rule 1 (Tier Boundary):** If Deal.visibilityTier \=== TIER\_1\_PRIVATE, return 403 Forbidden and obfuscate aggregated metrics (e.g., "$1M \- $2M").  
    * \+1  
    * **Rule 2 (Read-Only State):** If Deal.visibilityTier \=== TIER\_2\_SHARED, return full Deal details, but explicitly block PUT/POST/DELETE requests.  
    * **Rule 3 (Document Granularity):** Only return Document records where dealId \=== request.dealId AND isSharedWithInvestor \=== true.  
    * \+1  
    * **Rule 4 (Chat Isolation):** Completely strip InternalChatMessage arrays from the API response to the Investor.  
    * \+1

---

## **5\. Business Invariants (The "Rules of Physics")**

These are the strict, non-negotiable logical rules governing Ceeq:

* **The Zero-Privacy Handshake:** No data (not even anonymized Tier 1 aggregated deal flow) can flow from a Searcher to an Investor unless an active, mutually-approved connection exists between their Workspaces.  
* \+1  
* **Financial Contamination Lock:** Data extracted via the AI OCR engine remains in a temporary state. It cannot be used in dashboard aggregate calculations or shared to the Investor OS until FinancialRecord.isVerifiedByHuman \=== true.  
* \+1  
* **Collision Hash Salting:** The hashedDomain on the Company model MUST utilize a single, global pepper algorithm (rather than per-workspace salts) to allow the system to silently detect cross-workspace overlap (Traffic Light Alerts) without breaking NDA walls.  
* \+2  
* **The Single Active Deal Rule:** While a Company can have multiple historical Deals mapped to it (1:N), a Workspace cannot have more than one Deal where status \=== ACTIVE linked to the same CompanyId simultaneously.  
* \+1  
* **Soft Deletion for Compliance:** If a Searcher Workspace is deleted, historical Documents and Deals previously marked as TIER\_2\_SHARED must be retained in read-only mode for the backing Investor to satisfy audit logs.

---

## **6\. The "Golden Record" (Mock Data)**

Here is a fully populated Deal JSON payload, demonstrating the structure after OCR extraction, human validation, and Tier 2 Investor sharing.

JSON

{  
  "id": "deal-9f8a-4b2c-819a-112233445566",  
  "stage": "DUE\_DILIGENCE",  
  "status": "ACTIVE",  
  "visibilityTier": "TIER\_2\_SHARED",  
  "createdAt": "2026-02-15T10:00:00Z",  
  "company": {  
    "name": "Acme Logistics",  
    "domain": "acme-logistics.com",  
    "industry": "Transportation",  
    "hashedDomain": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"  
  },  
  "financials": \[  
    {  
      "fiscalYear": 2025,  
      "revenue": 5320000.00,  
      "ebitda": 1450000.00,  
      "grossMargin": 34.5,  
      "isVerifiedByHuman": true,  
      "customMetrics": {  
        "ownersSalaryAddback": 150000.00,  
        "oneTimeLegalFee": 25000.00  
      }  
    }  
  \],  
  "documents": \[  
    {  
      "fileName": "Acme\_CIM\_2025.pdf",  
      "s3ObjectKey": "vault/deal-9f8a/acme\_cim\_2025\_secure.pdf",  
      "isSharedWithInvestor": true  
    },  
    {  
      "fileName": "Internal\_Notes\_Unsanitized.docx",  
      "s3ObjectKey": "vault/deal-9f8a/notes\_internal.docx",  
      "isSharedWithInvestor": false  
    }  
  \]  
}

---

## **7\. The Seeding Specification (The Playground)**

To test the multi-tenancy and the privacy firewall, Jules must use a seed script that provisions interlocked environments.

TypeScript

// seed.ts logic overview

async function seed() {  
  // 1\. Create Workspaces  
  const investorWorkspace \= await createWorkspace(INVESTOR, "Apex Capital");  
  const searcherWorkspace \= await createWorkspace(SEARCHER, "Blue Ocean Search");

  // 2\. Establish Active Network Connection (Simulating the Handshake)  
  await createNetworkConnection(investorWorkspace.id, searcherWorkspace.id, 'ACTIVE');

  // 3\. Create the "Universe" Noise  
  await createSourcingTargets(searcherWorkspace.id, 500); // Noise data

  // 4\. Create the Target Company  
  const company \= await createCompany(searcherWorkspace.id, {  
     name: "Acme Logistics",  
     domain: "acme.com",  
     hashedDomain: generateGlobalHash("acme.com")   
  });

  // 5\. Seed Edge Case: The "Tier 1 vs Tier 2" Firewall Test  
  // Create an active Deal for Acme Logistics  
  const deal \= await createDeal(searcherWorkspace.id, company.id, {  
     visibilityTier: VisibilityTier.TIER\_2\_SHARED,  
     stage: DealStage.LOI\_ISSUED  
  });

  // Attach mixed-visibility documents  
  await attachDocument(deal.id, "Public\_CIM.pdf", true); // Investor CAN see  
  await attachDocument(deal.id, "Private\_Valuation\_Model.xlsx", false); // Investor CANNOT see

  // Attach Unverified Financials (Should NOT be visible in Dashboard aggregates)  
  await createFinancials(deal.id, {  
     revenue: 4000000,   
     isVerifiedByHuman: false   
  });  
}  
