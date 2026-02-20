# **Ceeq: Functional Spec**

## **1\. Executive Summary**

Ceeq is a comprehensive, dual-sided B2B operating system specifically designed for the search fund ecosystem, connecting Searchers (business acquirers) and Investors (funds). The platform's value proposition lies in unifying the fragmented acquisition workflow: it replaces disconnected spreadsheets and emails with an AI-driven Sourcing Engine for discovering targets , an automated outreach CRM for tracking engagements , and an OCR-powered financial extraction tool with a human-in-the-loop validation system. The core loop enables Searchers to systematically build and advance an acquisition pipeline, while leveraging a cryptographic privacy architecture (Tier 1 vs. Tier 2 visibility) to selectively share sanitized deal flow, standardized P\&L models, and due diligence documents with their backing Investors in real-time.

## **2\. User Roles & Permissions Matrix**

This matrix defines the primary actors within Ceeq and their access levels (Create, Read, Update, Delete \- CRUD) across the platform's key modules.

### **System Actors**

* **Searcher Admin:** Owner of the Searcher Workspace. Manages the team, integrations, pipeline configurations, and billing (for the $29/mo paid tier).  
* **Searcher Analyst:** Team member within the Searcher Workspace. Executes daily operations in the CRM, manages Deals and documents, but strictly has no access to billing or workspace-level configurations.  
* **Investor Admin (Fund Partner):** Owner of the Investor Workspace ($499/mo tier). Manages fund billing, allocates free premium licenses to Searchers, and views Tier 2 (Shared) Deal Flow.  
* **Investor Analyst:** Team member within the Investor Workspace. Has strictly Read-Only access to shared Deals (Tier 2\) and their associated documents. This role maintains a strict 1:1 relationship with a single Fund Workspace.

### **Permissions Matrix (CRUD)**

| Feature / Module | Searcher Admin | Searcher Analyst | Investor Admin | Investor Analyst |
| :---- | :---- | :---- | :---- | :---- |
| **Billing & Subscriptions (Stripe)** | R, U | *No Access* | R, U | *No Access* |
| **User Management (Workspace)** | C, R, U, D | R | C, R, U, D | R |
| **Searcher License Allocation** | *No Access* | *No Access* | C, R, U, D | *No Access* |
| **CRM (Contacts, Companies, Emails)** | C, R, U, D | C, R, U, D | *No Access* | *No Access* |
| **Sourcing Engine & AI OCR (Paid)** | C, R, U, D | C, R, U, D | *No Access* | *No Access* |
| **Deals: Tier 1 (Private / Hidden)** | C, R, U, D\* | C, R, U, D\* | *No Access* | *No Access* |
| **Deals: Tier 2 (Shared with Fund)** | C, R, U, D\* | C, R, U, D\* | R | R |
| **Document Vault (Unshared S3 Files)** | C, R, U, D | C, R, U, D | *No Access* | *No Access* |
| **Document Vault (Shared S3 Files)** | C, R, U, D | C, R, U, D | R | R |
| **Performance Metrics (Analytics)** | R | R | R (Aggregated Data) | R (Aggregated Data) |

*\*Note on Deal Deletion (D):* Functional deletion acts as a "Soft Delete" (Archive). Archived Deals become Read-Only but MUST support an "Un-archive" flow to restore full functionality. Furthermore, if a Searcher workspace is completely deleted, the historical data and raw S3 documents associated with Tier 2 (Shared) Deals MUST be retained and remain accessible in a Read-Only state for the backing Investor Fund to ensure GDPR/compliance and historical auditing.

## **3\. Data Model (Entity Relationship Rough Draft)**

This section defines the core database objects, their key attributes, and entity relationships required to support the dual-sided architecture, privacy tiers, and billing requirements.

* **Workspace**  
  * **Key Attributes:** id (UUID), workspace\_type (Enum: Searcher, Investor), name (String), stripe\_customer\_id (String, nullable), subscription\_plan (Enum: Free, Searcher\_Pro, Investor\_Premium), subscription\_status (Enum: Active, Past\_Due, Canceled), created\_at (Timestamp), deleted\_at (Timestamp, for soft deletes).  
  * **Relationships:** \* *has\_many* Users  
    * *has\_many* Deals  
    * *has\_many* Contacts  
    * *has\_many* Companies  
