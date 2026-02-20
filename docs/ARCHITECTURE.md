# **Ceeq Architecture Spec**

As the Principal Software Architect, I have established the strict implementation blueprint for Ceeq. This architecture guarantees the cryptographic privacy, scalable multi-tenancy, and high-performance UX required by the system's dual-sided nature (Searchers and Investors).

## **1\. File System & Naming Convention**

The application MUST strictly adhere to a Feature-Sliced Design within the Next.js 14+ App Router ecosystem. Developers are FORBIDDEN from dumping domain-specific logic into a global components/ folder.

### **Folder Structure**

Plaintext

src/  
├── app/                        \# Next.js App Router (Routing only, no business logic)  
│   ├── (auth)/                 \# Route group for auth flows  
│   ├── (searcher)/             \# Route group for Searcher OS  
│   ├── (investor)/             \# Route group for Investor OS  
│   └── api/                    \# Next.js Route Handlers  
├── features/                   \# Core business domains (Feature-Sliced)  
│   ├── auth/                   \# Identity and Role selection logic  
│   ├── deals/                  \# Pipeline, Deal Workspace, OCR Extraction  
│   ├── sourcing/               \# Universe and CSV imports  
│   └── network/                \# Investor portfolio and deal flow feed  
├── shared/                     \# Globally reusable utilities  
│   ├── components/             \# Dumb UI atoms/molecules (shadcn/ui)  
│   ├── lib/                    \# API clients, formatters, constants  
│   └── types/                  \# Global enums, Prisma types  
└── prisma/                     \# Database schema and migrations

### **Naming Rules & Colocation Strategy**

* **Files & Directories:** MUST use kebab-case (e.g., deal-card.tsx, use-optimistic-pipeline.ts).  
* **React Components:** MUST use PascalCase for exports (e.g., export const DealCard \= ...).  
* **Server Actions:** MUST use a camelCase naming convention ending in Action (e.g., updateDealTierAction.ts) and MUST be placed in an actions.ts file within their respective feature folder.  
* **Colocation:** Tests (.test.tsx), storybooks (.stories.tsx), and localized Zod schemas MUST sit immediately adjacent to their target component within the features/ directory.

---

## **2\. Core Types & API Contract (The Blueprint)**

The system relies on strict Type Ingestion & Mapping. The frontend MUST NOT directly consume raw database entities. All data exchange MUST adhere strictly to the DTO contracts .

### **Type Ingestion & Mapping Strategy**

Data mapping MUST occur at the API boundary (within Next.js Route Handlers or Server Actions) to sanitize payloads before they hit the React Client components.

* **Enums:** Shared enums (WorkspaceType, DealStage, VisibilityTier, SourcingStatus) MUST be imported directly from the generated Prisma client to maintain single-source-of-truth accuracy .  
* **Data Transfer Objects (DTOs):** The frontend MUST exclusively bind to the defined interfaces:  
  * SearcherDashboardDTO for aggregate metrics and recent deals .  
  * UniverseListDTO and SourcingTargetDTO for the paginated data grid .  
  * PipelineDTO containing KanbanDealDTO columns for the Deal CRM .  
  * InvestorDashboardDTO and InvestorDealFeedDTO for the Investor OS read-only views .  
  * DealWorkspaceDTO, DocumentListDTO, and AIExtractionSplitScreenDTO for deep deal mechanics .  
* **The Mapper Pattern:** Developers MUST implement transformation classes or functions (e.g., DealMapper.toPipelineDTO(dealEntity)) on the server to scrub private InternalChatMessage arrays or obfuscate data based on the visibilityTier .

### **API Contract Validation (Zod)**

All mutations MUST be intercepted and validated by Zod at the Server Action boundary before touching the database. The system MUST implement the specific schemas defined in the contract:

* OnboardingSubmitSchema to enforce irreversible role selection (SEARCHER vs INVESTOR) .  
* UpdateDealVisibilitySchema to safely transition a deal from TIER\_1\_PRIVATE to TIER\_2\_SHARED .  
* SaveFinancialExtractionSchema to guarantee human-in-the-loop validation (isVerifiedByHuman: true) and structural integrity of the OCR JSONB payload .  
* UploadDocumentSchema and TriggerAIExtractionSchema for the Document Vault and AI microservice integration .

---

## **3\. Route & Component Composition Matrix (Part 1\)**

