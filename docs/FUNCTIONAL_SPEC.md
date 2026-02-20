# **Vexel: Functional Spec**

## **1\. Executive Summary**

Vexel is a precision wealth management and structural financial tracking platform engineered specifically for ultra-high-net-worth (UHNW) individuals and family offices. The product's core loop centers around mathematically rigorous, recursive Net Worth calculations that are inherently tied to Cap Table entity ownership, augmented by an AI-powered "Airlock" for automated financial document ingestion and structured data extraction. By enforcing strict data governance states, time-boxed secure guest access, and a highly granular permissions matrix, Vexel provides an immutable "Source of Truth" for complex asset portfolios while guaranteeing data integrity, privacy, and frictionless executive-level financial oversight.

---

## **2\. User Roles & Permissions Matrix**

The following matrix defines the exact CRUD (Create, Read, Update, Delete) permissions for the core user roles within the Vexel platform.

**User Roles Defined:**

* **Admin:** Complete platform control, including structural architecture, user management, and billing.  
* **Principal:** Almost identical to Admin, intended for the primary wealth owner (G1). Can perform all structural and data actions, but cannot delete the entire tenant account, remove Admin access, or alter billing settings.  
* **Controller:** Restricted operational access intended for family office staff or external accountants. Focused strictly on data ingestion (Airlock), task resolution, and viewing the ledger. Cannot create or modify the structural Cap Table, Entities, or manage users.  
* **Guest (Time-Boxed):** Strictly read-only access for external parties (e.g., auditors), limited to the Investment Viewer and Dashboard. Blind to Corporate DNA.

| Feature / Module | Admin | Principal | Controller | Guest |
| :---- | :---- | :---- | :---- | :---- |
| **Authentication & Users** |  |  |  |  |
| Manage Users (Add/Remove) | C, R, U, D | R | None | None |
| Manage Guest Access Links | C, R, U, D | C, R, U, D | None | None |
| **Cap Table & Entities** |  |  |  |  |
| Create/Edit Entities (Trusts, SPVs) | C, R, U, D | C, R, U, D | R | R |
| Modify Cap Table Ownership % | C, R, U, D | C, R, U, D | R | R |
| Create New Assets | C, R, U, D | C, R, U, D | R | R |
| **Airlock & Data Ingestion** |  |  |  |  |
| Upload Documents | C, R, U, D | C, R, U, D | C, R | None |
| Execute AI Parsing | C, R, U | C, R, U | C, R, U | None |
| Human-in-the-Loop Approval | C, R, U | C, R, U | C, R, U | None |
| Legacy CSV Import | C, R | C, R | None | None |
| **Governance & Reporting** |  |  |  |  |
| Resolve Governance Tasks | R, U | R, U | R, U | None |
| View Global Dashboard (Net Worth) | R | R | R | R |
| View "Pending Capital" Widget | R | R | R | None |
| **Document Vault** |  |  |  |  |
| Manage Folders (Create/Rename) | C, R, U, D | C, R, U, D | R | R (If allowed) |
| Manage Folder Permissions (RBAC) | C, R, U, D | C, R, U, D | None | None |
| View Corporate DNA Folders | R, U | R, U | R (If allowed) | None |
| **Tenant Settings** |  |  |  |  |
| Modify Auto-Reconciliation Limit | R, U | R, U | None | None |
| Manage Billing & Subscription | C, R, U, D | R | None | None |
| Delete Tenant Account | D | None | None | None |

---

## **3\. Data Model (Entity Relationship Rough Draft)**

The following defines the core database entities, their key attributes, and relational mappings required to support Vexel's multi-tenant architecture, recursive cap table, and governance state machine.

* **Tenant**  
  * **Key Attributes:** id (UUID, Primary Key), name (String), subscription\_tier (String), billing\_status (Enum: Active, Past\_Due, Read\_Only), overage\_start\_date (Timestamp, Nullable), created\_at (Timestamp).  
  * **Relationships:** *has\_many* Users, *has\_many* Entities, *has\_many* Assets, *has\_many* Documents, *has\_many* GovernanceTasks.  
