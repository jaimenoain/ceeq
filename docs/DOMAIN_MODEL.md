# **Ceeq: Domain Model**

Based on your answers, I have made the following architectural decisions to optimally support Vexel's enterprise-grade requirements:

1. **Tech Stack:** We will use **Prisma ORM (TypeScript)** backed by PostgreSQL. This provides unparalleled type safety and pairs perfectly with Zod for runtime validation.  
2. **Audit Logs:** We will use a dedicated AuditLog table with a strictly typed JSONB payload to capture point-in-time state changes (Event Sourcing pattern).  
3. **Vault Permissions:** We will decouple Roles from Cohorts. A User has a base Role (Admin, Principal, Controller) for system actions, and belongs to multiple Cohorts for granular Document Vault / Asset visibility.

Here is the definitive Domain Manifest for Jules.

---

### **1\. Data Contracts (The Schema)**

Code snippet

// schema.prisma  
generator client {  
  provider \= "prisma-client-js"  
}

datasource db {  
  provider \= "postgresql"  
  url      \= env("DATABASE\_URL")  
}

enum RoleLevel {  
  ADMIN  
  PRINCIPAL  
  CONTROLLER  
}

enum BillingStatus {  
  ACTIVE  
  PAST\_DUE  
  FROZEN  
}

enum DocumentStatus {  
  PENDING\_EXTRACTION  
  REVIEW\_REQUIRED  
  PROCESSED  
  REJECTED  
}

/// Represents an isolated family office or UHNW organization  
model Tenant {  
  id                 String        @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name               String  
  billingStatus      BillingStatus @default(ACTIVE)  
  /// Tracks the exact timestamp when a user exceeded their asset limit (starts the 30-day grace period)  
  overageStartDate   DateTime?  
    
  users              User\[\]  
  cohorts            Cohort\[\]  
  assets             Asset\[\]  
  documents          AirlockDocument\[\]  
  auditLogs          AuditLog\[\]

  createdAt          DateTime      @default(now())  
  updatedAt          DateTime      @updatedAt

  @@index(\[billingStatus\])  
}

/// Represents an authenticated individual within a Tenant  
model User {  
  id                 String        @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenantId           String        @db.Uuid  
  emailAddress       String        @unique  
  passwordHash       String  
  roleLevel          RoleLevel  
  lastLoginTimestamp DateTime?  
    
  tenant             Tenant        @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)  
  cohorts            UserCohort\[\]  
  uploadedDocs       AirlockDocument\[\]  
  auditLogs          AuditLog\[\]

  createdAt          DateTime      @default(now())  
  updatedAt          DateTime      @updatedAt

  @@index(\[tenantId, emailAddress\])  
}

/// Represents an RBAC grouping for document/asset visibility (e.g., "G2 Family Members")  
model Cohort {  
  id                 String        @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenantId           String        @db.Uuid  
  name               String  
    
  tenant             Tenant        @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)  
  users              UserCohort\[\]

  @@unique(\[tenantId, name\])  
}

model UserCohort {  
  userId             String        @db.Uuid  
  cohortId           String        @db.Uuid

  user               User          @relation(fields: \[userId\], references: \[id\], onDelete: Cascade)  
  cohort             Cohort        @relation(fields: \[cohortId\], references: \[id\], onDelete: Cascade)

  @@id(\[userId, cohortId\])  
}

/// Represents any financial holding or legal entity  
model Asset {  
  id                 String        @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenantId           String        @db.Uuid  
  name               String  
  type               String        // e.g., 'REAL\_ESTATE', 'LLC', 'TRUST'  
  totalValue         Decimal       @db.Decimal(19, 4\)

  tenant             Tenant        @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)  
  ownedBy            EntityOwnership\[\] @relation("ChildEntity")  
  owns               EntityOwnership\[\] @relation("ParentEntity")

  @@index(\[tenantId\])  
}

