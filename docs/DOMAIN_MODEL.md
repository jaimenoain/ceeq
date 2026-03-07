# **Ceeq: Data & API Contract**

## **1\. The Tenant & Auth Domain**

This domain handles the fundamental account isolation (multi-tenancy) and user access control.

### **Component 1: Database Schema**

Code snippet

model tenants {  
  id         String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name       String  
  max\_seats  Int      @default(5) // Capped by plan \[cite: 42, 43\]  
  created\_at DateTime @default(now())  
  updated\_at DateTime @updatedAt  
    
  users                    users\[\]  
  companies                companies\[\]  
  deals                    deals\[\]  
  custom\_field\_definitions custom\_field\_definitions\[\]  
}

model users {  
  id            String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenant\_id     String   @db.Uuid  
  email         String   @unique  
  password\_hash String   // Never exposed to frontend  
  first\_name    String  
  last\_name     String  
  role          String   // 'searcher' or 'analyst' \[cite: 39, 40\]  
  created\_at    DateTime @default(now())  
  updated\_at    DateTime @updatedAt

  tenant  tenants   @relation(fields: \[tenant\_id\], references: \[id\])  
  updates updates\[\]

  @@index(\[tenant\_id\])  
}

### **Component 2: Security Policies**

* **Row Level Security (RLS):** Default Deny on all tables.  
* **Tenant Isolation:** tenant\_id \= auth.jwt().tenant\_id. Users can only SELECT, INSERT, UPDATE, DELETE records where the tenant\_id matches their authenticated session.

* **Role Limitations:** Only users with role \== 'searcher' can update tenants or access account settings.

### **Component 3: API Route Registry & DTOs**

* GET /api/auth/me \- Get current user profile.

TypeScript

export interface UserDTO {  
  id: string; // Mapped from users.id  
  email: string; // Mapped from users.email  
  fullName: string; // Computed from DB fields: users.first\_name \+ ' ' \+ users.last\_name  
  role: 'searcher' | 'analyst'; // Mapped from users.role  
  tenantId: string; // Mapped from users.tenant\_id  
  // NOTE: password\_hash is strictly excluded  
}

### **Component 4: Input Validation**

TypeScript

import { z } from 'zod';

export const userLoginSchema \= z.object({  
  email: z.string().email(),  
  password: z.string().min(8, "Password must be at least 8 characters"),  
});

### **Component 5: Static JSON Mock**

JSON

{  
  "id": "e8a15620-31e0-4351-b9f1-799d631dfb15",  
  "email": "sarah.connor@apexsearch.fund",  
  "fullName": "Sarah Connor",  
  "role": "searcher",  
  "tenantId": "f9b25620-11e0-4351-b9f1-799d631dfb99"  
}

## ---

**2\. The Company Repository Domain**

The master database of all identified potential acquisition targets.

### **Component 1: Database Schema**

Code snippet

model custom\_field\_definitions {  
  id          String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenant\_id   String   @db.Uuid  
  entity\_type String   // 'company' or 'deal'  
  name        String  
  type        String   // 'text', 'number', 'date', 'select', etc. \[cite: 55\]  
  options     Json?    // Array of strings if type is 'select' or 'multi-select'  
    
  tenant tenants @relation(fields: \[tenant\_id\], references: \[id\])  
  @@index(\[tenant\_id, entity\_type\])  
}

model companies {  
  id                      String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenant\_id               String   @db.Uuid  
  company\_name            String   // \[cite: 53\]  
  tax\_id                  String?    
  country                 String   // \[cite: 53\]  
  region\_state            String?  
  city                    String?  
  sector\_industry         String?  
  estimated\_revenue\_range String?  
  number\_of\_employees     Int?  
  year\_founded            Int?  
  company\_website         String?  
  status                  String   @default("unreviewed") // \[cite: 68, 69\]  
  star\_rating             Int      @default(0) // \[cite: 53, 92\]  
  source\_tags             String\[\] // e.g., \['SII-2024', 'Brokers-Q1'\] \[cite: 62, 63\]  
  assigned\_to\_id          String?  @db.Uuid  
  custom\_attributes       Json     @default("{}") // Stores custom field values up to 50 \[cite: 57\]  
  created\_at              DateTime @default(now())  
  updated\_at              DateTime @updatedAt

  tenant tenants @relation(fields: \[tenant\_id\], references: \[id\])  
  deals  deals\[\]

  // Composite unique key for deduplication \[cite: 53, 108\]  
  @@unique(\[tenant\_id, tax\_id, country\])   
  @@index(\[tenant\_id, status\])  
}

### **Component 2: Security Policies**

* Analysts can create and edit companies, but cannot modify custom\_field\_definitions (restricted to Searchers).

### **Component 3: API Route Registry & DTOs**

* GET /api/companies \- List companies (supports pagination and filtering).  
* POST /api/companies \- Create a new company.

TypeScript