* **User**  
  * **Key Attributes:** id (UUID, Primary Key), tenant\_id (UUID, Foreign Key), email\_address (String, Unique), password\_hash (String), role\_level (Enum: Admin, Principal, Controller), last\_login\_timestamp (Timestamp), created\_at (Timestamp).  
  * **Relationships:** *belongs\_to* Tenant.  
* **GuestLink**  
  * **Key Attributes:** id (UUID, Primary Key), tenant\_id (UUID, Foreign Key), created\_by\_user\_id (UUID, Foreign Key), secure\_token (String, Unique), expires\_at (Timestamp), last\_accessed\_at (Timestamp), is\_active (Boolean).  
  * **Relationships:** *belongs\_to* Tenant, *belongs\_to* User (Creator).  
* **Entity (Cap Table Node)**  
  * **Key Attributes:** id (UUID, Primary Key), tenant\_id (UUID, Foreign Key), name (String), entity\_type (Enum: Trust, SPV, LLC, Individual), tax\_identification\_number (String, Encrypted), created\_at (Timestamp).  
  * **Relationships:** *belongs\_to* Tenant, *has\_many* Assets, *has\_many* EntityOwnerships (as Parent or Child).  
* **EntityOwnership (Cap Table Edge)**  
  * **Key Attributes:** id (UUID, Primary Key), parent\_entity\_id (UUID, Foreign Key), child\_entity\_id (UUID, Foreign Key), ownership\_percentage (Decimal, Precision 10,2), effective\_date (Date).  
  * **Relationships:** *belongs\_to* Entity (Parent), *belongs\_to* Entity (Child). *(Note: This enables the recursive mathematical calculation of Net Worth).*  
* **Asset**  
  * **Key Attributes:** id (UUID, Primary Key), tenant\_id (UUID, Foreign Key), entity\_id (UUID, Foreign Key), name (String), asset\_class (Enum: Real\_Estate, Private\_Equity, Liquid\_Cash, etc.), current\_valuation (Decimal), currency (String), governance\_state (Enum: Verified, Ghost\_Entry, Discrepancy), ghost\_expiration\_date (Timestamp, Nullable), updated\_at (Timestamp).  
  * **Relationships:** *belongs\_to* Entity, *has\_many* ValuationHistories.  
* **ValuationHistory**  
  * **Key Attributes:** id (UUID, Primary Key), asset\_id (UUID, Foreign Key), recorded\_value (Decimal), source\_document\_id (UUID, Foreign Key, Nullable), recorded\_at (Timestamp).  
  * **Relationships:** *belongs\_to* Asset.  
* **Document (Airlock Vault)**  
  * **Key Attributes:** id (UUID, Primary Key), tenant\_id (UUID, Foreign Key), uploaded\_by\_user\_id (UUID, Foreign Key), file\_name (String), storage\_url (String), mime\_type (String), llm\_processing\_status (Enum: Pending, Parsing, Success, Failed), llm\_consent\_acknowledged (Boolean), created\_at (Timestamp).  
  * **Relationships:** *belongs\_to* Tenant, *belongs\_to* User, *has\_one* GovernanceTask.  
* **GovernanceTask**  
  * **Key Attributes:** id (UUID, Primary Key), tenant\_id (UUID, Foreign Key), task\_type (Enum: Airlock\_Approval, Reconciliation\_Discrepancy, Missing\_Data), status (Enum: Open, Resolved), related\_document\_id (UUID, Foreign Key, Nullable), related\_asset\_id (UUID, Foreign Key, Nullable), extracted\_json\_payload (JSONB, Nullable), created\_at (Timestamp).  
  * **Relationships:** *belongs\_to* Tenant, *belongs\_to* Document (optional), *belongs\_to* Asset (optional).

---

## **4\. Core Functional Requirements**

This section details the explicit technical logic, validation rules, and database interactions for Vexel's core features.

### **4.1. Authentication & Session Management**

