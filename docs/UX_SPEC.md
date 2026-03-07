# **Ceeq: Frontend Architecture & UX Spec**

**Architectural Directives:** You MUST adhere strictly to the Next.js 14+ App Router paradigm. All server-state MUST be managed via React Query, and view/filter states MUST be driven entirely by URL Search Parameters. Global state libraries for domain data are strictly FORBIDDEN.

### **1\. Design System & Global Tokens**

The UI MUST prioritize information density, rapid scannability, and a professional, "investor-ready" aesthetic. The product comes with an opinionated core and controlled flexibility.

* **Typography:** Sans-serif (e.g., Inter or Geist) optimized for data-dense tables and financial interfaces.  
* **Color Palette (Tailwind Tokens):**  
  * background: slate-50 (Clean, low eye-strain for long sessions).  
  * foreground: slate-900 (High contrast text).  
  * primary: blue-600 (Trustworthy, standard SaaS primary action color).  
  * muted: slate-100 (Subtle backgrounds for table rows and cards).  
  * border: slate-200 (Crisp separation of data elements).  
  * *Status Colors:* Mapped directly to specific data states (e.g., emerald-500 for "Closed — Won" , rose-500 for "Discarded" ).  
* **Shadcn/UI "Lego Bricks" Required:**  
  * DataTable (TanStack Table integration for the Company Repository ).  
  * Sheet (For the List view side panel to display full deal details without navigating away ).  
  * Dialog (For confirmation prompts, like reopening closed deals ).  
  * Badge (For displaying Source Tags and Company Statuses ).  
  * Tabs (To switch between Pipeline Kanban, List, and Closed views ).  
  * Toast (For success/error feedback on Server Actions, like CSV import completions ).

### **2\. File System & Routing Structure**

The application MUST be segmented using Next.js Route Groups to enforce distinct layouts and data-fetching boundaries.

* app/  
  * layout.tsx (Root layout, React Query Provider initialization)  
  * (auth)/  
    * layout.tsx (Minimal layout for unauthenticated state)  
    * login/page.tsx (Authentication entry point)  
  * (dashboard)/  
    * layout.tsx (Core layout: Sidebar navigation, Tenant context validation )  
    * repository/page.tsx (Company Repository module; URL-driven table with filters )  
    * pipeline/page.tsx (Deal Pipeline module; defaults to Kanban view )  
    * pipeline/closed/page.tsx (Dedicated view listing deals in Closed/On Hold stages )  
    * deals/\[id\]/page.tsx (Deep dive deal record, containing the Updates Log )  
    * tasks/page.tsx (Global Task View listing pending follow-up tasks )  
    * settings/page.tsx (Account model configuration, restricted to 'searcher' role )

---

### **Phase 2: Vertical UI Specification — Company Repository (/dashboard/repository)**

#### **1\. UX Mental Model & Journey**

The Company Repository is the "top of the funnel" triage engine. The user's mental model MUST be that of an actionable, high-density inbox. Searchers import hundreds of records here via CSV, and their primary goal is to rapidly scan, filter out noise, and either discard a company or elevate it to the Deal Pipeline.

State management for filtering, sorting, and pagination MUST be driven entirely by URL Search Parameters (e.g., ?status=New\&source=GovDB\&page=1) so that views are shareable and browser history is preserved.

#### **2\. Route & Component Tree**

This route utilizes TanStack Table integrated with Shadcn/UI for a highly performant, accessible data grid.

Plaintext

RepositoryPage (Reads URLSearchParams, fetches via React Query)

├── RepositoryHeader

│   ├── PageTitle

│   └── ImportCsvDialog (Shadcn Dialog)

│       ├── FileUploadZone

│       └── SubmitButton

├── RepositoryToolbar

│   ├── SearchInput \<- Mapped to \-\> URL.?q (Debounced)

│   ├── StatusFilterDropdown \<- Mapped to \-\> URL.?status (Enum: New, Reviewed, Discarded)

│   └── SourceTagFilterDropdown \<- Mapped to \-\> URL.?source