* **User**  
  * **Key Attributes:** id (UUID), workspace\_id (FK), role (Enum: Admin, Analyst), email (String, unique), auth\_provider (Enum: Google, Microsoft, Local), first\_name (String), last\_name (String), linkedin\_url (String), email\_notifications\_enabled (Boolean, default: true).  
  * **Relationships:** \* *belongs\_to* Workspace  
    * *has\_many* Documents (as uploader)  
    * *has\_many* Activities  
* **SponsoredLicense** (Handles Investors granting premium seats to Searchers)  
  * **Key Attributes:** id (UUID), sponsor\_workspace\_id (FK \- Investor), recipient\_workspace\_id (FK \- Searcher), claimed\_at (Timestamp), status (Enum: Pending, Active, Revoked).  
  * **Relationships:** \* *belongs\_to* Workspace (Sponsor)  
    * *belongs\_to* Workspace (Recipient)  
* **Company (Target)**  
  * **Key Attributes:** id (UUID), workspace\_id (FK), name (String), domain (String), hashed\_domain (String, SHA-256 for cross-workspace collision detection without breaking privacy), industry (String), description (Text).  
  * **Relationships:** \* *belongs\_to* Workspace  
    * *has\_many* Deals  
    * *has\_many* Contacts  
* **Contact**  
  * **Key Attributes:** id (UUID), workspace\_id (FK), company\_id (FK, nullable), first\_name (String), last\_name (String), email (String), phone (String).  
  * **Relationships:** \* *belongs\_to* Workspace  
    * *belongs\_to* Company  
    * *has\_many* CommunicationLogs  
* **Deal (The core container for an acquisition target)**  
  * **Key Attributes:** id (UUID), workspace\_id (FK), company\_id (FK), pipeline\_stage (String/Enum), visibility\_tier (Enum: Tier\_1\_Private, Tier\_2\_Shared), status (Enum: Active, Archived, Closed\_Won, Closed\_Lost), created\_at (Timestamp).  
  * **Relationships:** \* *belongs\_to* Workspace  
    * *belongs\_to* Company  
    * *has\_many* Documents  
    * *has\_many* FinancialRecords  
* **Document (Vault Object)**  
  * **Key Attributes:** id (UUID), deal\_id (FK), uploader\_id (FK), file\_name (String), s3\_object\_key (String), mime\_type (String), is\_shared\_with\_investor (Boolean), upload\_batch\_id (String, for debouncing notifications).  
  * **Relationships:** \* *belongs\_to* Deal  
    * *belongs\_to* User (Uploader)  
* **FinancialRecord (Extracted via OCR / AI)**  
  * **Key Attributes:** id (UUID), deal\_id (FK), source\_document\_id (FK, nullable), fiscal\_year (Integer), revenue (Decimal), ebitda (Decimal), gross\_margin (Decimal), is\_verified\_by\_human (Boolean).  
  * **Relationships:** \* *belongs\_to* Deal  
    * *belongs\_to* Document  
* **CommunicationLog (Email Sync & CRM Activity)**  
  * **Key Attributes:** id (UUID), workspace\_id (FK), contact\_id (FK), deal\_id (FK, nullable), type (Enum: Email, Note, Call), direction (Enum: Inbound, Outbound), content (Text), sentiment\_score (Float, AI-generated), external\_message\_id (String, for email threading).  
  * **Relationships:** \* *belongs\_to* Workspace  
    * *belongs\_to* Contact  
    * *belongs\_to* Deal

## **4\. Core Functional Requirements**

### **4.1. Global Identity & Authentication**

1. **User Story:** As a User (Searcher or Investor), I can securely log in via OAuth or email/password so that I can access my designated operating system environment.  
2. **Pre-conditions:** The user is unauthenticated and navigating the application over HTTPS.  
3. **Functional Logic & Flow:**  
   * User navigates to /login.  
   * User selects OAuth (Google/Microsoft) or inputs Email/Password.  
   * If OAuth, system redirects to the Identity Provider (IdP). Upon successful callback, the system extracts the user's email.  
   * System checks if the email exists in the User table.  
   * *If exists:* System generates a session JWT, evaluates the user's role and workspace\_type, and routes them to the correct dashboard.  
   * *If new:* System initiates the Onboarding Flow. User MUST select a role ("Searcher" or "Investor"). **This selection is irreversible.**  
   * User completes the mandatory profile form.  
