# **Product Requirements Document**

## **Search Fund CRM — v1.0**

**Status:** Draft  
**Last updated:** March 2026  
**Audience:** Product, Engineering, Design

---

## **1\. Overview**

### **1.1 Product Vision**

A purpose-built CRM for Search Fund entrepreneurs ("searchers") that standardizes and accelerates the acquisition target evaluation process — from initial sourcing through deal analysis. The product is designed to be commercialized as a multi-tenant SaaS platform serving multiple funds globally, not as an internal tool for a single organization.

### **1.2 The Problem**

Searchers manage hundreds to thousands of potential acquisition targets simultaneously across multiple sourcing channels (government databases, brokers, networks). Today this process is largely managed in spreadsheets, which creates three core problems:

- **No structure:** each searcher reinvents their own process, leading to inconsistency and missed follow-ups  
- **No pipeline visibility:** it is difficult to see at a glance where deals stand and what needs attention  
- **No institutional knowledge:** notes, calls, and analyses are scattered across documents and inboxes with no single source of truth

### **1.3 The Solution**

A CRM with three interconnected modules:

1. **Company Repository** — a searchable, filterable database of all potential targets, fed via CSV import from any source  
2. **Deal Pipeline** — a structured workflow for companies that have entered active evaluation, with standardized stages aligned to best-practice Search Fund methodology  
3. **Updates Log** — a chronological record of all interactions, analyses, and notes associated with each deal

### **1.4 Target Users (v1)**

- **Searchers** — the fund principal(s); full access including configuration  
- **Analysts** — operational access; can work deals and log updates but cannot change account settings

**Future role (v2):** Investor — read-only access to selected deals and pipeline. The permission architecture in v1 must be designed to accommodate this role without requiring structural changes.

### **1.5 Scope of This Document**

This document covers **v1 only**. Features explicitly deferred to v2 or later are noted as such throughout.

---

## **2\. Core Principles**

These principles should guide all product and engineering decisions where requirements are ambiguous:

**Opinionated core, controlled flexibility.** The product comes with a built-in best-practice process for Search Funds. Customization is available within defined boundaries — not unlimited configuration. This makes onboarding fast and the product defensible.

**Manual first, automate later.** Where there is a choice between automation and manual control in v1, prefer manual. Searchers are small teams managing high-stakes decisions; they need to feel in control. Automation layers can be added in v2 once real usage patterns are understood.