Developers MUST adhere to the following component composition structures. Data fetching MUST occur at the top-level Page or Layout components, passing strict DTOs down to the dumb UI components.

### **Route 1: /onboarding**

* **Route:** /onboarding  
* **Page Component:** OnboardingPage.tsx  
* **Layout:** AuthLayout (Provides split-screen branding vs form area)  
* **Key Sub-Components:** \* \<OnboardingWizard /\> (Stateful organism managing steps)  
  * \<RoleSelector /\> (Cards for SEARCHER vs INVESTOR)  
  * \<ProfileForm /\> (Final step data collection)  
* **Data Requirements:**  
  * *Loader:* getUserSession()  
  * *Contract:* SessionDTO  
  * *Suspense Boundary:* \<Skeleton className="w-full h-\[400px\]" /\>

### **Route 2: /searcher/dashboard**

* **Route:** /searcher/dashboard  
* **Page Component:** SearcherDashboardPage.tsx  
* **Layout:** SearcherLayout (Provides global Sidebar and Header)  
* **Key Sub-Components:**  
  * \<MetricsGrid /\> (Renders \<MetricCard /\> atoms for active deals, LOIs, etc.)  
  * \<RecentActivityFeed /\>  
  * \<PipelineSnapshot /\> (Miniature list view of active deals)  
* **Data Requirements:**  
  * *Loader:* getSearcherDashboard(workspaceId)  
  * *Contract:* SearcherDashboardDTO  
  * *Suspense Boundary:* \<DashboardSkeleton /\> (Grid of pulsing cards matching the layout)

### **Route 3: /searcher/universe**

* **Route:** /searcher/universe  
* **Page Component:** UniversePage.tsx  
* **Layout:** SearcherLayout  
* **Key Sub-Components:**  
  * \<SourcingDataTable /\> (Complex organism: Headless UI / TanStack Table)  
  * \<SourcingFilters /\> (Industry, Revenue Range, Status)  
  * \<ConvertDealDialog /\> (Triggered on row action)  
* **Data Requirements:**  
  * *Loader:* getSourcingUniverse(workspaceId, searchParams) (Requires pagination/filtering via URL params)  
  * *Contract:* UniverseListDTO (Paginated)  
  * *Suspense Boundary:* \<TableSkeleton rows={10} /\>

### **Route 4: /searcher/pipeline**

* **Route:** /searcher/pipeline  
* **Page Component:** PipelinePage.tsx  
* **Layout:** SearcherLayout  
* **Key Sub-Components:**  
  * \<KanbanBoardWrapper /\> (Client component orchestrating drag-and-drop context)  
  * \<KanbanColumn stage={DealStage} /\>  
  * \<DealCard deal={KanbanDealDTO} /\> (Displays hashed domain, stage, and visibility tier)  
  * \<VisibilityBadge tier={VisibilityTier} /\>  
* **Data Requirements:**  
  * *Loader:* getPipeline(workspaceId)  
  * *Contract:* PipelineDTO (Contains array of KanbanDealDTO)  
  * *Suspense Boundary:* \<KanbanSkeleton columns={5} /\>

---

## **4\. Interaction & Mutation Schema (Part 1\)**

Every UI mutation MUST be explicitly mapped to a Server Action and validated by Zod. Implicit or unvalidated state mutations are strictly FORBIDDEN.

### **Mutation: Complete Onboarding**

* **UI Component:** \<ProfileForm /\>  
* **Trigger:** onSubmit  
* **Server Action:** completeOnboardingAction(payload: FormData)  
* **Zod Input Schema:** OnboardingSubmitSchema (Enforces strict SEARCHER | INVESTOR enum and required profile fields).  
* **Optimistic UI Strategy:** No optimistic update. MUST show a blocking \<LoadingSpinner /\> on the submit button. Upon success, issue a hard redirect (redirect('/searcher/dashboard') or /investor/dashboard).

### **Mutation: Convert Sourcing Target to Deal**

* **UI Component:** \<ConvertDealDialog /\> (Inside /searcher/universe)  
* **Trigger:** onConfirm  
* **Server Action:** convertTargetToDealAction(targetId: string)  
* **Zod Input Schema:** ConvertTargetSchema  
* **Optimistic UI Strategy:** 1\. Show loading state in the dialog.  
  2\. On success, use revalidatePath('/searcher/universe') to remove the row from the table.  
  3\. Fire a toast notification: "Target moved to Inbox."