4. **Inputs & Validation:**  
   * Inputs: Auth Token / Credentials, Role Selection, First Name, Last Name, Entity/Fund Name, LinkedIn URL.  
   * Validation: Email MUST be universally unique. Role selection MUST NOT be null. LinkedIn URL MUST match a valid URL regex.  
5. **Post-conditions:** A Workspace and User record are created. A secure HttpOnly cookie containing the JWT is set. User is redirected to /searcher/dashboard or /investor/dashboard.  
6. **Edge Cases:** IdP timeout (display retry UI). User attempts to change role via API bypassing UI (backend MUST reject if workspace\_id is already assigned).

### **4.2. Billing & Sponsored Licenses**

1. **User Story:** As an Investor Admin, I can purchase a premium subscription and allocate free seats to my portfolio Searchers so that they can access AI and CRM features without paying.  
2. **Pre-conditions:** Investor Admin is logged in. System is integrated with Stripe APIs.  
3. **Functional Logic & Flow:**  
   * Investor Admin navigates to the Billing module.  
   * User clicks "Sponsor a Searcher" and inputs the target Searcher's email.  
   * System queries Stripe to ensure the Investor's payment method is valid and the $499/mo subscription is Active.  
   * System generates a SponsoredLicense record with status Pending.  
   * System dispatches a transactional email with a unique claim link to the Searcher.  
   * When the Searcher clicks the link, their Workspace subscription\_plan is upgraded to Searcher\_Pro.  
4. **Inputs & Validation:**  
   * Inputs: Target Searcher Email.  
   * Validation: Target email MUST be valid. Target Searcher MUST NOT already have an active paid subscription (to prevent double-billing).  
5. **Post-conditions:** SponsoredLicense status changes to Active. Searcher Workspace is granted premium feature access.  
6. **Edge Cases:** Stripe webhook fails (system MUST run a nightly reconciliation cron job). Investor's credit card fails (system MUST revoke or suspend the Searcher's Pro access gracefully after a 3-day grace period).

### **4.3. Deal Creation & Cryptographic Collision Detection**

1. **User Story:** As a Searcher Analyst, I can add a target company to my pipeline so that I can begin tracking outreach and due diligence.  
2. **Pre-conditions:** Searcher Analyst is logged in and has Create permissions for Deals.  
3. **Functional Logic & Flow:**  
   * User clicks "New Deal" and enters the target's website URL and basic company details.  
   * System strips the URL protocol and "www", extracting the root domain (e.g., company.com).  
   * System applies a SHA-256 hash to the root domain.  
   * System checks the database for existing hashes to detect if another Searcher in the network is already targeting this company.  
   * System saves the Company and Deal records.  
4. **Inputs & Validation:**  
   * Inputs: Company Name, Root Domain, Industry, Description.  
   * Validation: Domain MUST be a valid FQDN (Fully Qualified Domain Name).  
5. **Post-conditions:** Database creates Company and Deal. visibility\_tier defaults to Tier\_1\_Private.  
6. **Edge Cases:** If a domain hash collision occurs, the system MUST silently log the collision for internal analytics but MUST NOT alert the Searcher, ensuring strict adherence to NDA and privacy barriers between competing Searchers.

### **4.4. AI Financial OCR & Human-in-the-Loop Validation**

1. **User Story:** As a Searcher Analyst on a Pro plan, I can upload a target's financial PDF so that the system automatically extracts Revenue and EBITDA, saving me manual data entry time.  
2. **Pre-conditions:** Deal is active. User Workspace is on Searcher\_Pro or sponsored.  
3. **Functional Logic & Flow:**  
   * User uploads a PDF/Excel file in the Financials tab of a Deal.  
   * System uploads the file to an isolated S3 bucket and queues an async background job.  
   * Background job sends the document to the AI OCR endpoint.  
   * AI extracts fiscal years, Revenue, Gross Margin, and EBITDA.  
   * System displays a split-screen UI: the original document on the left, and the extracted data inputs on the right.  
   * User reviews the data, makes manual corrections if necessary, and clicks "Verify & Save."  
4. **Inputs & Validation:**  
   * Inputs: PDF/XLSX file.  
   * Validation: File size MUST NOT exceed 20MB.  
5. **Post-conditions:** FinancialRecord entities are created with is\_verified\_by\_human \= true. The Deal's financial summary is updated.  
6. **Edge Cases:** AI fails to parse a low-resolution scan (system MUST fallback to requiring manual entry). File is password protected (system MUST halt OCR and prompt user for password or unprotected file).