1. **User Story:** As an internal user (Admin, Principal, Controller), I can securely log in so that I can access the platform and my session is protected from unauthorized access.  
2. **Pre-conditions:** The user's email\_address must exist in the PostgreSQL database.  
3. **Functional Logic & Flow:**  
   * The user navigates to the login screen and inputs their email\_address and password.  
   * The system queries the PostgreSQL database to verify the email\_address.  
   * The system cryptographically hashes the provided password and compares it against the stored hash.  
   * Upon success, the system generates a standard JWT (JSON Web Token) containing the user\_id, tenant\_id, and role\_level.  
   * The system injects this JWT into an HTTP-only, secure cookie attached to the browser session.  
   * The system updates the last\_login\_timestamp in the database.  
   * The system redirects the user to the Global Dashboard (/dashboard).  
4. **Inputs & Validation:**  
   * **Password Complexity:** Minimum 12 characters, requiring at least one uppercase letter, one number, and one special character (enforced at creation).  
   * **Session Lifespan:** The JWT has a hard absolute expiration of exactly 24 hours.  
   * **Idle Timeout:** The front-end client tracks user interactions (mouse movement, keystrokes). If no interaction occurs for exactly 30 minutes, the client automatically executes a POST /logout request, invalidating the session and redirecting to the login screen.  
   * **Rate Limiting:** If an IP address or email\_address fails authentication 5 consecutive times within a 5-minute window, the system strictly locks out further attempts for exactly 15 minutes.  
5. **Post-conditions:** A valid, secure JWT session cookie is established, and the last\_login\_timestamp is updated.  
6. **Edge Cases:**  
   * **Invalid Credentials:** The system must return a generic 401 Unauthorized with the exact string "Invalid email or password", never revealing which specific element was incorrect.  
   * **Locked Account:** Attempting to log in during a 15-minute rate-limit lockout returns a 429 Too Many Requests error and displays: "Account temporarily locked due to multiple failed attempts. Please try again in \[X\] minutes".  
   * **Expired Session Action:** If a user executes a POST or PUT request with an expired JWT, the system intercepts the request, blocks the action, redirects to login, and displays: "Your session has expired. Please log in again to continue".

### **4.2. Secure Guest Access Engine**

1. **User Story:** As a Principal, I can generate a time-boxed, secure URL so that external auditors or advisors can view the platform strictly read-only without creating an account.  
2. **Pre-conditions:** The user must have Principal or Admin permissions.  
3. **Functional Logic & Flow:**  
   * The user navigates to Settings \> Guest Access and clicks "Generate New Guest Link".  
   * The system prompts for a Guest Name and a Duration (1 to 30 days).  
   * The system generates a cryptographically secure, random 32-character token.  
   * The system stores the token in the guest\_tokens database table along with the tenant\_id, created\_by, and an exact expires\_at timestamp.  
   * The system presents a unique URL (e.g., vexel.app/guest/view?token=abc123...).  
   * When the Guest clicks the URL, the system validates the token and grants access to a restricted, read-only view.  
4. **Inputs & Validation:**  
   * **Duration:** Default is exactly 7 days. The absolute maximum is 30 days.  
   * **Access Constraints:** Strictly Read-Only (GET). Guests cannot upload to the Airlock, modify values, or resolve tasks.  
   * **Data Boundaries:** Guest sessions are automatically blind to any Document Vault folders tagged as "Corporate DNA". They can only view the "Investment Viewer" and the Global Dashboard.  
5. **Post-conditions:** A secure token is active in the database. The Principal can view and manually revoke it via the "Guest Access" dashboard.  
6. **Edge Cases:**  
   * **Expired Token:** Navigating to an expired link returns a 403 Forbidden page: "This secure access link has expired. Please contact the asset owner for a new link".  
   * **Revoked Mid-Session:** If a Principal revokes a token while a Guest is actively browsing, the very next API request returns a 401 Unauthorized and redirects them to the "Link Expired" screen.

### **4.3. Net Worth Calculation Algorithm**