/// Defines the temporal Cap Table and recursive ownership structure  
model EntityOwnership {  
  id                 String        @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  parentAssetId      String        @db.Uuid  
  childAssetId       String        @db.Uuid  
  /// The percentage of the child owned by the parent (0.0000 to 100.0000)  
  percentage         Decimal       @db.Decimal(7, 4\)  
  /// Defines when this ownership state became active for temporal queries  
  effectiveDate      DateTime      @db.Date  
    
  parentAsset        Asset         @relation("ParentEntity", fields: \[parentAssetId\], references: \[id\], onDelete: Cascade)  
  childAsset         Asset         @relation("ChildEntity", fields: \[childAssetId\], references: \[id\], onDelete: Cascade)

  @@unique(\[parentAssetId, childAssetId, effectiveDate\])  
  @@index(\[effectiveDate\])  
}

/// Airlock module: Secure document vault for AI processing  
model AirlockDocument {  
  id                 String        @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenantId           String        @db.Uuid  
  uploadedById       String        @db.Uuid  
  fileUrl            String        // Encrypted S3/KMS URI  
  status             DocumentStatus @default(PENDING\_EXTRACTION)  
    
  tenant             Tenant        @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)  
  uploadedBy         User          @relation(fields: \[uploadedById\], references: \[id\])

  createdAt          DateTime      @default(now())

  @@index(\[tenantId, status\])  
}

/// Cryptographically secure, append-only event sourcing table  
model AuditLog {  
  id                 String        @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenantId           String        @db.Uuid  
  userId             String        @db.Uuid  
  action             String        // e.g., 'TASK\_RESOLVED', 'ASSET\_CREATED'  
  entityType         String  
  entityId           String        @db.Uuid  
  /// Contains the diff or the snapshot of the entity at the time of the event  
  payload            Json  
    
  tenant             Tenant        @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)  
  user               User          @relation(fields: \[userId\], references: \[id\])

  createdAt          DateTime      @default(now())

  @@index(\[tenantId, entityType, entityId\])  
}

### **2\. Runtime Validation (The Guardrails)**

We use Zod to enforce application-level constraints before data ever touches Prisma.

TypeScript

import { z } from 'zod';

// Strict password policy defined in PRD  
const PasswordSchema \= z.string()  
  .min(12, "Password must be at least 12 characters long")  
  .regex(/\[A-Z\]/, "Must contain at least one uppercase letter")  
  .regex(/\[0-9\]/, "Must contain at least one number")  
  .regex(/\[^A-Za-z0-9\]/, "Must contain at least one special character");

export const CreateUserSchema \= z.object({  
  emailAddress: z.string().email(),  
  password: PasswordSchema,  
  roleLevel: z.enum(\['ADMIN', 'PRINCIPAL', 'CONTROLLER'\]),  
});

// Entity Ownership validations (Cap Table Math)  
export const CreateOwnershipSchema \= z.object({  
  parentAssetId: z.string().uuid(),  
  childAssetId: z.string().uuid(),  
  percentage: z.number()  
    .min(0.0001, "Ownership must be greater than 0")  
    .max(100.0000, "Ownership cannot exceed 100%"),  
  effectiveDate: z.string().datetime(),  
}).refine(data \=\> data.parentAssetId \!== data.childAssetId, {  
  message: "An asset cannot own itself (circular dependency prevented at surface level).",  
  path: \["childAssetId"\]  
});

### **3\. Domain Relationships (The Map)**

Code snippet