export interface CompanyDTO {  
  id: string; // Mapped from companies.id  
  companyName: string; // Mapped from companies.company\_name  
  taxId: string | null; // Mapped from companies.tax\_id  
  country: string; // Mapped from companies.country  
  location: string; // Computed from DB fields: (companies.city ? companies.city \+ ', ' : '') \+ companies.region\_state  
  sector: string | null; // Mapped from companies.sector\_industry  
  revenueRange: string | null; // Mapped from companies.estimated\_revenue\_range  
  website: string | null; // Mapped from companies.company\_website  
  status: 'Unreviewed' | 'Screening' | 'Candidate' | 'Caution' | 'Discarded' | 'Nurturing' | 'Converted to Deal'; // Mapped from companies.status \[cite: 69\]  
  starRating: number; // Mapped from companies.star\_rating  
  sourceTags: string\[\]; // Mapped from companies.source\_tags  
  customData: Record\<string, any\>; // Mapped from companies.custom\_attributes  
  createdAt: string; // Mapped from companies.created\_at  
}

### **Component 4: Input Validation**

TypeScript

export const createCompanySchema \= z.object({  
  companyName: z.string().min(1, "Company Name is required"),  
  country: z.string().min(1, "Country is required"), // Required per PRD \[cite: 53\]  
  taxId: z.string().optional(),  
  starRating: z.number().min(0).max(5).default(0),  
  sourceTags: z.array(z.string()).default(\[\]),  
  customData: z.record(z.any()).refine((data) \=\> Object.keys(data).length \<= 50, {  
    message: "Cannot exceed 50 custom fields", // \[cite: 57, 59\]  
  }),  
});

### **Component 5: Static JSON Mock**

JSON

{  
  "id": "c1a15620-31e0-4351-b9f1-799d631dfb22",  
  "companyName": "TechFlow Solutions SPA",  
  "taxId": "76.543.210-K",  
  "country": "Chile",  
  "location": "Las Condes, Región Metropolitana",  
  "sector": "B2B SaaS",  
  "revenueRange": "$1M \- $5M",  
  "website": "https://techflow.cl",  
  "status": "Candidate",  
  "starRating": 4,  
  "sourceTags": \["SII-2024", "Network-José"\],  
  "customData": {  
    "founderWillingToStay": "Yes",  
    "grossMargin": 82  
  },  
  "createdAt": "2026-03-01T10:00:00Z"  
}

## ---

**3\. The Deal Pipeline & Tasks Domain**

Structured workflow for companies that have entered active evaluation.

### **Component 1: Database Schema**

Code snippet

model deals {  
  id                String    @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenant\_id         String    @db.Uuid  
  company\_id        String    @db.Uuid  
  deal\_name         String    // \[cite: 155\]  
  stage             String    // 'Screening', 'Outreach', etc. \[cite: 147\]  
  star\_rating       Int       @default(0)  
  source            String?   // 'Broker', 'Network', etc. \[cite: 155\]  
  assigned\_to\_id    String?   @db.Uuid  
  last\_contact\_date DateTime? // \[cite: 155\]  
  next\_action       String?  
  next\_action\_date  DateTime?  
  close\_reason      String?   // \[cite: 155\]  
  custom\_attributes Json      @default("{}") // Limit 50 \[cite: 156\]  
  created\_at        DateTime  @default(now())  
  updated\_at        DateTime  @updatedAt

  tenant   tenants   @relation(fields: \[tenant\_id\], references: \[id\])  
  company  companies @relation(fields: \[company\_id\], references: \[id\])  
  tasks    tasks\[\]  
  updates  updates\[\]

  @@index(\[tenant\_id, stage\])  
}

model tasks {  
  id             String    @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenant\_id      String    @db.Uuid  
  deal\_id        String    @db.Uuid  
  title          String  
  due\_date       DateTime  
  status         String    @default("pending") // 'pending', 'completed', 'dismissed' \[cite: 196, 198, 200\]  
  dismissal\_note String?   // \[cite: 200\]  
  created\_at     DateTime  @default(now())  
  updated\_at     DateTime  @updatedAt

  deal deals @relation(fields: \[deal\_id\], references: \[id\])  
  @@index(\[tenant\_id, status, due\_date\])  
}

### **Component 2: Security Policies**

* All users in a tenant can view, create, and edit deals and tasks.

* System (backend) has exclusive rights to auto-generate tasks based on last\_contact\_date updates.

### **Component 3: API Route Registry & DTOs**

* GET /api/deals \- List deals (used for Kanban or List view).  
* GET /api/tasks \- Global task view.

TypeScript

export interface DealDTO {  
  id: string; // Mapped from deals.id  
  dealName: string; // Mapped from deals.deal\_name  
  companyId: string; // Mapped from deals.company\_id  
  stage: string; // Mapped from deals.stage  
  isActiveView: boolean; // Computed from DB field: true if stage is NOT 'Closed \- Won', 'Closed \- Lost', or 'On Hold' \[cite: 147, 166, 167\]  
  starRating: number; // Mapped from deals.star\_rating  
  lastContactDate: string | null; // Mapped from deals.last\_contact\_date  
  nextAction: string | null; // Mapped from deals.next\_action  
  customData: Record\<string, any\>; // Mapped from deals.custom\_attributes  
}