### **4.5. Document Vault & Smart Notification Batching**

1. **User Story:** As a Searcher Admin, I can bulk upload Due Diligence files to a shared Deal, so that my Investors are notified without being overwhelmed by email spam.  
2. **Pre-conditions:** Deal visibility\_tier is set to Tier\_2\_Shared.  
3. **Functional Logic & Flow:**  
   * User drag-and-drops 15 documents into the Deal's Vault.  
   * Frontend streams files to S3 via presigned URLs.  
   * Backend creates 15 Document records and flags them as is\_shared\_with\_investor \= true.  
   * System triggers a notification event.  
   * A debounce timer (e.g., 10 minutes) catches the event. If more documents are uploaded within 10 minutes, they are added to the same batch payload.  
   * Once the timer expires, the system dispatches ONE aggregated transactional email to the Investor Admin/Analyst: "The team \[Name\] has uploaded 15 new documents to \[Deal\]."  
4. **Inputs & Validation:**  
   * Inputs: Array of Files.  
   * Validation: Each file MUST pass a background virus scan before becoming downloadable by the Investor.  
5. **Post-conditions:** Files are securely stored in S3. One aggregated email is sent.  
6. **Edge Cases:** Hard Bounce on email delivery. If the email API (e.g., SendGrid) returns a Hard Bounce, the system MUST automatically set email\_notifications\_enabled to false for that Investor user to protect domain sending reputation, falling back to strictly In-App notifications.

## **5\. UI/UX Suggestions (Screen by Screen)**

This section defines the structural requirements for the primary user interfaces across both the Searcher and Investor environments.

### **5.1. Searcher: Main Dashboard (Pipeline)**

* **Screen Name:** Searcher Workspace \- Deal Pipeline  
* **Key Elements:**  
  * Global navigation sidebar (Pipeline, CRM Contacts, Analytics, Settings).  
  * Top header containing a global search bar (searching across Deals, Contacts, and Documents) and a primary "New Deal" CTA.  
  * A Kanban board interface representing customizable pipeline stages (e.g., Sourcing, NDA Signed, IOI, LOI, Due Diligence).  
  * Deal Cards displaying key metrics: Target Name, Industry, Last Contacted Date, and a highly visible badge indicating Privacy Status ("Tier 1: Private" vs "Tier 2: Shared").  
* **Interactions:**  
  * Drag-and-drop functionality to move Deal Cards between pipeline stages.  
  * Clicking a Deal Card MUST route the user to the detailed view of that specific Deal.  
  * Hovering over the "Last Contacted" metric SHOULD display a tooltip of the most recent CRM activity.

### **5.2. Searcher: Deal Detail View**

* **Screen Name:** Deal Container Workspace  
* **Key Elements:**  
  * Sticky header with Deal Name, Status dropdown (Active, Archived, Closed), and a critical toggle switch for "Visibility: Tier 1 (Private) / Tier 2 (Shared)".  
  * Tabbed navigation matrix:  
    * **Overview:** Editable fields for Company Info, Deal Thesis, and custom attributes.  
    * **CRM Activity:** Threaded view of synced emails, logged calls, and notes.  
    * **Financials:** Split-screen layout for the OCR tool (Document viewer on the left, extracted data table on the right).  
    * **Document Vault:** A file manager interface with breadcrumbs, folder structures, and a clear "Shared with Investor" visual indicator column.  
* **Interactions:**  
  * Toggling from Tier 1 to Tier 2 MUST trigger a strict confirmation modal explaining what data will become visible to the backing Investor.  
  * Clicking "Run AI Extraction" in the Financials tab MUST display a loading skeleton while the async job processes, followed by the split-screen validation UI.  
  * Dragging and dropping files into the Document Vault MUST initiate a chunked upload sequence with individual file progress bars.

### **5.3. Investor: Main Dashboard & Searcher Management**

* **Screen Name:** Investor Workspace \- Command Center  
* **Key Elements:**  
  * High-level aggregate metrics widgets (e.g., "Total Active Searchers," "New Shared Deals This Week," "Total Due Diligence Documents Pending Review").  
  * A data table listing all connected Searcher Workspaces (both sponsored and organic).  
  * "Sponsor a Searcher" CTA button.  