└── CompanyDataTable (Shadcn Table)

    ├── TableHeader

    └── TableBody

        └── TableRow (Repeated per CompanyDTO)

            ├── NameCell \<- Mapped to \-\> CompanyDTO.name

            ├── LocationCell \<- Mapped to \-\> CompanyDTO.country

            ├── TaxIdCell \<- Mapped to \-\> CompanyDTO.tax\_id

            ├── StatusBadge (Shadcn Badge) \<- Mapped to \-\> CompanyDTO.status

            ├── SourceBadge (Shadcn Badge) \<- Mapped to \-\> CompanyDTO.source\_tag

            └── DataTableRowActions (Shadcn DropdownMenu)

                ├── MarkReviewedAction \<- Triggers updateCompanyStatus()

                ├── MarkDiscardedAction \<- Triggers updateCompanyStatus()

                └── ConvertToDealAction \<- Triggers createDeal()

#### **3\. Interaction & Mutation Schema (The Bridge)**

All mutations MUST be executed via Next.js Server Actions and cached/invalidated via React Query.

**Action A: Import Companies CSV**

* **Server Action:** importCompaniesAction(formData: FormData)  
* **Zod Schema:** \`\`\`typescript  
  z.array(z.object({  
  name: z.string().min(1),  
  tax\_id: z.string().min(1),  
  country: z.string().length(2), // ISO Country Code  
  source\_tag: z.string().optional()  
  }))

*   
* 

**Action B: Update Company Status**

* **Server Action:** updateCompanyStatusAction(id: string, status: string)  
* **Zod Schema:**  
* TypeScript

z.object({

  id: z.string().uuid(),

  status: z.enum(\["New", "Reviewed", "Discarded"\]) 

  // Note: "Converted to Deal" is FORBIDDEN here; it requires the Deal creation flow.

})

*   
* 

**Action C: Convert to Deal**

* **Server Action:** createDealAction(companyId: string)  
* **Zod Schema:**  
* TypeScript

z.object({

  companyId: z.string().uuid()

})

*   
* 

#### **4\. Finite State Machine (FSM)**

* **Loading State:** On initial load or pagination, the CompanyDataTable MUST display Skeleton rows (Shadcn Skeleton) matching the exact column widths. A standalone spinner is FORBIDDEN as it disrupts layout stability.  
* **Empty State (No Data):** If the tenant has 0 companies, display an empty state card centered in the table area prompting the user to "Import Companies".  
* **Empty State (No Results):** If filters yield 0 results, display a distinct message: "No companies match your filters" with a "Clear Filters" button that resets URL Search Parameters.  
* **Optimistic UI:** When a user changes a company's status via the DataTableRowActions, the StatusBadge MUST immediately update in the UI via React Query's onMutate callback before the server responds.  
* **Error State:** If importCompaniesAction fails (e.g., validation failure or system error), a Shadcn Toast MUST be triggered with the destructive variant. Per the PRD, validation errors skip rows, but system errors trigger full rollback. The Toast MUST explicitly state how many rows succeeded vs. failed.

#### **5\. Microcopy Table**

| UI Element | Exact Text Content | Purpose |
| :---- | :---- | :---- |
| PageTitle | Company Repository | Establishes context. |
| ImportCsvButton | Import CSV | Primary action in header. |
| SearchInput Placeholder | Search by company name or Tax ID... | Guides user on searchable fields. |
| EmptyState Title (No Data) | Your repository is empty | Explains why the table is blank. |
| EmptyState Action (No Data) | Upload a CSV to start sourcing | Clear next step for new tenants. |
| EmptyState Title (Filtered) | No matching companies | Feedback for restrictive filters. |
| RowAction \- Convert | Convert to Deal | Moves company to Pipeline. |
| Toast \- Import Success | \[X\] companies imported successfully. | Confirmation feedback. |

---

### **Phase 2: Vertical UI Specification — Deal Pipeline (/dashboard/pipeline)**

#### **1\. UX Mental Model & Journey**

The Deal Pipeline is the execution engine of the CRM. The user's mental model MUST be a spatial, drag-and-drop Kanban board representing active deal progression. It provides immediate visual feedback on pipeline health and bottlenecks.

Users drag deals through active stages (e.g., "Evaluation", "LOI Submitted", "Due Diligence"). "Closed" or "On Hold" deals are strictly FORBIDDEN from this view and MUST be relegated to the /dashboard/pipeline/closed route to prevent visual clutter. Any view toggles or filters applied to this board MUST be persisted in the URL Search Parameters (e.g., ?owner=uuid\&sort=recent).

#### **2\. Route & Component Tree**

The pipeline utilizes a drag-and-drop context wrapping Shadcn/UI cards to form the Kanban layout.

Plaintext

PipelinePage (Reads URLSearchParams, fetches active deals via React Query)  
├── PipelineHeader  
│   ├── PageTitle  
│   └── PipelineControls  
│       └── OwnerFilterDropdown \<- Mapped to \-\> URL.?owner  
├── KanbanBoard (Drag and Drop Context Provider)  
│   └── KanbanColumn (Repeated per active Stage enum)  
│       ├── ColumnHeader \<- Mapped to \-\> DealDTO.stage  
│       ├── ColumnCountBadge \<- Computed (number of deals in stage)  
│       └── ScrollableCardList  
│           └── DealCard (Draggable, Repeated per DealDTO)  
│               ├── CardHeader  
│               │   ├── CompanyName \<- Mapped to \-\> DealDTO.company.name  
│               │   └── PriorityBadge (Shadcn Badge) \<- Mapped to \-\> DealDTO.priority  
│               ├── CardContent  
│               │   ├── IndustryText \<- Mapped to \-\> DealDTO.company.industry (Contract Gap check: ensure industry is returned in DealDTO)  
│               │   └── LastUpdatedText \<- Mapped to \-\> DealDTO.updated\_at  
│               └── CardFooter  
│                   └── ViewDealLink (Next/Link to /dashboard/deals/\[id\])

#### **3\. Interaction & Mutation Schema (The Bridge)**

The primary interaction in this route is spatial (drag and drop), which translates to a backend stage update.

**Action A: Update Deal Stage (Drag & Drop Drop Event)**

* **Server Action:** updateDealStageAction(dealId: string, newStage: string)  
* **Zod Schema:**  
* TypeScript

z.object({  
  dealId: z.string().uuid(),  
  stage: z.enum(\["Evaluation", "LOI Submitted", "Due Diligence"\])   
  // Note: Moving to 'Closed Won', 'Closed Lost', or 'On Hold' from the board triggers Action B.  
})

*   
* 

**Action B: Close Deal (Triggered via context menu or moving to a 'Closed' drop zone if implemented)**

* **Server Action:** closeDealAction(dealId: string, resolution: string, reason?: string)  
* **Zod Schema:**  
* TypeScript

z.object({  
  dealId: z.string().uuid(),  
  resolution: z.enum(\["Closed Won", "Closed Lost", "On Hold"\]),  
  reason: z.string().optional() // Mandatory if Lost/On Hold depending on business logic  
})

*   
* 

#### **4\. Finite State Machine (FSM)**

* **Loading State:** The KanbanBoard MUST render static KanbanColumn components, and inside them, render Skeleton cards (Shadcn Skeleton) matching the height of standard deal cards. A page-level spinner is FORBIDDEN.  
* **Empty State (No Deals in System):** If the tenant has 0 active deals, replace the KanbanBoard with an empty state layout directing them to the Company Repository.  
* **Empty State (Empty Column):** If a specific stage has 0 deals, the ScrollableCardList MUST display a subtle, muted drop-zone area to indicate it can accept dragged cards.  
* **Optimistic UI (CRITICAL):** Drag-and-drop interactions MUST be instantaneous. When a DealCard is dropped into a new KanbanColumn, React Query's onMutate MUST immediately update the cache to reflect the new state.  
* **Error State / Rollback:** If the updateDealStageAction fails, the Optimistic UI update MUST be rolled back via React Query's onError handler, visually snapping the card back to its original column. A Shadcn Toast (destructive) MUST appear explaining the failure.

#### **5\. Microcopy Table**

| UI Element | Exact Text Content | Purpose |
| :---- | :---- | :---- |
| PageTitle | Active Pipeline | Establishes page context. |
| EmptyState Title | Your pipeline is empty | Clear indication of zero active deals. |
| EmptyState Action | Go to Repository | Directs user to the source of new deals. |
| EmptyColumn Text | Drop deals here | Guides users on Kanban interactions. |
| CardFooter Link | View Deal → | Call to action for deep-dive page. |
| Toast \- Move Error | Failed to move deal. Please try again. | Error feedback with a prompt to retry. |
| Toast \- Close Success | Deal moved to Closed view. | Confirmation that a deal was successfully removed from the active board. |

---

### **Phase 2: Vertical UI Specification — Deal Deep Dive & Updates Log (/dashboard/deals/\[id\])**

#### **1\. UX Mental Model & Journey**

The Deal Deep Dive is the single source of truth for a specific acquisition target. The user's mental model MUST be a split-pane layout or highly structured dossier: static/slow-changing metadata on one side (or top), and a dynamic, chronological "Updates Log" on the other.

This view is heavily read/write. Users spend significant time here composing notes (Meetings, Valuations, Decisions). The Timeline MUST be instantly scannable, differentiating a simple "Call Note" from a critical "Decision" via Shadcn/UI Badges and typography. Any filtering of the timeline (e.g., viewing only "Analysis" updates) MUST be managed via URL Search Parameters (e.g., ?filter\_type=Analysis).

#### **2\. Route & Component Tree**

This route uses a layout heavily reliant on Shadcn Cards and a custom timeline layout.

Plaintext

DealDetailPage (Fetches DealDTO and UpdateDTO\[\] via React Query)

├── DealHeader

│   ├── CompanyNameTitle \<- Mapped to \-\> DealDTO.company.name

│   ├── StageBadge (Shadcn Badge) \<- Mapped to \-\> DealDTO.stage

│   └── ReopenDealDialog (Shadcn Dialog) \<- Renders ONLY if DealDTO.stage is 'Closed/On Hold'

│       ├── WarningText

│       ├── ReasonInput

│       └── ConfirmReopenButton

├── DealLayoutGrid

│   ├── DealMetadataPanel (Left Column / Sidebar)

│   │   └── MetadataCard (Shadcn Card)

│   │       ├── PriorityField \<- Mapped to \-\> DealDTO.priority

│   │       ├── SizeEstimateField \<- Mapped to \-\> DealDTO.size\_estimate

│   │       └── CustomFieldsList \<- Mapped to \-\> DealDTO.custom\_fields

│   └── UpdatesLogSection (Right Column / Main Content)

│       ├── UpdateComposer (Shadcn Form)

│       │   ├── TypeSelect \<- Mapped to \-\> createUpdateSchema.type

│       │   ├── TitleInput \<- Mapped to \-\> createUpdateSchema.title

│       │   ├── BodyRichTextEditor \<- Mapped to \-\> createUpdateSchema.body

│       │   ├── ExternalLinksRepeater \<- Mapped to \-\> createUpdateSchema.externalLinks

│       │   └── SubmitButton

│       ├── TimelineFilterTabs (Shadcn Tabs) \<- Mapped to \-\> URL.?filter\_type

│       └── UpdateTimeline

│           └── UpdateCard (Repeated per UpdateDTO)

│               ├── CardHeader

│               │   ├── TypeBadge \<- Mapped to \-\> UpdateDTO.type

│               │   ├── AuthorName \<- Mapped to \-\> UpdateDTO.authorName

│               │   └── EventDate \<- Mapped to \-\> UpdateDTO.eventDate

│               ├── CardTitle \<- Mapped to \-\> UpdateDTO.title

│               ├── CardBody \<- Mapped to \-\> UpdateDTO.body (Rendered HTML)

│               └── ExternalLinksList (Repeated per UpdateDTO.externalLinks)

│                   └── LinkItem \<- Mapped to \-\> ExternalLinkDTO.url / .label

#### **3\. Interaction & Mutation Schema (The Bridge)**

**Action A: Post New Update**

* **Server Action:** createUpdateAction(dealId: string, payload: UpdatePayload)  
* **Zod Schema (Strictly bound to API Contract):**  
* TypeScript

z.object({

  type: z.enum(\["Meeting Note", "Call Note", "Email Summary", "Analysis", "Valuation Note", "Decision", "Other"\]),

  title: z.string().optional(),

  body: z.string().min(1, "Update body cannot be empty"),

  externalLinks: z.array(z.object({

    url: z.string().url("Must be a valid URL"),

    label: z.string().optional()

  })).default(\[\]),

  date: z.string().datetime().optional()

})

*   
* 

**Action B: Reopen Closed Deal**

* **Server Action:** reopenDealAction(dealId: string, reason: string)  
* **Zod Schema:**  
* TypeScript

z.object({

  dealId: z.string().uuid(),

  reason: z.string().min(10, "A detailed reason is required to reopen a deal.") // Mandatory per PRD

})

*   
* 

#### **4\. Finite State Machine (FSM)**

* **Loading State:** The layout grid MUST render immediately with Skeleton blocks replacing the DealMetadataPanel and 3-4 Skeleton instances of the UpdateCard in the timeline. The DealHeader should show a Skeleton for the title.  
* **Empty State (Updates Log):** If a deal has 0 updates, the UpdateTimeline MUST display an empty state area below the UpdateComposer prompting the user: "No updates logged yet. Be the first to add context to this deal."  
* **Optimistic UI (Updates):** When a user submits the UpdateComposer, the UI MUST instantly inject the new UpdateCard at the top of the UpdateTimeline via React Query's onMutate. The composer form MUST immediately clear to allow consecutive entries.  
* **Error State (Composer):** If createUpdateAction fails, the Optimistic UI update MUST be rolled back, the UpdateComposer form MUST retain the user's drafted content, and a destructive Shadcn Toast MUST be displayed.  
* **Closed Deal State Rules:** If DealDTO.stage is "Closed Won", "Closed Lost", or "On Hold", the UpdateComposer MUST be disabled (or hidden), and a prominent banner MUST indicate the deal is closed. The only allowed mutation is the ReopenDealDialog.

#### **5\. Microcopy Table**

| UI Element | Exact Text Content | Purpose |
| :---- | :---- | :---- |
| UpdateComposer Placeholder | What happened? Log a note, call, or analysis... | Prompts data entry. |
| ExternalLinks Add Button | \+ Add External Document | Guides user to link external files/models. |
| ReopenDealDialog Title | Reopen Deal | Clear modal header. |
| ReopenDealDialog Warning | Reopening this deal will move it back to the active pipeline. A "Decision" update will be logged automatically. | Explains the system-level consequences. |
| EmptyState Timeline | No updates logged yet. | Feedback for zero history. |
| Toast \- Update Error | Failed to post update. Your draft was saved. | Reassures user that their text isn't lost. |

---

### **Phase 2: Vertical UI Specification — Global Tasks View (/dashboard/tasks)**

#### **1\. UX Mental Model & Journey**

The Global Tasks View is the searcher's daily operational command center. Its singular purpose is to surface auto-generated follow-up tasks across all active deals. The mental model MUST be a high-density, action-oriented "To-Do" list sorted chronologically by due date.

Because tasks are system-generated based on the Deal's last\_contact\_date, manual task creation buttons are strictly FORBIDDEN in this view. The primary view toggle ("My Tasks" vs. "All Tenant Tasks" ) MUST be managed entirely via URL Search Parameters (e.g., ?scope=me vs. ?scope=tenant), defaulting to me.

#### **2\. Route & Component Tree**

The UI relies on a clean, scannable list layout using Shadcn/UI components.

Plaintext

TasksPage (Reads URLSearchParams, fetches TaskDTO\[\] via React Query)

├── TasksHeader

│   ├── PageTitle

│   └── ScopeToggleTabs (Shadcn Tabs) \<- Mapped to \-\> URL.?scope

├── TasksList

    └── TaskRow (Repeated per TaskDTO where status \=== 'pending')

        ├── TaskCompletionCheckbox (Shadcn Checkbox) \<- Triggers completeTaskAction()

        ├── TaskDetails

        │   ├── TaskTitle \<- Mapped to \-\> TaskDTO.title

        │   └── DealReferenceLink (Next/Link to /dashboard/deals/\[id\]) \<- Mapped to \-\> TaskDTO.dealName \[cite: 94, 95\]

        ├── DueDateBadge (Shadcn Badge) \<- Mapped to \-\> TaskDTO.dueDate (Color-coded: Overdue vs. Upcoming)

        └── TaskRowActionsMenu (Shadcn DropdownMenu)

            ├── RescheduleAction \<- Opens RescheduleDialog

            ├── DismissAction \<- Opens DismissDialog

            └── GoToDealAction (Next/Link) \<- Mapped to \-\> TaskDTO.dealId \[cite: 333\]

// Action Dialogs (Rendered at the Page level, controlled via URL or local ephemeral state)

├── RescheduleDialog (Shadcn Dialog)

│   ├── DatePicker (Shadcn Calendar)

│   └── ConfirmButton

└── DismissDialog (Shadcn Dialog)

    ├── WarningText

    ├── DismissalNoteInput (Shadcn Textarea) \<- Mapped to \-\> TaskDTO.dismissalNote \[cite: 98, 332\]

    └── ConfirmDismissButton

#### **3\. Interaction & Mutation Schema (The Bridge)**

All task interactions are destructive to the "pending" view (they either complete, dismiss, or push the task to a future date).

**Action A: Mark Task Complete**

* **Server Action:** completeTaskAction(taskId: string)  
* **Zod Schema:**  
* TypeScript

z.object({

  taskId: z.string().uuid()

})

*   
* 

**Action B: Reschedule Task**

* **Server Action:** rescheduleTaskAction(taskId: string, newDueDate: string)  
* **Zod Schema:**  
* TypeScript

z.object({

  taskId: z.string().uuid(),

  newDueDate: z.string().datetime()

})

*   
* 

**Action C: Dismiss Task**

* **Server Action:** dismissTaskAction(taskId: string, dismissalNote: string)  
* **Zod Schema:**  
* TypeScript

z.object({

  taskId: z.string().uuid(),

  dismissalNote: z.string().min(1, "A note is required to dismiss a task") // Required per PRD 

})

*   
* 

#### **4\. Finite State Machine (FSM)**

* **Loading State:** The TasksList MUST render 5-7 Skeleton rows mimicking the exact layout of a TaskRow. No full-page spinners.  
* **Empty State (Caught Up):** If the query returns 0 pending tasks, display an empty state centered in the list area: "You're all caught up\! No pending tasks." with an illustration or icon.  
* **Optimistic UI (Crucial):** Because this is a high-volume triage view, clicking the TaskCompletionCheckbox MUST immediately remove the task from the DOM via React Query's onMutate cache update. The user should not have to wait for the server roundtrip to clear the item.  
* **Error State / Rollback:** If any mutation fails, the Optimistic UI update MUST be reversed, restoring the task to the list, and a destructive Shadcn Toast MUST be displayed with the failure reason.  
* **Date Badge Logic:** The DueDateBadge MUST dynamically check TaskDTO.dueDate against the current system date. If overdue, the badge MUST use the destructive variant (red). If due today, use default (primary color). If future, use secondary (muted).

#### **5\. Microcopy Table**

| UI Element | Exact Text Content | Purpose |
| :---- | :---- | :---- |
| PageTitle | Tasks | Establishes context. |
| ScopeToggleTabs | My Tasks / All Tasks | Clear indication of filtering scope. |
| EmptyState Title | You're all caught up\! | Positive reinforcement for zero pending tasks. |
| EmptyState Subtitle | Follow-up tasks are automatically generated based on the last contact date of your active deals. | Explains the system automation. |
| DismissDialog Title | Dismiss Task | Modal header. |
| DismissDialog Input | Why are you dismissing this task? | Prompts for the required dismissal note. |
| Toast \- Complete Success | Task marked as complete. | Ephemeral confirmation. |

---

### **Phase 2: Vertical UI Specification — Account Settings & Custom Fields (/dashboard/settings)**

#### **1\. UX Mental Model & Journey**

The Settings view is the administrative hub of the tenant. Unlike the high-speed triage of the Repository or Tasks views, the user's mental model here MUST be deliberate, structured, and permanent. Actions taken here (like defining custom fields or inviting users) affect the entire team's workspace.

Access is strictly governed by Role-Based Access Control (RBAC). Only users with the searcher role may access this route. If an analyst attempts to route here, they MUST be intercepted and redirected. Navigation between sub-sections (Tenant Profile, Team, Custom Fields) MUST be handled via URL Search Parameters (e.g., ?tab=team) to allow direct linking to specific configuration panels.

#### **2\. Route & Component Tree**

The UI utilizes a master-detail layout or a heavy tabbed interface using Shadcn/UI components to separate distinct administrative domains.

Plaintext

SettingsPage (Reads URLSearchParams, fetches Tenant context via React Query)

├── SettingsHeader

│   ├── PageTitle

│   └── PageDescription

├── SettingsNavTabs (Shadcn Tabs) \<- Mapped to \-\> URL.?tab (Values: profile, team, fields)

│

├── ProfileTabPanel (Renders if ?tab=profile)

│   └── TenantProfileForm (Shadcn Form)

│       ├── TenantNameInput \<- Mapped to \-\> TenantDTO.name

│       ├── SeatCountDisplay \<- Mapped to \-\> TenantDTO.max\_seats (Read-only)

│       └── SubmitButton \<- Triggers updateTenantAction()

│

├── TeamTabPanel (Renders if ?tab=team)

│   ├── TeamListHeader

│   │   └── InviteUserDialog (Shadcn Dialog)

│   │       ├── EmailInput

│   │       ├── RoleSelect (Enum: searcher, analyst)

│   │       └── SubmitButton \<- Triggers inviteUserAction()

│   └── TeamDataTable (Shadcn Table)

│       └── UserRow (Repeated per UserDTO)

│           ├── NameCell \<- Mapped to \-\> UserDTO.first\_name \+ UserDTO.last\_name

│           ├── EmailCell \<- Mapped to \-\> UserDTO.email

│           └── RoleBadge (Shadcn Badge) \<- Mapped to \-\> UserDTO.role

│

└── CustomFieldsTabPanel (Renders if ?tab=fields)

    ├── FieldsListHeader

    │   └── CreateFieldDialog (Shadcn Dialog)

    │       ├── FieldNameInput \<- Mapped to \-\> CustomFieldDefDTO.name

    │       ├── FieldTypeSelect \<- Mapped to \-\> CustomFieldDefDTO.type (Enum: text, number, date, select)

    │       └── SubmitButton \<- Triggers createCustomFieldDefAction()

    └── FieldDefinitionsList

        └── FieldDefCard (Shadcn Card, Repeated per CustomFieldDefDTO)

            ├── FieldNameText \<- Mapped to \-\> CustomFieldDefDTO.name

            └── FieldTypeBadge \<- Mapped to \-\> CustomFieldDefDTO.type

#### **3\. Interaction & Mutation Schema (The Bridge)**

Because settings changes alter the global tenant experience, mutations here require strict validation and explicit success feedback.

**Action A: Update Tenant Profile**

* **Server Action:** updateTenantAction(tenantId: string, name: string)  
* **Zod Schema:**  
* TypeScript

z.object({

  tenantId: z.string().uuid(),

  name: z.string().min(2, "Tenant name must be at least 2 characters")

})

*   
* 

**Action B: Invite Team Member**

* **Server Action:** inviteUserAction(payload: InvitePayload)  
* **Zod Schema:**  
* TypeScript

z.object({

  email: z.string().email("Must be a valid email address"),

  role: z.enum(\["searcher", "analyst"\]) // Restricts assignment to allowed RBAC roles

})

*   
* 

**Action C: Define Custom Field**

* **Server Action:** createCustomFieldDefAction(payload: CustomFieldPayload)  
* **Zod Schema:**  
* TypeScript

z.object({

  name: z.string().min(1, "Field name is required").regex(/^\[a-zA-Z0-9 \_-\]+$/, "Invalid characters in field name"),

  type: z.enum(\["text", "number", "date", "select"\]),

  options: z.array(z.string()).optional() // Only required/used if type \=== "select"

})

*   
* 

#### **4\. Finite State Machine (FSM)**

* **Loading State:** The SettingsNavTabs MUST render immediately. The active TabPanel MUST display a Skeleton layout mimicking the underlying form or table.  
* **Unauthorized State (RBAC Violation):** If a user with role \=== 'analyst' attempts to load /dashboard/settings, the server MUST intercept the request at the Layout or Page level and immediately redirect to /dashboard/pipeline. A UI error state here is FORBIDDEN; they simply should not be able to access the route.  
* **Optimistic UI:** \* *Team & Fields:* When adding a user or custom field, inject the new record into the React Query cache via onMutate so it appears instantly in the table/list.  
  * *Profile:* Updating the Tenant Name MUST instantly reflect in the header and anywhere else the Tenant Name is globally cached.  
* **Error State:** If createCustomFieldDefAction fails (e.g., reaching a maximum field limit, or a database constraint), the Optimistic UI update MUST roll back. A Shadcn Toast (destructive) MUST explicitly state the error.

#### **5\. Microcopy Table**

| UI Element | Exact Text Content | Purpose |
| :---- | :---- | :---- |
| PageTitle | Account Settings | Establishes context. |
| SettingsNavTabs | Profile / Team / Custom Fields | Clarifies navigation domains. |
| SeatCountDisplay Label | Seats utilized | Indicates billing/capacity status. |
| InviteUserDialog Title | Invite Team Member | Modal header. |
| CreateFieldDialog Warning | Custom fields will appear on all Deal records. Their type cannot be changed after creation. | Educates the user on the permanence of schema changes. |
| Toast \- Invite Success | Invitation sent to \[Email\]. | Confirmation feedback. |