1. **User Story:** As a Principal or G2 user, I can view my mathematically accurate Net Worth on the dashboard so that I have a true, structurally accurate understanding of my wealth.  
2. **Pre-conditions:** The user must be logged in and the cap\_table must be populated.  
3. **Functional Logic & Flow:**  
   * The system identifies the user\_id and the tenant's base currency.  
   * The system queries the cap\_table database for every entity or asset where the user's ownership\_percentage is \> 0%.  
   * The system executes a recursive mathematical roll-up from the bottom (Asset Level) to the top (User Level).  
   * The formula applied is: (Asset Current Valuation \- Parent Level Liabilities) \* Effective Ownership Percentage.  
   * Foreign currencies are converted to the base currency using the latest cached FX rate.  
   * The system sums the final values and renders the integer as "Total Net Worth".  
4. **Inputs & Validation:**  
   * **Recursive Depth Cap:** The mathematical roll-up is hard-capped at exactly 3 levels deep (e.g., Trust \-\> Holding Co \-\> Asset). 4th level data is excluded.  
   * **Data Exclusion:** Any data tagged as a "Ghost Entry" (Pending, 1-59 days old) is strictly excluded. The algorithm only calculates "Green" (verified) data.  
   * **Liability Subtraction:** Liabilities are calculated at the Parent Entity level.  
5. **Post-conditions:** The UI renders an accurate sum on the Global Dashboard.  
6. **Edge Cases:**  
   * **Missing Valuation:** If an asset lacks a current valuation, it defaults to the last known purchase\_price or initial\_valuation. If neither exists, it calculates as $0.00 and flags the asset "Yellow".  
   * **Circular Ownership:** If a circular ownership reference is detected, the query terminates instantly, logs a system error, and displays an "Ownership Structure Error" banner, preventing the calculation.

### **4.4. The Airlock: AI Parsing & OCR Pipeline**

1. **User Story:** As a Controller, I can upload financial documents so that the system can automatically extract the structured data without manual entry.  
2. **Pre-conditions:** A document must be uploaded to the airlock\_documents table with status \= uploaded.  
3. **Functional Logic & Flow:**  
   * The system checks the document (e.g., PDF) for a native text layer.  
   * If no text layer exists, it routes through an OCR microservice to generate raw text.  
   * The system packages the text into a strict prompt with a required JSON schema (Document\_Type, Transaction\_Date, Asset\_Name, Opening\_Balance, Inflows, Outflows, Closing\_Balance).  
   * The prompt is sent to the LLM API (e.g., GPT-4o or Claude 3.5 Sonnet).  
   * The system parses the returned JSON, updates the database row, sanitizes numbers to floats, and changes the status to pending\_human\_review.  
4. **Inputs & Validation:**  
   * **File Limits:** Max 25MB per file, max 50 files per batch. Strictly limited to .pdf, .docx, and .xlsx.  
   * **Schema Enforcement:** The LLM response must strictly adhere to the requested JSON structure. Extraneous text is stripped.  
   * **Timeout:** The LLM request has a hard timeout of 60 seconds. It retries exactly once if failed.  
5. **Post-conditions:** The document is queued in the Human-in-the-Loop Validation Interface.  
6. **Edge Cases:**  
   * **Unreadable Scans:** If OCR fails or the LLM returns invalid JSON, the system flags the document Red and routes it for 100% manual data entry.  
   * **Hallucinations:** If the LLM extracts an Asset\_Name that does not match any entity in the Cap Table, that specific field is flagged Yellow for the human reviewer.

### **4.5. The Airlock: Human-in-the-Loop Validation Interface**

1. **User Story:** As a Controller or Admin, I can review AI-extracted data against the original document so that I can correct errors and ensure 100% accuracy before the data enters the ledger.  
2. **Pre-conditions:** A document must be in the Airlock queue with status \= pending\_human\_review.  
3. **Functional Logic & Flow:**  
   * The user clicks a pending document card.  
   * The system renders a split-screen view: an interactive document viewer on the left, and a form populated with extracted JSON data on the right.  
   * The user visually compares the data, makes necessary corrections (e.g., changing a number or selecting the correct Parent Entity), and clicks the distinct Green "Approve & Lock" button.  
   * The system updates the database, changes the status to verified, and fires an event to generate a Ledger Card.  