* **Interactions:**  
  * Clicking the "Sponsor a Searcher" CTA opens a modal prompting for the Searcher's email to trigger the Stripe billing flow and invitation webhook.  
  * Clicking on a specific Searcher row acts as a global filter, filtering the Investor's Deal Flow view to only show that specific Searcher's Tier 2 targets.

### **5.4. Investor: Shared Deal Flow**

* **Screen Name:** Investor Deal Flow (Tier 2 Sandbox)  
* **Key Elements:**  
  * A read-only Kanban board or highly filterable Data Table (toggleable views).  
  * This view MUST strictly isolate and display ONLY deals where visibility\_tier \= Tier\_2\_Shared.  
  * Visual indicators (unread dots) on Deal Cards where new documents have been uploaded or pipeline stages have changed since the user's last login.  
* **Interactions:**  
  * Clicking a row/card routes the Investor to the Read-Only Deal Detail View.

### **5.5. Investor/Searcher: Deal Detail View (Read-Only Mode)**

* **Screen Name:** Shared Deal Viewer  
* **Key Elements:**  
  * Simplified, un-editable version of the Searcher's Deal Detail View.  
  * Tabs are restricted to Overview, Financials (Verified Data Only), and the Document Vault.  
  * **Crucially Missing:** The CRM Activity tab MUST NOT be rendered to Investors to protect granular communications between the Searcher and the Seller.  
* **Interactions:**  
  * Double-clicking a file in the Document Vault opens an in-app secure document viewer (PDF/XLSX preview) with a download button.

### **5.6. Global: Settings & Billing**

* **Screen Name:** Workspace Configuration  
* **Key Elements:**  
  * Vertical secondary navigation (Profile, Team Management, Integrations, Billing).  
  * **Integrations Tab:** OAuth connect buttons for Google Workspace and Microsoft 365\.  
  * **Billing Tab:** Current plan status, usage metrics (seats utilized vs. available), and a "Manage Subscription" button.  
* **Interactions:**  
  * Clicking "Manage Subscription" MUST redirect the user to the secure Stripe Customer Portal for handling credit card updates, invoices, and plan downgrades.  
  * Modifying team member roles (Admin vs. Analyst) in the Team Management tab MUST instantly invalidate their current JWT and force a permissions refresh.

## **6\. Technical Stack & Integrations**

This section outlines the recommended architectural stack and external third-party integrations required to build Ceeq. The stack is selected to optimize for scalable B2B multi-tenancy, real-time CRM updates, and heavy background processing for OCR and file uploads.

### **6.1. Core Technology Stack**

* **Frontend:**  
  * **Framework:** React.js (Next.js preferred for optimized routing, server-side rendering of static assets, and strict API route management).  
  * **Language:** TypeScript (Strictly typed to ensure data model consistency between the frontend and backend).  
  * **State Management:** React Query (for server state caching, pagination, and optimistic UI updates on the Kanban boards) and Zustand (for local client state).  
  * **Styling:** TailwindCSS combined with a robust component library (e.g., shadcn/ui or MUI) for rapid, accessible administrative UI development.  
* **Backend:**  
  * **Primary API:** Node.js with Express or NestJS (TypeScript). This service MUST handle routing, business logic, CRUD operations, and middleware authentication.  
  * **AI/OCR Microservice (Optional but Recommended):** Python (FastAPI). Given the heavy data-science ecosystem, a decoupled Python service SHOULD handle the PDF parsing, OCR, and AI agent orchestration to prevent blocking the main Node.js event loop.  
* **Database & Caching:**  
  * **Primary Relational Database:** PostgreSQL. The system MUST use a relational database to enforce strict referential integrity between Workspaces, Users, Deals, and Financial Records.  
  * **Queue & Cache:** Redis. MUST be implemented to handle background job queues (e.g., using BullMQ for Node.js or Celery for Python) for asynchronous tasks like document virus scanning, AI OCR processing, and batching notification emails.  
* **Infrastructure & Storage:**  
  * **Document Vault:** AWS S3 (or Google Cloud Storage). All files MUST be stored in private, encrypted buckets. Access MUST strictly be provisioned via short-lived, authenticated Pre-signed URLs.  
  * **Hosting:** AWS (ECS/EKS) or a managed PaaS like Render / Vercel (for frontend) to allow automatic scaling based on load.

### **6.2. External Integrations & APIs**