### **Mutation: Update Deal Stage (Drag & Drop)**

* **UI Component:** \<KanbanBoardWrapper /\>  
* **Trigger:** onDragEnd  
* **Server Action:** updateDealStageAction({ dealId, newStage })  
* **Zod Input Schema:** UpdateDealStageSchema  
* **Optimistic UI Strategy:** REQUIRED.  
  1. Implement React's useOptimistic hook within \<KanbanBoardWrapper /\>.  
  2. Immediately move the \<DealCard /\> to the new \<KanbanColumn /\>.  
  3. Execute updateDealStageAction in the background.  
  4. If the Server Action returns an error, silently rollback the optimistic state to the previous column and display a destructive toast notification ("Failed to move deal").

### **Mutation: Upgrade Deal Visibility (Privacy Firewall)**

* **UI Component:** \<VisibilityModal /\> (Triggered from a deal card or deal room)  
* **Trigger:** onConfirm  
* **Server Action:** updateDealVisibilityAction({ dealId, tier: 'TIER\_2\_SHARED' })  
* **Zod Input Schema:** UpdateDealVisibilitySchema  
* **Optimistic UI Strategy:** REQUIRED.  
  1. Close modal immediately.  
  2. Optimistically update the \<VisibilityBadge /\> on the deal card from gray (Private) to green (Shared).  
  3. Execute background Server Action.  
  4. Rollback and show an error toast if the backend validation fails.

---

## **3\. Route & Component Composition Matrix (Part 2\)**

### **Route 5: /searcher/deals/\[id\] (Deal Workspace & Document Vault)**

* **Route:** /searcher/deals/\[id\]  
* **Page Component:** DealWorkspacePage.tsx  
* **Layout:** DealDetailLayout (Wraps the route with a secondary tab navigation: Overview, Documents, Financials).  
* **Key Sub-Components:**  
  * \<DealHeader /\> (Displays company name, stage, and the critical \<VisibilityToggle /\>).  
  * \<DocumentVault /\> (Organism containing the file dropzone and list).  
  * \<DocumentRow /\> (Displays file name, upload date, and a locked/unlocked icon based on Investor visibility).  
* **Data Requirements:**  
  * *Loader:* getDealWorkspace(dealId, workspaceId)  
  * *Contract:* DealWorkspaceDTO & DocumentListDTO  
  * *Suspense Boundary:* \<DealWorkspaceSkeleton /\>

### **Route 6: /searcher/deals/\[id\]/extraction (AI OCR Split Screen)**

* **Route:** /searcher/deals/\[id\]/extraction  
* **Page Component:** AIExtractionPage.tsx  
* **Layout:** FullScreenLayout (MUST hide global sidebars to maximize screen real estate for document reading).  
* **Key Sub-Components:**  
  * \<PDFViewer /\> (Left pane: Renders the CIM or financials PDF, capable of drawing bounding boxes).  
  * \<ExtractionForm /\> (Right pane: Human-in-the-loop validation interface).  
  * \<ExtractionField /\> (Input mapped to specific JSONB keys like revenue, ebitda with confidence score indicators).  
* **Data Requirements:**  
  * *Loader:* getAIExtractionData(dealId)  
  * *Contract:* AIExtractionSplitScreenDTO  
  * *Suspense Boundary:* \<SplitScreenSkeleton leftPane="pdf" rightPane="form" /\>

### **Route 7: /investor/dashboard & /investor/deals (Investor OS)**

* **Route:** /investor/deals  
* **Page Component:** InvestorDealFeedPage.tsx  
* **Layout:** InvestorLayout  
* **Key Sub-Components:**  
  * \<FeedFilters /\> (Filter by Searcher, Deal Stage, Industry).  
  * \<DealFeedGrid /\> (Masonry or grid layout of available Tier 2 deals).  
  * \<InvestorDealCard /\> (Displays sanitized metrics. MUST NOT expose Tier 1 data).  
  * \<DealDrawer /\> (shadcn/ui Sheet triggered on card click to view attached Tier 2 documents).  
* **Data Requirements:**  
  * *Loader:* getInvestorDealFeed(investorWorkspaceId)  
  * *Contract:* InvestorDealFeedDTO  
  * *Suspense Boundary:* \<FeedGridSkeleton count={8} /\>