4. **Inputs & Validation:**  
   * **No Bypass Policy:** Data absolutely cannot move to the ledger without a human click on "Approve & Lock". Automated bypass is strictly forbidden.  
   * **Mandatory Fields:** The "Approve & Lock" button remains disabled until all mandatory fields (Date, Asset Association, Net Amount) contain valid inputs.  
   * **Missing Data Checkpoint:** If the Document\_Type is "Financial Statement", the system verifies the presence of numeric values in Opening\_Balance and Closing\_Balance. If null/empty, approval is blocked. (0.00 is valid) .  
5. **Post-conditions:** An immutable audit log records the user\_id and timestamp of the approval. The data enters the ledger.  
6. \+1  
7. **Edge Cases:**  
   * **Concurrent Editing:** If two users open the same document, pessimistic locking is applied. The second user sees "Document currently locked for review by \[Admin A\]" and their form is strictly read-only.  
   * **Total Rejection:** If the document is irrelevant, the user clicks "Reject Document". The system deletes the extracted payload and moves the document to an archive state.

### **4.6. Governance & Task Management (The State Machine)**

1. **User Story:** As a Principal, I can instantly see the health of my data via a Traffic Light system so that I know what requires attention and what is accurate.  
2. **Pre-conditions:** The system must evaluate underlying data parameters during any GET query for an Asset or Dashboard.  
3. **Functional Logic & Flow:**  
   * **Condition Green (Verified):** The asset has a valid valuation, 100% cap table assignment, and all current period transactions are human-verified.  
   * **Condition Yellow (Warning):** The asset has missing non-critical data (e.g., 80% cap table mapping, missing jurisdiction).  
   * **Condition Red (Critical):** The asset has a systemic error (e.g., a 60-day expired Ghost Entry, outflows exceeding opening balance, or a rejected Airlock document).  
   * The system maps the status to the Asset Card. If an asset is Yellow or Red, that status bubbles up to its Parent Entity.  
4. **Inputs & Validation:**  
   * **Real-Time Execution:** Statuses are dynamically calculated on the fly, not statically stored in the database.  
   * **Primacy of Red:** A Red condition strictly overrides and masks any concurrent Yellow conditions.  
5. **Post-conditions:** The UI renders the accurate color indicator.  
6. **Edge Cases:**  
   * **Resolution Transition:** Fixing the underlying issue instantly updates the next render cycle to Green without a page refresh.  
   * **60-Day Ghost Expiration:** A daily cron job at 00:00 UTC converts any pending entry older than 60 days into a Red Governance Task, removing its value from the "Pending Capital" widget and notifying Admins.

---

## **5\. UI/UX Suggestions (Screen by Screen)**

This section defines the critical screens required for the Vexel platform. The UI MUST prioritize high data density, clear typography for financial figures, and strict visual indicators for data governance states.

### **5.1. Global Dashboard (Net Worth & Health)**

* **Key Elements:**  
  * **Hero Metric:** "Total Net Worth" displayed in large, prominent typography, utilizing the base currency.  
  * **"Pending Capital" Widget:** A secondary, visually distinct metric showing the sum of all "Ghost Entries" (unverified capital) less than 60 days old.  
  * **Top-Level Entities Table:** A data table listing root entities (e.g., Primary Trust, Holding Co) with their rolled-up valuations.  
  * **Governance Health Bar:** A summarized count of current Red, Yellow, and Green assets/tasks.  
* **Interactions:**  
  * Clicking a root entity row MUST route the user to the specific Entity Detail view.  
  * Hovering over the "Pending Capital" widget SHOULD display a tooltip explaining that these funds are excluded from the main Net Worth calculation until verified.

### **5.2. Cap Table & Entity Manager**

* **Key Elements:**  
  * **Hierarchical Tree or Node Graph:** A visual representation of the parent-child relationships between Trusts, SPVs, and individual Owners.  
  * **Ownership Editor:** A slide-out panel or modal displaying the exact percentage breakdowns of shareholders for a selected entity.  
  * **"Add Node" Controls:** Buttons to create new Entities or attach new Assets to a selected node.  
* **Interactions:**  
  * Clicking a structural edge (the line between nodes) MUST open the Ownership Editor to adjust the mathematical percentage and effective date.  
  * The system MUST auto-calculate and warn the user if the sum of child ownership percentages exceeds 100%.