* **Authentication & Identity:**  
  * **Provider:** Clerk, Auth0, or Supabase Auth.  
  * **Requirement:** The system MUST support OAuth 2.0 strictly for Google Workspace and Microsoft Entra ID (Office 365), alongside standard magic link or password-based authentication.  
* **Billing & Monetization:**  
  * **Provider:** Stripe API & Stripe Billing.  
  * **Requirement:** MUST handle recurring SaaS subscriptions ($29/mo and $499/mo tiers), secure credit card tokenization, and Stripe Customer Portal routing. Webhooks MUST be configured to handle invoice.payment\_succeeded and customer.subscription.deleted events to grant or revoke system access automatically.  
* **Email Sync & CRM Automation:**  
  * **Provider:** Nylas API (Recommended best practice for B2B CRM email sync).  
  * **Requirement:** Rather than building raw IMAP/SMTP and maintaining Google/Microsoft app verification individually, the system SHOULD utilize Nylas to handle the 2-way sync of inbound/outbound emails, thread parsing, and calendar event logging directly into the CRM database.  
* **Transactional Notifications:**  
  * **Provider:** SendGrid, Postmark, or Resend.  
  * **Requirement:** MUST handle all system alerts (e.g., "New Shared Deal", "Document Uploaded"). Webhooks MUST be configured to listen for "Hard Bounces" to automatically disable email\_notifications\_enabled for invalid users.  
* **AI & Document Parsing (OCR):**  
  * **Provider:** OpenAI API (GPT-4o Vision) combined with AWS Textract or Google Cloud DocumentAI.  
  * **Requirement:** AWS Textract/DocumentAI SHOULD perform the raw bounding-box OCR extraction on PDFs. The extracted text payload is then sent to OpenAI via a structured JSON schema prompt to semantically identify "EBITDA", "Gross Margin", and "Revenue" across various disparate financial formats.

## **7\. Open Technical Decisions**

This section outlines the unresolved architectural and implementation decisions that the engineering team MUST finalize prior to sprint planning and active development.

* **Email Sync Integration Strategy (Middleware vs. Native APIs):** \* *Context:* The product requires robust 2-way email sync and calendar tracking for the CRM.  
  * *Decision Needed:* The team MUST decide whether to absorb the high cost of a managed middleware provider like Nylas/Finch (which handles complex threading, OAuth app verification, and deliverability) OR build native integrations directly against the Gmail API and Microsoft Graph API. The latter reduces recurring SaaS costs but significantly increases upfront engineering time and maintenance overhead.  
* **Real-Time Data Updates (WebSockets vs. SSE vs. Polling):**  
  * *Context:* The Kanban pipeline, AI OCR processing status, and Deal Tier toggle require UI state synchronization.  
  * *Decision Needed:* The team SHOULD evaluate if Server-Sent Events (SSE) are sufficient for one-way notifications (e.g., "OCR Complete", "New Shared Document") or if a full WebSocket implementation (e.g., Socket.io, AWS API Gateway WebSockets) is required to support real-time collaborative editing on the pipeline by multiple Searcher Analysts.  
* **Cryptographic Domain Hashing & Salting Strategy:**  
  * *Context:* To prevent duplicate Deal targeting across different Searcher Workspaces without violating NDAs, the system hashes the target's root domain (e.g., SHA-256).  
  * *Decision Needed:* The team MUST define the exact salting mechanism. A global salt allows for cross-workspace collision detection but is theoretically vulnerable to a dictionary attack by a malicious actor trying to reverse-engineer pipeline targets. The team MUST determine the acceptable cryptographic risk threshold.  
* **AI OCR Data Schema & Flexibility (Relational vs. JSONB):**  
  * *Context:* Financial documents vary wildly in structure. The system extracts Revenue, Gross Margin, and EBITDA.  
  * *Decision Needed:* The team MUST decide whether to map these extracted data points to strict relational columns in PostgreSQL or utilize a flexible JSONB column to accommodate future extraction metrics (e.g., CAPEX, working capital, custom add-backs) without requiring constant database migrations.  
* **Data Privacy and PII Redaction in AI Pipelines:**  
  * *Context:* Sending raw Due Diligence PDFs to third-party LLMs (OpenAI) introduces data privacy risks.  
  * *Decision Needed:* The engineering and legal teams MUST define if a zero-retention API agreement with OpenAI is sufficient for Investor compliance, or if an intermediate PII-redaction microservice (e.g., AWS Comprehend Medical/PII) MUST scrub documents before they touch the extraction prompt.