**Universal data model.** The product must work for searchers in any country using any data source. No field, label, or workflow should assume a specific national database (e.g. Chile's SII) as the only possible input.

**Investor-ready from day one.** Even though investors cannot access the system in v1, every architectural decision — standardized stages, consistent field naming, permission model — should be made with the future investor view in mind.

---

## **3\. Multi-Tenancy & Account Model**

Each Search Fund operates as an independent **tenant** (account) with fully isolated data. There is no data sharing between tenants unless explicitly designed for a future feature (e.g. deal sharing with investors).

Within a tenant, users belong to one of two roles:

| Role | Permissions |
| :---- | :---- |
| **Searcher** | Full access: configure account, manage users, import data, create/edit/delete all records |
| **Analyst** | Operational access: view all records, create and edit companies, deals, and updates; cannot access account settings or manage users |

The permission system must be implemented as a role-based access control (RBAC) model that supports adding new roles (e.g. Investor) in the future without schema changes.

**Seat limits:** The number of users per tenant is capped by plan. The tenant data model must include a `max_seats` field to enforce this. Specific plan tiers and seat counts are a commercial decision outside the scope of this document, but the architecture must support per-tenant limits from day one.

---

## **4\. Module 1 — Company Repository**

### **4.1 Purpose**

The Repository is the master database of all companies a fund has identified as potential acquisition targets. It is the top of the funnel — companies live here before they become active deals. A fund may have tens of thousands of companies in the repository at any time.

### **4.2 Data Model**

Each company record contains two types of fields:

**Fixed fields (universal across all tenants)**

| Field | Type | Notes |
| :---- | :---- | :---- |
| Company Name | Text | Required |
| Tax ID | Text | Deduplication key — unique within Country (Tax ID \+ Country \= composite unique key) |
| Country | Select | Required |
| Region / State | Text |  |
| City | Text |  |
| Sector / Industry | Text |  |
| Estimated Revenue Range | Select | Configurable options per tenant |
| Number of Employees | Number |  |
| Year Founded | Number |  |
| Company Website | URL |  |
| Status | Select | See 4.4 |
| Star Rating | Number (0–5) | Computed from Screening; editable manually |
| Source Tags | Multi-select | See 4.3 |
| Assigned To | User | Defaults to creator |
| Created At | Date | Auto |
| Last Modified At | Date | Auto |

**Custom fields**

Each tenant can define additional fields of the following types: text, number, date, select (single), multi-select, URL, boolean. Custom fields are visible to all users within the tenant and appear after the fixed fields in the company record.

Custom fields are subject to a **hard limit of 50 per record type** (i.e. 50 for Company records and 50 for Deal records). This limit is set high enough that no fund with reasonable usage will reach it in practice. The UI surfaces a warning at 40 fields. Once the limit is reached, the system prevents creation of additional fields and displays a clear error message. Existing data is never affected by the limit.

### **4.3 Tagging System**

Companies can be tagged with one or more **source tags** to track their origin. Tags are free-form and tenant-defined. Examples: `SII-2024`, `Brokers-Q1`, `Network-José`, `Trade-Fair-May`.

Tags serve as the primary way to organize imports from different sources within the single unified repository. A company can carry multiple tags (e.g. it appeared in both the SII database and was independently referred by a broker).

Tags are usable as filters throughout the repository view.

### **4.4 Company Status**

Each company in the repository has one of the following statuses:

| Status | Description |
| :---- | :---- |
| **Unreviewed** | Default on import; not yet assessed |
| **Screening** | Currently going through the screening questionnaire |
| **Candidate** | Passed screening (Go outcome); in outreach queue |
| **Caution** | Passed screening with warnings; requires team review |
| **Discarded** | Failed screening (No-Go) or manually rejected |
| **Nurturing** | No response after full outreach sequence; passive monitoring |
| **Converted to Deal** | Graduated to the Deal Pipeline. This status is **permanent** — it is never automatically reversed, even if the associated deal is closed or lost. This prevents the company from re-entering outreach flows accidentally. To re-engage the company, a new Deal must be opened manually. |

Status transitions are manual in v1. The system may surface suggested transitions as contextual prompts (e.g. "This company has passed all killer questions — mark as Candidate?") but never changes status automatically without user confirmation.

### **4.5 Screening Questionnaire**

**One active questionnaire per tenant.** Each tenant has a single active screening questionnaire at any given time. This keeps the process consistent and the data comparable across companies.

**Quick Filters.** To handle cases where a specific data source contains a field that can rapidly disqualify large numbers of companies (e.g. a revenue column that immediately rules out out-of-range companies), tenants can define **Quick Filters** separately from the full questionnaire. A Quick Filter is a simple rule (e.g. "if Estimated Revenue Range \= 'Micro', set status to Discarded") that can be applied in bulk to the repository — either automatically on import or manually triggered by the user from the repository view. Quick Filters are not part of the formal screening record; they are a pre-screening efficiency tool. The full questionnaire remains the authoritative screening record for any company that advances.

**Questionnaire template library:**

The product ships with a library of pre-built questionnaire templates to accelerate onboarding. Templates are geography- and source-agnostic where possible, but specific templates may be tailored to common data sources. Initial templates at launch:

| Template | Description |
| :---- | :---- |
| **Search Fund Standard** | A 10-question template based on best-practice Search Fund screening methodology, covering business type, revenue range, track record, geography, sector dynamics, and owner profile |
| **Chile — SII Database** | Adapted for imports from the SII Nómina de Personas Jurídicas; killer questions and star rating logic aligned to SII field conventions (tramos de ventas, región, fecha inicio actividad) |
| **Spain — Registro Mercantil** | Adapted for Spanish company registry data; fields and thresholds calibrated for the Spanish SME market |

When creating a new questionnaire, tenants can start from a template (which they can then edit freely) or build from scratch. Templates are read-only originals; editing a template creates a tenant-specific copy. The template library will expand over time based on customer demand.

**Question types available:**

- Yes / No (with option to mark as "Killer question" — a disqualifying No triggers a Discarded suggestion)  
- Select (single)  
- Number  
- Text (short answer)

**Star rating logic:**

Tenants can configure which question answers award stars (0–5 total). The star rating is computed automatically based on questionnaire responses and displayed on the company card and in the repository table. Users can manually override the computed rating.

**Outcome logic:**

The system displays a suggested outcome (Go / Caution / No-Go) based on killer questions and configurable warning thresholds. The user must confirm or override the outcome. The confirmed outcome, rationale (free text), and timestamp are saved to the company record.

### **4.6 CSV Import**

#### **4.6.1 Import Flow**

1. User uploads a CSV or Excel file  
2. System displays a **column mapping interface**: each column in the file is shown alongside a dropdown to map it to a fixed field, a custom field, or "ignore"  
3. System auto-suggests mappings based on column header name matching (fuzzy match against fixed field names and aliases)  
4. User reviews and confirms or adjusts all mappings before proceeding  
5. System validates the data and displays a **preview summary**: total rows, detected duplicates, rows with missing required fields  
6. User confirms the import  
7. System processes the import and displays a completion report: rows imported, rows skipped (with reasons), duplicates handled

#### **4.6.2 Duplicate Detection**

On import, the system checks each incoming row against existing company records using **Tax ID \+ Country as the composite unique key**. This correctly handles funds operating across multiple countries where the same Tax ID number may exist in different national registries. If a match is found:

- The system flags the row as a duplicate in the preview  
- The user can choose (per import batch) one of three strategies: Skip duplicates, Update existing records with new data, or Import as new record (not recommended — the UI should discourage this)

Company Website is available as a reference field on the company record but is **not used as a deduplication key** in v1 due to reliability issues (many companies lack a website, or share a domain with a parent group).

Name-based fuzzy duplicate detection is explicitly **out of scope for v1**.

#### **4.6.3 Source Tagging on Import**

During the import flow, the user assigns one or more source tags to the entire batch. These tags are applied to all imported records. Records that already exist and are being updated retain their existing tags; the new tag is added.

#### **4.6.4 Supported Formats**

CSV (comma and semicolon delimited) and Excel (.xlsx). Maximum file size: 50MB. Maximum rows per import: 500,000.

### **4.7 Repository View**

The default view of the repository is a **table** with the following capabilities:

- Sortable columns (click header to sort ascending/descending)  
- Configurable column visibility (user can show/hide fields)  
- Inline editing for select fields (status, assigned to, star rating) without opening the full record  
- Persistent filter state per user session

**Filters available:**

| Filter | Type |
| :---- | :---- |
| Star Rating | Range slider or multi-select (0★ to 5★) |
| Assigned To | Multi-select (users in tenant) |
| Source Tags | Multi-select |
| Status | Multi-select |
| Country | Multi-select |
| Sector | Multi-select (text search) |

Additional filters using custom fields can be added by the Searcher in account settings.

### **4.8 Export**

The full repository (or current filtered view) can be exported to CSV at any time. The export includes all fixed fields and custom fields. Export is available to both Searchers and Analysts.

---

## **5\. Module 2 — Deal Pipeline**

### **5.1 Purpose**

When a company in the repository warrants active evaluation, it is "graduated" to a Deal. A Deal is a separate record linked to the company, allowing deeper analysis fields and a structured pipeline workflow without cluttering the repository.

One company can have more than one Deal (e.g. a previous approach that was closed, and a new one opened later). This is by design.

### **5.2 Graduating a Company to a Deal**

Any company with status Candidate or Caution can be manually graduated to a Deal by a Searcher or Analyst. The action creates a new Deal record pre-populated with data inherited from the company record. The company's status in the repository updates to "Converted to Deal".

The company record remains intact and accessible from the repository. The Deal record links back to it.

### **5.3 Pipeline Stages**

Deal stages are **fixed and standardized across all tenants**. This is a deliberate product decision to ensure coherence across funds, particularly in anticipation of future investor-facing views.

| Stage | Description |
| :---- | :---- |
| **Screening** | Initial filter completed; company qualifies for outreach |
| **Outreach** | Active contact attempts underway |
| **Initial Meeting** | First meeting scheduled or completed with owner/management |
| **Preliminary Analysis** | General analysis, market study, preliminary valuation underway |
| **Detailed Analysis** | Deep analysis, financial model, LOI preparation |
| **LOI Submitted** | Letter of Intent sent to seller |
| **Due Diligence** | Formal due diligence process active |
| **Closed — Won** | Acquisition completed |
| **Closed — Lost** | Deal withdrawn, rejected, or failed |
| **On Hold** | Paused; may be reactivated |

Stage transitions are **manual in v1**. Users move deals between stages by selecting the new stage from the deal record. No automated transitions occur.

**Reopening closed deals:** A deal in Closed — Lost, Closed — Won, or On Hold can be reopened (moved back to an active stage) by a Searcher or Analyst with explicit confirmation. On reopen, the system automatically creates an Update of type "Decision" recording the date, the user who reopened it, and a mandatory free-text reason. This provides trazability without requiring a full audit log.

### **5.4 Deal Data Model**

**Fixed fields:**

| Field | Type | Notes |
| :---- | :---- | :---- |
| Deal Name | Text | Auto-populated from company name; editable |
| Linked Company | Relation | Link to repository record |
| Stage | Select | See 5.3 |
| Star Rating | Number (0–5) | Inherited from company screening; editable |
| Source | Select | Broker, Network, Database, Inbound, Other |
| Assigned To | User |  |
| Last Contact Date | Date | Manually updated |
| Next Action | Text | Short description of next step |
| Next Action Date | Date | Used to generate follow-up tasks |
| Close Reason | Text | Required when moving to Closed — Lost or On Hold |
| Created At | Date | Auto |
| Last Modified At | Date | Auto |

**Custom fields:** same capability as the repository — tenants can add custom fields to the Deal record for fund-specific analysis fields (e.g. Preliminary EV Range, EBITDA Estimate, Key Risks).

### **5.5 Automated Follow-up Tasks**

When a deal's **Last Contact Date** is set or updated, the system automatically creates follow-up task reminders:

- **Day 10** after last contact: task created — "2nd touchpoint — \[Company Name\]"  
- **Day 20** after last contact: task created — "3rd touchpoint — \[Company Name\]"

Tasks are visible in the deal record and in a global task view (see Section 7). The system does not send emails or push notifications — tasks are surfaced exclusively within the task view. Tasks can be dismissed or rescheduled by the user.

If Last Contact Date is updated (new contact made), existing pending tasks for that deal are cancelled and new ones are created from the new date.

### **5.6 Deal Views**

**Kanban view** (default): columns represent active pipeline stages only (Screening through Due Diligence). Closed — Won, Closed — Lost, and On Hold deals do not appear in the kanban. Each card shows company name, star rating, assigned user, last contact date, and next action. Cards are draggable between columns to change stage (with confirmation prompt).

**List view with side panel**: a dense list of all deals with key fields visible. Clicking a deal opens a side panel with full deal details without navigating away from the list. Useful for quickly reviewing multiple deals.

**Closed deals view**: a separate, dedicated view listing all deals in Closed — Won, Closed — Lost, and On Hold stages. Accessible from the main navigation. Supports the same filters as the active deal views plus a Stage filter pre-set to closed stages. Deals can be reopened from this view.

Both views share the same filter state.

**Filters available in Deal views:**

| Filter | Type |
| :---- | :---- |
| Stage | Multi-select |
| Star Rating | Range |
| Assigned To | Multi-select |
| Source | Multi-select |
| Next Action Date | Date range |
| Last Contact Date | Date range |

---

## **6\. Module 3 — Updates Log**

### **6.1 Purpose**

The Updates Log is a chronological record of everything that has happened in a deal — meetings, calls, analyses, decisions, and any other notable event. It is the institutional memory of the deal process.

### **6.2 Update Data Model**

| Field | Type | Notes |
| :---- | :---- | :---- |
| Type | Select | See 6.3 |
| Date | Date | Defaults to today; editable |
| Author | User | Auto-populated from logged-in user |
| Title | Text | Short summary (optional but encouraged) |
| Body | Rich text | Main content of the update |
| External Document Links | List of URLs | One or more links to Drive, Dropbox, Notion, etc. (optional) |
| Created At | Timestamp | Auto |

### **6.3 Update Types**

| Type | Typical use |
| :---- | :---- |
| Meeting Note | Record of an in-person or video meeting |
| Call Note | Record of a phone call |
| Email Summary | Summary of an email exchange |
| Analysis | Internal analysis or research note |
| Valuation Note | Preliminary or detailed valuation notes |
| Decision | Record of a Go/No-Go or other significant decision |
| Other | Any update that doesn't fit the above |

### **6.4 Association & Visibility**

Updates are associated with **Deals**, not directly with companies in the repository. However, the company record in the repository displays a read-only feed of all updates from any Deal linked to that company. This provides full context from the company view without duplicating data.

### **6.5 External Documents**

Updates support a **list of external document links** — users can add as many URLs as needed per update. There is no file upload capability in v1. Users are expected to store documents in their preferred cloud storage (Google Drive, Dropbox, Notion, etc.) and paste the links into the update record. Each link can optionally include a label (e.g. "Preliminary Valuation — v2") for clarity.

---

## **7\. Global Task View**

A dedicated view lists all pending follow-up tasks across all deals, sorted by due date. Users can:

- See all tasks assigned to them (default) or all tasks in the tenant (toggle)  
- Mark tasks as complete  
- Reschedule tasks (change due date)  
- Dismiss tasks with a note  
- Navigate directly to the associated deal from a task

Tasks are created automatically by the follow-up logic (see 5.5) and cannot be created manually in v1.

---

## **8\. Data Export**

| Scope | Format | Access |
| :---- | :---- | :---- |
| Full repository (or filtered view) | CSV | Searcher, Analyst |
| All deals (or filtered view) | CSV | Searcher, Analyst |
| All updates for a deal | CSV | Searcher, Analyst |

Exports are generated on demand. There is no scheduled export or email delivery in v1.

---

## **9\. Features Explicitly Out of Scope for v1**

The following features are acknowledged as desirable but are deferred to future versions. They are documented here to ensure v1 architecture does not preclude them.

| Feature | Target version | Notes |
| :---- | :---- | :---- |
| Investor role & portal | v2 | Read-only view of selected deals; requires permission model already designed in v1 |
| Automated email sending | v2 | Full outreach sequences with send, tracking, and automation |
| Email open tracking | v2 | Requires email integration infrastructure |
| AI One Pager | v2 | Auto-generated company snapshot post-screening; triggered by user button; displayed inline in deal record |
| AI Pre-Meeting Report | v2 | Auto-generated briefing when meeting is confirmed; triggered by user button; displayed inline |
| Deal sharing between tenants | v2 | Sharing a deal with a co-investor or partner fund |
| Deal stage configurability | v2 | Fixed stages in v1; custom stage addition will be considered for enterprise customers in v2 |
| Mobile app | v3 | Native iOS/Android |
| Direct database integrations | Future | Real-time lookup via SII API, Registro Mercantil, etc. |
| Dashboard & KPI reporting | v2 | Conversion rates between stages, time-in-stage metrics |
| Name-based duplicate detection | v2 | Fuzzy matching on import |
| Manual task creation | v2 | Currently tasks are only auto-generated by follow-up logic |
| Task notifications (email/push) | v2 | In v1 tasks are visible in the task view only; email and push reminders deferred |
| Audit log | v2 | Full trail of who changed what and when; desirable for compliance and investor trust but deferred to avoid adding significant complexity to v1. v1 architecture should not preclude it (i.e. preserve created\_at / updated\_at / user\_id on all records) |

---

## **10\. Non-Functional Requirements**

**Performance**

- Repository table must load and be interactive within 3 seconds for datasets up to 500,000 records with active filters applied  
- CSV import of 100,000 rows must complete within 60 seconds; larger imports may run as background jobs with in-app notification on completion  
- **Import error handling:** validation errors (e.g. invalid Tax ID format, missing required field) are handled row by row — the affected row is skipped and logged in the completion report, but the rest of the import continues. System-level errors (e.g. database failure mid-import) trigger a full rollback; no partial data is committed. The completion report always distinguishes between rows imported successfully, rows skipped due to validation errors (with reason), and rows skipped as duplicates.

**Security**

- All data encrypted at rest and in transit (TLS 1.2+)  
- Tenant data is fully isolated; no cross-tenant data access is possible at the application or database layer  
- Authentication via email \+ password with option to enable SSO (Google Workspace) in v1

**Reliability**

- 99.5% uptime SLA  
- Daily automated backups with 30-day retention

**Internationalisation**

- UI in English in v1  
- Data model is country-agnostic (no hardcoded references to Chilean, Spanish, or other national data structures)  
- Currency, date format, and number format configurable per tenant

---

## **11\. Resolved Design Decisions**

The following questions were raised during requirements definition and have been resolved. They are documented here for traceability.

| Question | Decision |
| :---- | :---- |
| **Questionnaire templates** | The product ships with a library of pre-built templates (Search Fund Standard, Chile/SII, Spain/Registro Mercantil). See Section 4.5. |
| **Custom field limits** | Hard limit of 50 custom fields per record type, with a soft warning at 40\. See Section 4.2. |
| **Deal stage configurability** | Stages remain fixed in v1. Custom stage addition deferred to v2 for enterprise customers. See Section 9\. |
| **Task notifications** | Tasks are visible in the task view only. No email or push notifications in v1. See Section 9\. |
| **Audit log** | Desirable but deferred to v2. v1 must preserve `created_at`, `updated_at`, and `user_id` on all records to make v2 implementation straightforward. See Section 9\. |
| **Multiple questionnaires per tenant** | One active questionnaire per tenant. Quick Filters handle bulk pre-screening from specific data sources. See Section 4.5. |
| **Tax ID uniqueness across countries** | Tax ID \+ Country is the composite unique key. The same Tax ID number in two different countries is treated as two distinct companies. See Section 4.6.2. |
| **Reopening closed deals** | Allowed with confirmation. System auto-creates a Decision update with date, user, and mandatory reason on reopen. See Section 5.3. |
| **Status of company when deal closes** | "Converted to Deal" is permanent and never reversed automatically, even when a deal closes as Lost. See Section 4.4. |
| **External document links per update** | Multiple URLs per update (list field), each with an optional label. See Section 6.5. |
| **Closed deals in kanban** | Closed deals (Won, Lost, On Hold) do not appear in the main kanban. A separate Closed Deals view provides access. See Section 5.6. |
| **Import error handling** | Validation errors skip the affected row and continue; system errors trigger full rollback. See Section 10\. |
| **Seat limits** | Capped by plan via a `max_seats` field on the tenant record. Specific tier limits are a commercial decision. See Section 3\. |