### **5.3. The Airlock: Validation Interface**

* **Key Elements:**  
  * **Split-Screen Layout:** \* *Left Pane:* High-fidelity document viewer (PDF, Word, Excel) with zoom and scroll capabilities.  
    * *Right Pane:* The AI-extracted data form, featuring input fields for Document Type, Date, Asset Association, and Financial Values.  
  * **Validation Highlighting:** Extracted fields SHOULD highlight in Yellow if confidence is low or if an Asset mismatch is suspected.  
  * **Action Footer:** A sticky footer containing a prominent Green "Approve & Lock" button and a Red "Reject Document" button.  
* **Interactions:**  
  * The "Approve & Lock" button MUST remain disabled until all required form fields are populated and pass basic validation rules (e.g., matching data types).  
  * Submitting the form MUST immediately load the next pending document in the queue without a full page refresh.

### **5.4. Document Vault**

* **Key Elements:**  
  * **Directory Tree View:** A collapsible sidebar showing folder hierarchy.  
  * **Data Table:** Main area displaying files, upload dates, uploader name, and current LLM processing status (Pending, Success, Failed).  
  * **"Corporate DNA" Badges:** Distinct visual tags on folders or files containing structural/sensitive data, indicating they are shielded from Guest users.  
* **Interactions:**  
  * Users MUST be able to drag-and-drop multiple files directly into the main table area to trigger bulk uploads.  
  * Right-clicking a folder MUST reveal a contextual menu to "Manage Permissions" (Admin/Principal only).

### **5.5. Governance & Task Center**

* **Key Elements:**  
  * **Unified Inbox List:** A strictly ordered list of action items, sorted by severity (Red critical errors first, then Yellow warnings, then Airlock approvals).  
  * **Contextual Snippets:** Each list item MUST show a brief explanation of the error (e.g., "Outflows exceed opening balance on Asset X" or "Ghost Entry expired (61 days)").  
* **Interactions:**  
  * Clicking a task MUST dynamically route the user to the exact modal, document, or asset required to resolve the discrepancy.  
  * Once a task's underlying data condition is satisfied, the task MUST automatically disappear from the list.

---

## **6\. Technical Stack & Integrations**

Based on the stringent requirements for mathematical precision, recursive data querying, AI ingestion, and data security, the following technical stack and external integrations MUST be utilized.

### **6.1. Suggested Core Tech Stack**

* **Frontend (Client Application):**  
  * **Framework:** React.js or Next.js (Strictly TypeScript).  
  * **State Management:** Redux Toolkit or Zustand for handling complex, deeply nested local states (e.g., the Cap Table ownership tree).  
  * **Styling:** Tailwind CSS or a robust component library (e.g., MUI, Radix UI) tailored for high-density data tables and financial dashboards.  
* **Backend (API & Business Logic):**  
  * **Framework:** Node.js (NestJS/Express with TypeScript) OR Python (FastAPI/Django). Python is highly recommended due to its native affinity for complex mathematical processing and AI/LLM data pipelines.  
  * **Architecture:** RESTful API or GraphQL. GraphQL SHOULD be considered for efficiently querying the heavily relational, multi-level Cap Table data.  
  * **Background Processing:** Celery (Python) or BullMQ (Node) for handling asynchronous, long-running tasks like OCR and LLM parsing.  
* **Database & Storage:**  
  * **Primary Relational Database:** PostgreSQL. MUST be used for all structural data (Users, Tenants, Entities, Assets, Transactions) due to its ACID compliance and support for recursive CTEs (Common Table Expressions) necessary for the Net Worth roll-up.  
  * **Caching & Queues:** Redis. Used for rate-limiting, temporary JWT blocklists, and background job queuing.  
  * **Document Vault (Blob Storage):** AWS S3, Google Cloud Storage, or Azure Blob Storage. All files MUST be encrypted at rest (AES-256).  
* **Infrastructure & DevOps:**  
  * **Hosting:** AWS, GCP, or Azure.  
  * **Containerization:** Docker & Kubernetes (EKS/GKE) for scalable microservices (especially the Airlock worker nodes).