---

## **4\. Interaction & Mutation Schema (Part 2\)**

### **Mutation: Upload Document to Vault**

* **UI Component:** \<DocumentVault /\> (Specifically the Dropzone area).  
* **Trigger:** onDrop \-\> onUploadComplete (after direct-to-S3/GCS upload).  
* **Server Action:** saveDocumentMetadataAction({ dealId, fileUrl, ...metadata })  
* **Zod Input Schema:** UploadDocumentSchema (MUST strictly validate fileSize \< 50MB, allowed mimeTypes, and the critical isVisibleToInvestors boolean).  
* **Optimistic UI Strategy:** 1\. Immediately render an optimistic \<DocumentRow /\> with a progress bar during the physical file upload.  
  2\. Upon success, swap to the finalized row.  
  3\. If the upload or Server Action fails, remove the optimistic row and present a destructive toast ("Upload failed. Please try again.").

### **Mutation: Save AI Financial Extraction (Human-in-the-Loop)**

* **UI Component:** \<ExtractionForm /\>  
* **Trigger:** onSubmit (User clicks "Verify & Save Financials").  
* **Server Action:** saveFinancialExtractionAction({ dealId, extractedData })  
* **Zod Input Schema:** SaveFinancialExtractionSchema (MUST strictly enforce isVerifiedByHuman: true to prevent unverified AI hallucinations from entering the database, and validate the nested JSONB structure).  
* **Optimistic UI Strategy:** NO optimistic update. Because this data directly informs valuations, the UI MUST show a blocking \<Button isLoading\> state. On success, fire a toast ("Financials Verified") and execute a router push (router.push('/searcher/deals/\[id\]')) back to the Deal Workspace.

### **Interaction: View Shared Deal Details (Investor OS)**

* **UI Component:** \<InvestorDealCard /\>  
* **Trigger:** onClick ("View Deal Room").  
* **State Behavior:** 1\. Opens \<DealDrawer /\> (Sheet component).  
  2\. If deep document arrays are not in the initial feed DTO, use a Client-side React Query (useQuery({ queryKey: \['investorDeal', id\] })) to fetch the attached Tier 2 documents.  
  3\. **SECURITY GUARDRAIL:** The UI MUST completely omit any editing controls. It is FORBIDDEN to render "Save", "Edit", or "Delete" buttons in this component tree. The Investor is strictly a Viewer.

---

## **5\. State & Logic Strategies**

The application MUST strictly separate Server State (remote data) from Client State (local UI behavior).

### **Server State (React Query)**

The system MUST use @tanstack/react-query to manage all asynchronous data fetching, caching, and background synchronizations. Developers are FORBIDDEN from using useEffect for data fetching.

**Required Query Key Topology:**

* \['searcherDashboard', workspaceId\]  
* \['universe', workspaceId, { page, filters }\] (MUST invalidate when a target converts to a deal).  
* \['pipeline', workspaceId\]  
* \['dealWorkspace', dealId\]  
* \['investorFeed', workspaceId, { filters }\]

### **Global Client State (Zustand)**

Global state MUST be strictly limited to UI orchestration. **Domain data (e.g., Deals, Contacts) is strictly FORBIDDEN in the global store.**

* useSidebarStore: Manages { isOpen: boolean } across layouts.  
* useExtractionLayoutStore: Manages the split-screen ratio { panelWidth: number } for the AI Document Viewer.

### **Complex Local State: AI Extraction Flow (Behavioral Requirements)**

The Human-in-the-Loop OCR validation is the most complex client-side interaction. It MUST be modeled as a strict state machine to prevent implicit bugs (e.g., submitting while extracting).

* **States:** 1\. IDLE: Document uploaded, waiting for user trigger.  
  2\. EXTRACTING: Polling the backend AI microservice. UI displays a skeleton/progress indicator.  
  3\. REVIEWING: AI payload mapped to the form. User is manually correcting bounding-box values.  
  4\. SAVING: User submits. saveFinancialExtractionAction is inflight.  
  5\. SUCCESS: Data saved. Redirects to Deal Workspace.  
* **Behavioral Rules:** \* Transition from REVIEWING to SAVING MUST only occur if Zod schema validates the form.  
  * If SAVING fails, the state MUST revert to REVIEWING and display a localized error banner. Loss of human-corrected input is unacceptable.