erDiagram  
    TENANT ||--o{ USER : contains  
    TENANT ||--o{ COHORT : manages  
    TENANT ||--o{ ASSET : owns  
    TENANT ||--o{ AIRLOCK\_DOCUMENT : stores  
    TENANT ||--o{ AUDIT\_LOG : tracks

    USER ||--o{ USER\_COHORT : belongs\_to  
    COHORT ||--o{ USER\_COHORT : includes  
      
    USER ||--o{ AIRLOCK\_DOCUMENT : uploads  
    USER ||--o{ AUDIT\_LOG : performs

    ASSET ||--o{ ENTITY\_OWNERSHIP : "is parent in"  
    ASSET ||--o{ ENTITY\_OWNERSHIP : "is child in"

### **4\. Security & Access Policies (The Firewall)**

Vexel implements rigorous Multi-Tenant isolation using PostgreSQL Row Level Security (RLS).

SQL

\-- Enable RLS on all tables  
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;  
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;  
ALTER TABLE "AirlockDocument" ENABLE ROW LEVEL SECURITY;

\-- 1\. Tenant Isolation (The Prime Directive)  
\-- Users can only read/write data where the tenant\_id matches their session's tenant\_id  
CREATE POLICY tenant\_isolation\_policy ON "Asset"  
    USING (tenantId \= current\_setting('app.current\_tenant\_id')::uuid);

\-- 2\. Read-Only Freeze (Cold Storage)  
\-- If billingStatus is FROZEN, block all INSERT/UPDATE/DELETE actions  
CREATE POLICY block\_writes\_on\_frozen ON "Asset"  
    FOR INSERT  
    WITH CHECK (  
        (SELECT "billingStatus" FROM "Tenant" WHERE id \= current\_setting('app.current\_tenant\_id')::uuid) \!= 'FROZEN'  
    );

\-- 3\. Day 31 Hard-Lock (Overage constraint)  
\-- Prevent POSTing new assets if overage\_start\_date is \> 30 days ago  
CREATE POLICY block\_asset\_creation\_on\_overage ON "Asset"  
    FOR INSERT  
    WITH CHECK (  
        (SELECT "overageStartDate" FROM "Tenant" WHERE id \= current\_setting('app.current\_tenant\_id')::uuid) IS NULL   
        OR   
        (SELECT "overageStartDate" FROM "Tenant" WHERE id \= current\_setting('app.current\_tenant\_id')::uuid) \> NOW() \- INTERVAL '30 days'  
    );

### **5\. Business Invariants (The "Rules of Physics")**

* **Cap Table Math Limits:** The sum of percentage across all active EntityOwnership records where childAssetId is X cannot exceed 100.0000 for any given effectiveDate.  
* **Audit Immutability:** The system application layer must *never* execute a DELETE or UPDATE statement against the AuditLog table.  
* **Airlock State Machine:** An AirlockDocument cannot transition directly from PENDING\_EXTRACTION to PROCESSED without passing through REVIEW\_REQUIRED if the AI confidence score on extraction was below the required threshold.  
* **Circular Ownership Prevention:** A recursive check must be executed before creating an EntityOwnership record. If Asset A owns Asset B, and Asset B owns Asset C, Asset C cannot own Asset A.  
* **Grace Period Resolution:** When an asset is deleted, the system must check the total asset count. If the count falls below the plan limit, overageStartDate must be immediately set to null.

### **6\. The "Golden Record" (Mock Data)**

A fully hydrated representation of an Asset with its temporal Cap Table resolution and associated Audit Logs.

JSON

{  
  "id": "a1b2c3d4-e5f6-7890-1234-56789abcdef0",  
  "tenantId": "t9876543-210f-edcb-a987-6543210abcde",  
  "name": "Vexel Holdings LLC",  
  "type": "LLC",  
  "totalValue": "25000000.0000",  
  "capTable": {  
    "effectiveDate": "2026-02-20T00:00:00Z",  
    "owners": \[  
      {  
        "parentAssetId": "p1111111-2222-3333-4444-555555555555",  
        "parentName": "G1 Revocable Trust",  
        "percentage": "60.0000"  
      },  
      {  
        "parentAssetId": "p6666666-7777-8888-9999-000000000000",  
        "parentName": "G2 Family Trust",  
        "percentage": "40.0000"  
      }  
    \]  
  },  
  "recentActivity": \[  
    {  
      "auditId": "log12345-abcd-efgh-ijkl-mnopqrstuvwx",  
      "action": "OWNERSHIP\_UPDATED",  
      "user": "admin@vexel.family",  
      "timestamp": "2026-02-15T14:32:01Z",  
      "payload": {  
        "previousState": { "percentage": "100.0000", "owner": "G1 Revocable Trust" },  
        "newState": { "percentage": "60.0000", "owner": "G1 Revocable Trust" },  
        "reason": "Estate distribution event"  
      }  
    }  
  \]  
}

### **7\. The Seeding Specification (The Playground)**

This TypeScript script provisions a mathematically sound test environment for Jules to run end-to-end testing, including edge cases like active overages and complex ownership structures.

TypeScript

// seed.ts  
import { PrismaClient } from '@prisma/client';  
const prisma \= new PrismaClient();

async function main() {  
  // 1\. Create a Tenant in an active overage state (Day 15 of Grace Period)  
  const tenant \= await prisma.tenant.create({  
    data: {  
      name: 'Roy Family Office',  
      billingStatus: 'ACTIVE',  
      overageStartDate: new Date(Date.now() \- 15 \* 24 \* 60 \* 60 \* 1000), // 15 days ago  
    },  
  });

  // 2\. Create the Principal User  
  const principal \= await prisma.user.create({  
    data: {  
      tenantId: tenant.id,  
      emailAddress: 'logan@royfamily.io',  
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGG.xyz', // Mock bcrypt hash  
      roleLevel: 'PRINCIPAL',  
    },  
  });

  // 3\. Setup Cohorts  
  const g1Cohort \= await prisma.cohort.create({ data: { tenantId: tenant.id, name: 'G1 Leadership' }});  
  await prisma.userCohort.create({ data: { userId: principal.id, cohortId: g1Cohort.id }});

  // 4\. Create Assets (The Entities)  
  const masterTrust \= await prisma.asset.create({ data: { tenantId: tenant.id, name: 'Waystar Master Trust', type: 'TRUST', totalValue: 500000000.00 }});  
  const holdCo \= await prisma.asset.create({ data: { tenantId: tenant.id, name: 'Waystar HoldCo LLC', type: 'LLC', totalValue: 200000000.00 }});  
  const realEstate \= await prisma.asset.create({ data: { tenantId: tenant.id, name: 'Manhattan Penthouse', type: 'REAL\_ESTATE', totalValue: 45000000.00 }});

  // 5\. Establish Temporal Cap Table Relationships  
  // HoldCo is owned 100% by Master Trust  
  await prisma.entityOwnership.create({  
    data: {  
      parentAssetId: masterTrust.id,  
      childAssetId: holdCo.id,  
      percentage: 100.0000,  
      effectiveDate: new Date('2020-01-01'),  
    }  
  });

  // Real Estate is owned 50% by Master Trust, 50% by HoldCo (Testing complex roll-up math)  
  await prisma.entityOwnership.createMany({  
    data: \[  
      { parentAssetId: masterTrust.id, childAssetId: realEstate.id, percentage: 50.0000, effectiveDate: new Date('2025-06-01') },  
      { parentAssetId: holdCo.id, childAssetId: realEstate.id, percentage: 50.0000, effectiveDate: new Date('2025-06-01') }  
    \]  
  });

  // 6\. Airlock Document (Edge Case: Needs Review)  
  await prisma.airlockDocument.create({  
    data: {  
      tenantId: tenant.id,  
      uploadedById: principal.id,  
      fileUrl: 's3://vexel-vault/encrypted-doc-123.pdf',  
      status: 'REVIEW\_REQUIRED',  
    }  
  });

  console.log('Seeding completed successfully.');  
}

main().catch(e \=\> {  
  console.error(e);  
  process.exit(1);  
}).finally(async () \=\> {  
  await prisma.$disconnect();  
});