### **6.2. Required External Integrations (APIs)**

* **AI & Large Language Models (LLM):**  
  * **OpenAI API (GPT-4o) or Anthropic API (Claude 3.5 Sonnet):** REQUIRED for the Airlock's intelligent structured data extraction from parsed document text.  
* **Optical Character Recognition (OCR):**  
  * **AWS Textract or Google Cloud Vision API:** REQUIRED as a pre-processing step to extract raw text layers from flattened PDFs or image-based financial statements before LLM ingestion.  
* **Billing & Subscription Management:**  
  * **Stripe API:** REQUIRED for tenant subscription billing, capturing overages (e.g., asset count limits), and handling automated webhooks for account locking/unlocking during grace periods.  
* **Currency Conversion (FX Rates):**  
  * **Open Exchange Rates, Fixer.io, or similar:** REQUIRED to fetch daily FX rates to normalize foreign asset valuations into the tenant's base currency for the Global Net Worth calculation.  
* **Transactional Email Service:**  
  * **SendGrid, Postmark, or AWS SES:** REQUIRED for dispatching system notifications, time-boxed Guest Access link invitations, and daily aggregated Ghost Entry/Governance reports.

---

## **7\. Open Technical Decisions**

This section outlines the critical architectural and infrastructural decisions that the engineering leadership MUST resolve before or during the initial sprint planning.

* **1\. Cap Table Query Optimization (Relational CTEs vs. Graph Database):**  
  * *Context:* The Net Worth calculation relies on a recursive, mathematical roll-up of entity ownership. While PostgreSQL with Recursive Common Table Expressions (CTEs) is the recommended baseline, deeply nested ownership structures with high transaction volumes COULD cause significant query latency.  
  * *Decision Needed:* The team MUST benchmark PostgreSQL recursive performance at a simulated depth of 10+ levels. If latency exceeds 500ms for a dashboard render, the team MUST decide whether to implement a materialized view caching strategy or migrate the Cap Table relationships to a dedicated Graph Database (e.g., Neo4j).  
* **2\. Real-Time Governance vs. Event-Driven State Caching:**  
  * *Context:* The current specification dictates that the Governance State Machine (Traffic Lights: Green, Yellow, Red) calculates dynamically on the fly during a GET request to ensure absolute real-time accuracy.  
  * *Decision Needed:* Computing millions of rows to determine if any single asset is "Red" (e.g., a 61-day-old Ghost Entry) on every dashboard load is computationally expensive. The engineering team MUST decide if they will stick to "Compute-on-Read" or shift to an "Event-Driven Compute-on-Write" architecture where states are pre-calculated via background workers (e.g., Celery) and cached in Redis.  
* **3\. LLM API Enterprise Data Privacy Standards:**  
  * *Context:* As per business requirements, V1 will not utilize a proprietary PII redaction layer before sending financial documents to external LLMs (OpenAI/Anthropic), opting instead for a user consent warning.  
  * *Decision Needed:* The team MUST decide which specific API tier to utilize to guarantee zero-data retention. They MUST ensure the chosen LLM provider SLA explicitly states that API payload data is strictly excluded from future model training and is dropped immediately after processing.  
* **4\. Cold Storage & Read-Only Tenant Offboarding:**  
  * *Context:* When a tenant cancels their subscription, their account MUST transition to a Read-Only "Cold Storage" state rather than being hard-deleted.  
  * *Decision Needed:* The team MUST define the exact mechanism for this freeze. Will this be handled at the application layer (intercepting and blocking all POST/PUT/DELETE requests based on billing\_status), or at the database layer (revoking write permissions for that specific tenant's schema/roles)?  
* **5\. Document Vault Encryption Key Management:**  
  * *Context:* All financial PDFs and documents stored in the Airlock vault MUST be encrypted at rest (AES-256).  
  * *Decision Needed:* The team MUST decide between using standard Cloud Provider Managed Keys (e.g., AWS SSE-S3) or implementing Customer Managed Keys (CMK) via AWS KMS, which would allow tenants to cryptographically shred their own data by destroying their specific key.

---

**\[End of Functional Specification Document\]**