---

## **6\. Reusable UI Library (shadcn/ui \+ Tailwind)**

Based on the Atomic Design methodology and UX Spec, the team MUST implement the following "Dumb" UI components. These components MUST NOT contain data fetching logic.

* **Atoms:**  
  * \<VisibilityBadge /\>: Accepts tier: 'TIER\_1\_PRIVATE' | 'TIER\_2\_SHARED'. Renders a gray Lock icon or a green Globe icon.  
  * \<StagePill /\>: Accepts stage: DealStage. Renders color-coded backgrounds based on pipeline progression.  
* **Molecules:**  
  * \<DealCard /\>: Base card used in both the Searcher Kanban and Investor Feed. Accepts a generic data prop and children for actions.  
  * \<MetricCard /\>: Displays a label, a large numeric value, and a trend indicator (e.g., "+12% this month").  
* **Organisms:**  
  * \<DataTable /\>: A wrapper around @tanstack/react-table supporting dynamic columns, server-side pagination, and row-selection.  
  * \<PDFBoundingBoxViewer /\>: A custom integration (e.g., react-pdf) capable of drawing absolute-positioned highlight boxes based on the OCR boundingBox coordinates provided in the API Contract.

---

## **7\. Security & Middleware**

Ceeq operates under strict NDAs and privacy firewalls. Security is not an afterthought; it is structurally enforced at the edge and data layers.

### **Authentication & Routing (Edge Middleware)**

* **Strategy:** The system MUST use NextAuth.js (Auth.js) configured with a secure JWT strategy.  
* **Middleware Execution:** middleware.ts MUST intercept all requests to protected routes.  
  * If a user lacking a session attempts to access /(searcher|investor)/\*, redirect to /login.  
  * If a user with a SEARCHER workspace type attempts to access /investor/\*, immediately throw a 403 Forbidden or redirect to /searcher/dashboard.

### **Row Level Security (RLS) & Authorization Logic**

* **Tenant Isolation:** Every Server Action MUST extract the workspaceId from the secure session (not from client payload) and append it to the Prisma query (where: { workspaceId: session.workspaceId }).  
* **The Privacy Firewall (Tier 1 vs Tier 2):** \* When an Investor requests data (e.g., getInvestorDealFeed), the backend query MUST explicitly filter: where: { visibilityTier: 'TIER\_2\_SHARED' }.  
  * Documents mapped to a Deal MUST NOT be returned to an Investor unless both the Deal is TIER\_2\_SHARED AND the Document's isVisibleToInvestors flag is explicitly true.

---

## **8\. Testing & Validation Strategy**

To support strict Test-Driven Development (TDD) protocols, the following taxonomy and tooling MUST be adopted.

### **Tooling Stack**

* **Unit & Integration:** Vitest (Lightning fast, native ESM/TypeScript support).  
* **Component Testing:** React Testing Library (RTL).  
* **End-to-End (E2E):** Playwright (For critical user journeys).

### **Test Taxonomy & Boundaries**

1. **Server Actions (Integration):** These are the most critical tests. Every Server Action MUST have a Vitest suite that runs against a containerized PostgreSQL test database. They MUST verify Zod payload rejection, successful database writes, and Tenant Isolation (e.g., asserting User A cannot delete User B's deal).  
2. **UI Molecules (Component/RTL):** Complex dumb components (like \<KanbanBoardWrapper /\> or \<ExtractionForm /\>) MUST be tested for interaction states (e.g., clicking "Verify" triggers the onSubmit callback with the correct data shape).  
3. **Critical Flows (E2E):** Playwright MUST cover the three core loops:  
   * Onboarding & Role Selection.  
   * Searcher: Converting a target to a deal, upgrading it to Tier 2, and uploading a document.  
   * Investor: Viewing the Tier 2 deal in the feed and opening the Deal Drawer.

### **Mocking & Fixture Strategy**

* **Mock Service Worker (MSW):** MUST be used to intercept and mock the external OpenAI/OCR API calls during testing to prevent flaky tests and unnecessary API costs.  
* **Fixtures:** A tests/\_\_fixtures\_\_/ directory MUST contain builder functions for generating valid DTOs (e.g., buildMockKanbanDealDTO()) to be used across unit and component tests.

---