export interface TaskDTO {  
  id: string; // Mapped from tasks.id  
  dealId: string; // Mapped from tasks.deal\_id  
  dealName: string; // Computed from relation: tasks.deal.deal\_name \[cite: 161, 201\]  
  title: string; // Mapped from tasks.title  
  dueDate: string; // Mapped from tasks.due\_date  
  status: 'pending' | 'completed' | 'dismissed'; // Mapped from tasks.status  
  dismissalNote: string | null; // Mapped from tasks.dismissal\_note  
}

### **Component 4: Input Validation**

TypeScript

const dealStages \= \["Screening", "Outreach", "Initial Meeting", "Preliminary Analysis", "Detailed Analysis", "LOI Submitted", "Due Diligence", "Closed — Won", "Closed — Lost", "On Hold"\] as const; // \[cite: 147\]

export const updateDealSchema \= z.object({  
  stage: z.enum(dealStages).optional(),  
  lastContactDate: z.string().datetime().optional(),  
  closeReason: z.string().optional().refine((val) \=\> {  
    // App-level check: require closeReason if moving to Closed or Hold \[cite: 155\]  
    return true;   
  }),  
});

### **Component 5: Static JSON Mock**

JSON

{  
  "id": "d1a15620-31e0-4351-b9f1-799d631dfb33",  
  "dealName": "TechFlow Solutions SPA",  
  "companyId": "c1a15620-31e0-4351-b9f1-799d631dfb22",  
  "stage": "Preliminary Analysis",  
  "isActiveView": true,  
  "starRating": 4,  
  "lastContactDate": "2026-03-05T14:30:00Z",  
  "nextAction": "Review requested financials",  
  "customData": {  
    "preliminaryEvRange": "$3M \- $4.5M",  
    "ebitdaEstimate": "$800k"  
  }  
}

## ---

**4\. The Updates Domain**

The institutional memory of the deal process.

### **Component 1: Database Schema**

Code snippet

model updates {  
  id             String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  tenant\_id      String   @db.Uuid  
  deal\_id        String   @db.Uuid  
  author\_id      String   @db.Uuid  
  type           String   // 'Meeting Note', 'Decision', etc. \[cite: 186\]  
  title          String?  // \[cite: 184\]  
  body           String   @db.Text // \[cite: 184\]  
  external\_links Json     @default("\[\]") // Array of { url: string, label?: string } \[cite: 192, 194\]  
  date           DateTime @default(now()) // Can be backdated \[cite: 184\]  
  created\_at     DateTime @default(now())

  tenant tenant @relation(fields: \[tenant\_id\], references: \[id\])  
  deal   deals  @relation(fields: \[deal\_id\], references: \[id\])  
  author users  @relation(fields: \[author\_id\], references: \[id\])  
    
  @@index(\[deal\_id, date(sort: Desc)\])  
}

### **Component 2: Security Policies**

* Updates are completely bound to the deal\_id they belong to, inheriting tenant visibility.

### **Component 3: API Route Registry & DTOs**

* GET /api/deals/:id/updates \- Get chronological updates for a deal.

TypeScript

export interface ExternalLinkDTO {  
  url: string;  
  label: string | null;  
}

export interface UpdateDTO {  
  id: string; // Mapped from updates.id  
  type: string; // Mapped from updates.type  
  title: string | null; // Mapped from updates.title  
  body: string; // Mapped from updates.body  
  externalLinks: ExternalLinkDTO\[\]; // Mapped from updates.external\_links \[cite: 194\]  
  eventDate: string; // Mapped from updates.date  
  authorName: string; // Computed from relation: updates.author.first\_name \+ ' ' \+ updates.author.last\_name  
}

### **Component 4: Input Validation**

TypeScript

export const createUpdateSchema \= z.object({  
  type: z.enum(\["Meeting Note", "Call Note", "Email Summary", "Analysis", "Valuation Note", "Decision", "Other"\]), // \[cite: 186\]  
  title: z.string().optional(),  
  body: z.string().min(1, "Update body cannot be empty"),  
  externalLinks: z.array(z.object({  
    url: z.string().url("Must be a valid URL"),  
    label: z.string().optional()  
  })).default(\[\]), // \[cite: 192, 194\]  
  date: z.string().datetime().optional()   
});

### **Component 5: Static JSON Mock**

JSON

{  
  "id": "u1a15620-31e0-4351-b9f1-799d631dfb44",  
  "type": "Valuation Note",  
  "title": "First pass DCF model complete",  
  "body": "\<p\>Finished the initial DCF based on the financials provided last week. Margin compression in year 3 is a slight concern. Need to address during the next call.\</p\>",  
  "externalLinks": \[  
    {  
      "url": "https://docs.google.com/spreadsheets/d/example",  
      "label": "Preliminary Valuation — v2"  
    }  
  \],  
  "eventDate": "2026-03-06T09:00:00Z",  
  "authorName": "Sarah Connor"  
}

