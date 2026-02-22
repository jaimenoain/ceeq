# **Ceeq: UX and Design Spec**

---

### **1\. Global Identity & Role Selection (/login, /onboarding) Specification**

#### **1\. The Mental Model**

This flow acts as a secure, frictionless "split in the road." Because Ceeq serves two distinct user types (Searchers and Investors) with entirely different data privacy rules and UI layouts, the user must make an irreversible declaration of their identity immediately after authenticating. The mental model is a standard B2B SaaS authentication gate, followed by a streamlined wizard.

#### **2\. The User Journey (Step-by-Step)**

1. User arrives at /login.  
2. User selects an OAuth provider (Google/Microsoft) or enters Email/Password.  
3. **If returning user:** The system generates a session and routes them to their respective OS (/searcher/dashboard or /investor/dashboard).  
4. **If new user:** The system redirects to /onboarding/role-selection.  
5. User is forced to select a WorkspaceType (Searcher vs. Investor). A warning indicates this is irreversible.  
6. User proceeds to the Profile step to input their Name, Entity/Fund Name, and LinkedIn URL.  
7. User clicks "Complete Profile" and is routed to their new Workspace.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

*(Desktop View: 50/50 Split Screen. Left side is branding/social proof, right side is the interactive form)*

Plaintext

\+-------------------------+---------------------------------------+  
| \[Brand Area\]            |               \[Logo\]                  |  
|                         |                                       |  
| "Streamline your        |  Welcome to Ceeq              |  
| acquisition pipeline."  |  Log in to your account               |  
|                         |                                       |  
|                         |  \[ Continue with Google   \]           |  
|                         |  \[ Continue with Microsoft\]           |  
|                         |                                       |  
|                         |  \---- or continue with email \----     |  
|                         |                                       |  
|                         |  Email Address                        |  
|                         |  \[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]                  |  
|                         |  \[ Sign In With Email     \]           |  
\+-------------------------+---------------------------------------+

**B. The Component Tree (The "Blueprints")**

*(For the /onboarding Role Selection & Profile step)*

Plaintext

PageWrapper (h-screen, w-full, flex, bg-slate-50)  
  ├─ LeftBrandingPanel (w-1/2, hidden lg:flex, bg-slate-900, text-white)  
  │    └─ TestimonialCarousel (delay=5000)  
  └─ RightAuthPanel (w-full lg:w-1/2, flex-col, items-center, justify-center)  
       └─ Card (w-full, max-w-md, border-none lg:border-solid, shadow-none lg:shadow-sm)  
            ├─ CardHeader  
            │    ├─ CardTitle (text-2xl, font-semibold, tracking-tight)  
            │    └─ CardDescription (text-slate-500)  
            └─ CardContent  
                 └─ Form (onSubmit=handleOnboarding)  
                      ├─ Step 1: Role Selection (conditional rendering)  
                      │    └─ RadioGroup (grid, grid-cols-2, gap-4) \<- Mapped to \-\> Workspace.workspaceType  
                      │         ├─ Label (cursor-pointer, border-slate-200, hover:bg-slate-50)  
                      │         │    ├─ BuildingIcon (Lucide)  
                      │         │    ├─ RadioGroupItem (value="SEARCHER")  
                      │         │    └─ Text ("Searcher / Operator")  
                      │         └─ Label (cursor-pointer, border-slate-200, hover:bg-slate-50)  
                      │              ├─ LandmarkIcon (Lucide)  
                      │              ├─ RadioGroupItem (value="INVESTOR")  
                      │              └─ Text ("Investor / Fund")  
                      │  
                      ├─ Step 2: Profile Data (conditional rendering)  
                      │    ├─ FormItem  
                      │    │    ├─ FormLabel ("First Name")  
                      │    │    └─ Input (type="text") \<- Mapped to \-\> User.firstName  
                      │    ├─ FormItem  
                      │    │    ├─ FormLabel ("Last Name")  
                      │    │    └─ Input (type="text") \<- Mapped to \-\> User.lastName  
                      │    ├─ FormItem  
                      │    │    ├─ FormLabel ("Entity / Fund Name")  
                      │    │    └─ Input (type="text") \<- Mapped to \-\> Workspace.name  
                      │    └─ FormItem  
                      │         ├─ FormLabel ("LinkedIn URL")  
                      │         └─ Input (type="url") \<- Mapped to \-\> User.linkedInUrl  
                      │  
                      └─ CardFooter (mt-6, px-0)  
                           └─ Button (type="submit", variant="default", w-full, bg-slate-900)  
                                └─ Text ("Complete Setup")

*Contract Gap Note:* I assumed User.firstName, User.lastName, and User.linkedInUrl based on the Functional Spec snippet, though they weren't explicitly detailed in the short schema.prisma snippet. The backend must provide these in the onboarding DTO.

#### **4\. Interactive States & Logic (Finite State Machine)**

**State Machine for Onboarding Submission:**

* **State: IDLE** (User is filling out the form).  
* **Event: SUBMIT** (User clicks "Complete Setup").  
* **State: VALIDATING** \-\> Frontend checks if all fields are populated and URL is valid.  
  * *(If Invalid)* \-\> **State: ERROR\_VALIDATION**. Input borders turn border-rose-500. Inline error text appears below the specific Input.  
  * *(If Valid)* \-\> **State: LOADING**.  
* **State: LOADING** \-\> The Button becomes disabled, text changes to "Provisioning Workspace...", and a Lucide Loader2 icon spins inside the button.  
* **State: NETWORK\_RESPONSE**:  
  * *(If API Error 500\)* \-\> **State: ERROR\_NETWORK**. Show destructive Toast component ("Unable to create workspace. Please try again."). Button returns to IDLE.  
  * *(If API Success 200\)* \-\> **State: SUCCESS**. Show success Toast. Trigger Next.js router push() to /searcher/dashboard or /investor/dashboard based on the selected enum.

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| Auth.Login.Title | Welcome to Ceeq |
| Auth.Login.Subtitle | Log in to your account to continue |
| Onboarding.Role.Title | Choose your path |
| Onboarding.Role.Subtitle | Select how you will use Ceeq. **This choice cannot be changed later.** |
| Onboarding.Profile.Title | Complete your profile |
| Onboarding.Profile.Subtitle | Tell us a bit about yourself to set up your workspace. |
| Error.RoleSelection | Please select a role to continue. |
| Error.InvalidURL | Please enter a valid LinkedIn URL (e.g., [https://linkedin.com/in/](https://www.google.com/search?q=https://linkedin.com/in/)...). |
| Toast.Success | Workspace provisioned successfully. Redirecting... |

---

### **2\. Searcher Dashboard Specification**

#### **1\. The Mental Model**

The Searcher Dashboard is the "Mission Control" for the acquisition process. It acts as an aggregator of pipeline health and an inbox for daily operations. The user should perceive this screen as a high-level pulse check: *How many targets are we engaging, how many deals are active, and what needs my attention right now?* It is read-only at the top level, designed to route the user into deeper workflows (like the Kanban board or Sourcing grid).

#### **2\. The User Journey (Step-by-Step)**

1. User logs in and is automatically routed to /searcher/dashboard.  
2. The global Sidebar is visible on the left, anchoring the navigation.  
3. The user quickly scans the top-row Metric Cards to assess funnel conversion (Sourced \-\> Engaged \-\> Active Deals \-\> LOIs).  
4. The user reviews the "Recent Active Deals" table to see the latest status changes or newly signed NDAs.  
5. The user clicks on a specific Deal row, navigating them directly to the Deal Detail view.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+---------+-------------------------------------------------------------+

| Sidebar | Dashboard                                        \[Upgrade\]  |

|         |                                                             |

| \[Home\]  | \+-----------+ \+-----------+ \+-----------+ \+---------------+ |

| \[Univ.\] | | Sourced   | | Engaged   | | Act. Deals| | LOIs Issued   | |

| \[Deals\] | | 4,201     | | 312       | | 14        | | 2             | |

| \[Docs\]  | \+-----------+ \+-----------+ \+-----------+ \+---------------+ |

|         |                                                             |

|         | Active Pipeline Overview                                    |

|         | \+---------------------------------------------------------+ |

|         | | Company       | Stage       | Tier      | Last Active   | |

|         | |---------------+-------------+-----------+---------------| |

|         | | Acme Corp     | CIM Review  | Tier 1    | 2 hours ago   | |

|         | | Delta Ind.    | LOI Issued  | Tier 2    | 1 day ago     | |

|         | | Echo Tech     | NDA Signed  | Tier 1    | 3 days ago    | |

|         | \+---------------------------------------------------------+ |

\+---------+-------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayout (flex, h-screen, bg-slate-50, overflow-hidden)

  ├─ Sidebar (w-64, flex-col, border-r, border-slate-200, bg-white, hidden md:flex)

  │    └─ SidebarNav (links to /dashboard, /universe, /pipeline, etc.)

  └─ MainContent (flex-1, flex-col, overflow-y-auto)

       ├─ Topbar (h-16, flex, items-center, justify-between, px-8, border-b, bg-white)

       │    ├─ PageTitle (text-xl, font-semibold, text-slate-900)

       │    └─ SubscriptionBadge (conditional rendering if FREE)

       │         └─ Button (variant="outline", size="sm") \<- Mapped to \-\> Workspace.subscriptionPlan

       │              └─ Text ("Upgrade to Pro")

       └─ PageContainer (p-8, max-w-7xl, mx-auto, w-full, flex-col, gap-8)

            ├─ MetricsGrid (grid, grid-cols-1 md:grid-cols-2 lg:grid-cols-4, gap-4)

            │    ├─ Card (bg-white, shadow-sm)

            │    │    ├─ CardHeader (flex-row, items-center, justify-between, pb-2)

            │    │    │    ├─ CardTitle (text-sm, font-medium, text-slate-500)

            │    │    │    └─ GlobeIcon (Lucide, text-slate-400)

            │    │    └─ CardContent

            │    │         └─ Text (text-2xl, font-bold) \<- Mapped to \-\> Count(SourcingTarget)

            │    ├─ Card (bg-white, shadow-sm)

            │    │    ├─ CardHeader...

            │    │    └─ CardContent \-\> Text \<- Mapped to \-\> Count(SourcingTarget where status=IN\_SEQUENCE)

            │    ├─ Card (bg-white, shadow-sm)

            │    │    ├─ CardHeader...

            │    │    └─ CardContent \-\> Text \<- Mapped to \-\> Count(Deal where status=ACTIVE)

            │    └─ Card (bg-white, shadow-sm)

            │         ├─ CardHeader...

            │         └─ CardContent \-\> Text \<- Mapped to \-\> Count(Deal where stage=LOI\_ISSUED)

            │

            └─ DealsSection (flex-col, gap-4)

                 ├─ SectionHeader (flex, justify-between, items-end)

                 │    ├─ Title (text-lg, font-semibold)

                 │    └─ Button (variant="ghost", size="sm", text-slate-500)

                 │         └─ Text ("View Pipeline \-\>")

                 └─ Card (bg-white, shadow-sm, overflow-hidden)

                      └─ Table (w-full)

                           ├─ TableHeader (bg-slate-50/50)

                           │    └─ TableRow

                           │         ├─ TableHead ("Company")

                           │         ├─ TableHead ("Stage")

                           │         ├─ TableHead ("Visibility")

                           │         └─ TableHead ("Last Updated")

                           └─ TableBody

                                └─ TableRow (hover:bg-slate-50, cursor-pointer) \<- Mapped to \-\> Array\[Deal\]

                                     ├─ TableCell (font-medium, text-slate-900) \<- Mapped to \-\> Deal.Company.name

                                     ├─ TableCell

                                     │    └─ Badge (variant="secondary") \<- Mapped to \-\> Deal.stage

                                     ├─ TableCell

                                     │    └─ Badge (variant="outline") \<- Mapped to \-\> Deal.visibilityTier

                                     └─ TableCell (text-slate-500, text-sm) \<- Mapped to \-\> Deal.updatedAt (Relative time format)

*Contract Gap Note:* I am inferring a SourcingTarget or similar entity for the top-of-funnel metrics based on the Domain Model's mention of createSourcingTargets() and the SourcingStatus enum. The API DTO for the dashboard must aggregate these counts.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: INITIAL\_LOAD** \-\> Fetching Dashboard DTO from API.  
  * **UI Representation:** Render AppLayout and Sidebar. Main content area displays Skeleton components mirroring the MetricsGrid and Table structure.  
* **State: LOADED\_EMPTY** \-\> API returns 200, but counts are 0 and Deals array is empty.  
  * **UI Representation:** Metrics display "0". The TableBody is replaced by an EmptyState component: a light grey background inside the Card, a large Telescope icon, and text "Your pipeline is empty. Start sourcing targets in the Universe to build your deal flow." Action button: "Go to Universe."  
* **State: LOADED\_DATA** \-\> API returns populated DTO. Normal rendering as per the Component Tree.  
* **State: ERROR\_FETCH** \-\> API returns 500 or timeout.  
  * **UI Representation:** Replace PageContainer with an ErrorState component. "Unable to load dashboard metrics. \[Retry Button\]."  
* **Interaction Logic (Row Click):** Clicking a TableRow in the Active Deals list triggers Next.js router push( /searcher/pipeline/deal/${deal.id} ).

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| Dashboard.Title | Overview |
| Dashboard.Badge.Upgrade | Upgrade to Pro |
| Metric.Sourced.Title | Total Universe Sourced |
| Metric.Engaged.Title | Engaged (In Sequence) |
| Metric.Active.Title | Active Deals |
| Metric.LOI.Title | LOIs Issued |
| Table.Title | Active Pipeline Overview |
| Table.Action.ViewAll | View Pipeline \-\> |
| EmptyState.Table.Title | No active deals yet |
| EmptyState.Table.Body | Your pipeline is currently empty. Head over to the Sourcing Universe to find and engage potential acquisition targets. |
| Error.DashboardLoad | We couldn't load your dashboard data. Please try again. |

---

### **3\. Sourcing "Universe" Data Grid Specification**

#### **1\. The Mental Model**

The "Universe" is essentially a highly optimized, opinionated spreadsheet. The user's mental model is one of **triaging and filtering noise to find the signal**. It requires rapid keyboard navigation, bulk actions, and dense data presentation. It is distinctly separate from the CRM (Pipeline); companies here are merely *targets* until they are qualified and "Converted" into active Deals.

#### **2\. The User Journey (Step-by-Step)**

1. User navigates to /searcher/universe via the Sidebar.  
2. The screen loads a paginated grid of thousands of SourcingTarget records.  
3. User applies complex filters (e.g., "Status \= UNTOUCHED", "Industry \= Manufacturing", "Revenue \> $5M").  
4. User selects multiple rows using the leftmost checkboxes.  
5. A "Bulk Action" bar slides into view.  
6. User clicks "Add to Sequence" to begin automated outreach, which updates the target's SourcingStatus to IN\_SEQUENCE.  
7. Alternatively, if a target replies positively, the user clicks the row action "Convert to Deal," moving it out of the Universe and into the Deal Pipeline.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+---------+-------------------------------------------------------------+

| Sidebar | Sourcing Universe                              \[Import CSV\] |

|         |                                                             |

| \[Home\]  | \[ Search Companies... \] \[ Status Filter v \] \[ Industry v \]  |

| \[Univ.\] |                                                             |

| \[Deals\] | \[x\] 3 selected  |  \[ Add to Sequence \] \[ Archive Targets \]  |

| \[Docs\]  | \+---------------------------------------------------------+ |

|         | | \[ \] | Company     | Domain       | Status       | Added | |

|         | |-----+-------------+--------------+--------------+-------| |

|         | | \[x\] | Alpha Mfg   | alpha.co     | Untouched    | 2d    | |

|         | | \[x\] | Beta Co     | beta.io      | In Sequence  | 5d    | |

|         | | \[x\] | Gamma Ind   | gamma.net    | Untouched    | 1w    | |

|         | | \[ \] | Delta LLC   | delta.com    | Replied      | 2w    | |

|         | \+---------------------------------------------------------+ |

|         |                  \< Previous | Page 1 of 50 | Next \>         |

\+---------+-------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayout (flex, h-screen, bg-slate-50, overflow-hidden)

  ├─ Sidebar (persistent)

  └─ MainContent (flex-1, flex-col, overflow-y-hidden)

       ├─ PageHeader (h-16, flex, items-center, justify-between, px-8, bg-white, border-b)

       │    ├─ TitleGroup (flex, items-center, gap-2)

       │    │    └─ PageTitle (text-xl, font-semibold)

       │    └─ ActionGroup (flex, gap-2)

       │         └─ Button (variant="outline", size="sm") 

       │              ├─ UploadIcon (Lucide)

       │              └─ Text ("Import CSV")

       └─ PageContainer (flex-1, flex-col, p-8, w-full, overflow-hidden)

            ├─ DataTableToolbar (flex, items-center, justify-between, pb-4)

            │    ├─ FilterGroup (flex, gap-2, flex-1)

            │    │    ├─ Input (placeholder="Search companies...", w-72) \<- Mapped to \-\> API Query Param: search

            │    │    ├─ Select (placeholder="Status") \<- Mapped to \-\> API Query Param: status (SourcingStatus Enum)

            │    │    │    └─ SelectContent \-\> SelectItems (UNTOUCHED, IN\_SEQUENCE, REPLIED, etc.)

            │    │    └─ Select (placeholder="Industry") \<- Mapped to \-\> API Query Param: industry

            │    └─ ViewOptions (flex, gap-2)

            │         └─ DropdownMenu (trigger: Button variant="outline") \-\> Toggle columns visibility

            │

            ├─ BulkActionBar (absolute, top-24, left-1/2, \-translate-x-1/2, bg-slate-900, text-white, rounded-full, px-4, py-2, flex, items-center, gap-4, z-50) \<- Renders ONLY if SelectedRows.length \> 0

            │    ├─ Text (text-sm, font-medium) \<- Mapped to \-\> "{SelectedRows.length} selected"

            │    ├─ Separator (orientation="vertical", h-4, bg-slate-700)

            │    ├─ Button (variant="ghost", size="sm", hover:bg-slate-800) \-\> Text ("Add to Sequence")

            │    └─ Button (variant="ghost", size="sm", hover:bg-slate-800, text-rose-400) \-\> Text ("Archive")

            │

            ├─ DataTableWrapper (flex-1, overflow-auto, border, border-slate-200, rounded-md, bg-white)

            │    └─ Table (w-full, relative)

            │         ├─ TableHeader (sticky, top-0, bg-slate-50, shadow-sm, z-10)

            │         │    └─ TableRow

            │         │         ├─ TableHead (w-12) \-\> Checkbox (Indeterminate state supported)

            │         │         ├─ TableHead \-\> Button (variant="ghost") \-\> Text ("Company") & SortIcon

            │         │         ├─ TableHead \-\> Text ("Domain")

            │         │         ├─ TableHead \-\> Text ("Status")

            │         │         ├─ TableHead \-\> Text ("Added")

            │         │         └─ TableHead \-\> Text ("Actions")

            │         └─ TableBody

            │              └─ TableRow (hover:bg-slate-50) \<- Mapped to \-\> Array\[SourcingTarget\]

            │                   ├─ TableCell \-\> Checkbox \<- Mapped to \-\> Row Selection State

            │                   ├─ TableCell (font-medium, text-slate-900) \<- Mapped to \-\> SourcingTarget.name

            │                   ├─ TableCell (text-slate-500) \<- Mapped to \-\> SourcingTarget.domain

            │                   ├─ TableCell

            │                   │    └─ Badge \<- Mapped to \-\> SourcingTarget.status

            │                   │         (Variant Logic: UNTOUCHED \= default, IN\_SEQUENCE \= secondary, REPLIED \= success)

            │                   ├─ TableCell (text-slate-500, text-sm) \<- Mapped to \-\> SourcingTarget.createdAt (Relative time format)

            │                   └─ TableCell

            │                        └─ DropdownMenu (trigger: MoreHorizontalIcon)

            │                             ├─ DropdownMenuItem \-\> Text ("View Details")

            │                             ├─ DropdownMenuItem \-\> Text ("Convert to Deal") \-\> Triggers Pipeline migration

            │                             └─ DropdownMenuItem (text-rose-600) \-\> Text ("Archive")

            │

            └─ DataTablePagination (flex, items-center, justify-between, pt-4)

                 ├─ Text (text-sm, text-slate-500) \<- Mapped to \-\> "Showing X to Y of Z rows"

                 └─ PaginationGroup (flex, gap-2)

                      ├─ Button (variant="outline", size="icon", disabled if page=1) \-\> ChevronLeftIcon

                      └─ Button (variant="outline", size="icon", disabled if no next page) \-\> ChevronRightIcon

*Contract Gap Note:* I assumed standard fields like SourcingTarget.name and SourcingTarget.domain. If the API relies exclusively on the hashed domain mechanism mentioned in the functional spec to prevent collisions, the backend DTO must still resolve the display string for the frontend safely.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: FETCHING** \-\> Data is being retrieved based on current filter/pagination state.  
  * *UI:* The TableBody renders 10 Skeleton rows mimicking the table structure to prevent layout shift.  
* **State: IDLE (Data Populated)** \-\> User can browse and interact.  
* **State: FILTERING** \-\> User types in the search input or selects a dropdown.  
  * *Logic:* Triggers a debounce (300ms) \-\> Transitions back to **FETCHING**.  
* **State: BULK\_SELECTED** \-\> User checks one or more row checkboxes.  
  * *UI:* The BulkActionBar animates in (slide up \+ fade).  
* **Event: CONVERT\_TO\_DEAL** \-\> User clicks "Convert to Deal" on a row.  
  * *Logic:* **State: MUTATING** \-\> Trigger API call POST /api/deals using target data.  
  * *(If Success)* \-\> Show Success Toast. Remove row from local state (optimistic UI update).  
  * *(If Collision/Hash Match Error)* \-\> **State: ERROR\_COLLISION**. Show Destructive Toast: "This domain is already tracked in your or another pipeline under NDA."  
* **Empty State:** If filters return zero results, TableBody displays an empty state container: "No targets found matching your filters. \[Clear Filters Button\]".

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| Universe.Header.Title | Sourcing Universe |
| Universe.Action.Import | Import CSV |
| Filter.Search.Placeholder | Search companies or domains... |
| BulkAction.Sequence | Add to Sequence |
| BulkAction.Archive | Archive Targets |
| Badge.Status.Untouched | Untouched |
| Badge.Status.InSequence | In Sequence |
| Badge.Status.Replied | Replied |
| RowAction.ConvertToDeal | Convert to Deal |
| Toast.Success.Converted | Successfully converted to a Deal. |
| Toast.Error.Collision | Cannot convert: Domain hash collision detected. Target already protected under NDA. |
| EmptyState.Filters | No targets found. Try adjusting your search criteria. |

---

### **4\. Deal Pipeline (Kanban CRM) Specification**

#### **1\. The Mental Model**

The Pipeline is a spatial, tactile representation of the acquisition funnel. The user's mental model is based on "momentum" and "progression." They are physically moving a company through the stages of a deal. Because this view contains mixed data (both private Tier 1 deals and shared Tier 2 deals), the UI must make the privacy status of each card immediately obvious at a glance to prevent accidental disclosure during screen-sharing or analyst reviews.

#### **2\. The User Journey (Step-by-Step)**

1. User navigates to /searcher/pipeline via the Sidebar.  
2. The screen loads a horizontally scrolling board with columns strictly mapped to the DealStage enum.  
3. User scans the board to assess bottlenecks (e.g., "Why do we have 10 deals in CIM Review and 0 LOIs?").  
4. User clicks and holds a Deal Card in the "NDA Signed" column, dragging it over to the "CIM Review" column.  
5. Upon dropping the card, the UI instantly reflects the new state (optimistic update), while a background API call updates the Deal.stage in the database.  
6. User clicks directly on a Deal Card to open the detailed Workspace for that specific deal.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+---------+-------------------------------------------------------------+

| Sidebar | Pipeline                                  \[ \+ New Deal \]    |

|         |                                                             |

| \[Home\]  | Filters: \[ All Tiers v \] \[ Active Deals v \]                 |

| \[Univ.\] | \+----------------+ \+----------------+ \+-------------------+ |

| \[Deals\] | | INBOX (2)      | | NDA SIGNED (1) | | CIM REVIEW (3)    | |

| \[Docs\]  | \+----------------+ \+----------------+ \+-------------------+ |

|         | | \+------------+ | | \+------------+ | | \+---------------+ | |

|         | | | Alpha Mfg  | | | | Beta Co    | | | | Delta LLC     | | |

|         | | | Tier 1     | | | | Tier 2     | | | | Tier 1        | | |

|         | | | 2 days ago | | | | 5 hrs ago  | | | | 1 week ago    | | |

|         | | \+------------+ | | \+------------+ | | \+---------------+ | |

|         | | \+------------+ | |                | |                   | |

|         | | | Gamma Ind  | | |                | |                   | |

|         | | | Tier 2     | | |                | |                   | |

|         | | | 1 hr ago   | | |                | |                   | |

|         | | \+------------+ | |                | |                   | |

|         | \+----------------+ \+----------------+ \+-------------------+ |

\+---------+-------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayout (flex, h-screen, bg-slate-50, overflow-hidden)

  ├─ Sidebar (persistent)

  └─ MainContent (flex-1, flex-col, h-full)

       ├─ PageHeader (h-16, flex, items-center, justify-between, px-8, bg-white, border-b, shrink-0)

       │    ├─ TitleGroup

       │    │    └─ PageTitle (text-xl, font-semibold)

       │    └─ ActionGroup

       │         └─ Button (variant="default", size="sm", bg-slate-900)

       │              ├─ PlusIcon

       │              └─ Text ("Manual Deal Entry")

       │

       ├─ PipelineToolbar (px-8, py-4, flex, gap-4, border-b, bg-white, shrink-0)

       │    ├─ Select \<- Mapped to \-\> Filter: visibilityTier (TIER\_1\_PRIVATE, TIER\_2\_SHARED)

       │    └─ Select \<- Mapped to \-\> Filter: status (ACTIVE, ARCHIVED, LOST)

       │

       └─ KanbanBoardWrapper (flex-1, overflow-x-auto, overflow-y-hidden, p-8)

            └─ DragDropContext (Dnd-kit or React-Beautiful-DnD wrapper)

                 └─ BoardGrid (flex, gap-6, h-full, min-w-max)

                      ├─ KanbanColumn (w-80, flex-col, h-full, bg-slate-100/50, rounded-lg) \<- Mapped to \-\> DealStage.INBOX

                      │    ├─ ColumnHeader (p-3, flex, justify-between, items-center)

                      │    │    ├─ Title (text-sm, font-semibold, text-slate-700) \-\> "Inbox"

                      │    │    └─ Badge (variant="secondary") \<- Mapped to \-\> Count(Deals in INBOX)

                      │    └─ DroppableArea (flex-1, p-3, overflow-y-auto, flex-col, gap-3)

                      │         └─ DraggableCard (bg-white, border, rounded-md, shadow-sm, cursor-grab) \<- Mapped to \-\> Array\[Deal\]

                      │              ├─ CardHeader (p-3, pb-0, flex, justify-between, items-start)

                      │              │    ├─ Text (font-medium, text-slate-900) \<- Mapped to \-\> Deal.Company.name

                      │              │    └─ DropdownMenu (trigger: MoreVerticalIcon) \-\> Actions (Archive, Delete)

                      │              └─ CardContent (p-3, pt-2, flex-col, gap-2)

                      │                   ├─ PrivacyBadge (conditional styling) \<- Mapped to \-\> Deal.visibilityTier

                      │                   │    (TIER\_1\_PRIVATE \= default/slate, TIER\_2\_SHARED \= emerald 'Shared')

                      │                   └─ FooterMetadata (flex, justify-between, items-center, mt-2)

                      │                        ├─ Text (text-xs, text-slate-500) \<- Mapped to \-\> Deal.updatedAt

                      │                        └─ AvatarGroup (size="sm") \<- Mapped to \-\> Deal.assignedAnalysts

                      │

                      ├─ KanbanColumn \<- Mapped to \-\> DealStage.NDA\_SIGNED

                      ├─ KanbanColumn \<- Mapped to \-\> DealStage.CIM\_REVIEW

                      ├─ KanbanColumn \<- Mapped to \-\> DealStage.LOI\_ISSUED

                      ├─ KanbanColumn \<- Mapped to \-\> DealStage.DUE\_DILIGENCE

                      └─ KanbanColumn \<- Mapped to \-\> DealStage.CLOSED\_WON

*Contract Gap Note:* I added an assignedAnalysts visual element (Avatars). The Functional Spec mentions "team management" and "editing by multiple Searcher Analysts", but the provided Domain Model snippet didn't explicitly show the many-to-many relationship table between Deal and User. The API will need to provide the assigned user's avatar/initials in the DTO for this to render.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: FETCHING** \-\> Initial load. Columns render with Skeleton cards.  
* **State: IDLE** \-\> Data loaded, board ready for interaction.  
* **State: DRAGGING** \-\> User clicks and drags a DraggableCard.  
  * *UI:* The dragged card receives a prominent shadow-lg and slight rotation (e.g., rotate-2). The DroppableArea being hovered over highlights slightly (bg-slate-200/50).  
* **Event: DROP** \-\> User releases the card over a new column.  
  * *Logic:* **State: MUTATING**. The UI updates instantly (Optimistic UI) placing the card in the new column and updating the column counts. A PATCH /api/deals/{id} request is fired to update Deal.stage.  
  * *(If API Success 200\)* \-\> Silent success. State returns to **IDLE**.  
  * *(If API Fail 500/Timeout)* \-\> **State: ERROR\_ROLLBACK**. The card snaps back to its original column. A destructive Toast appears: "Failed to update deal stage. Please check your connection."  
* **Column Empty State:** If a column has no deals, the DroppableArea displays a dashed border outline and subtle text: "Drop deals here".

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| Pipeline.Header.Title | Deal Pipeline |
| Pipeline.Action.NewDeal | Manual Deal Entry |
| Column.INBOX | Inbox |
| Column.NDA\_SIGNED | NDA Signed |
| Column.CIM\_REVIEW | CIM Review |
| Column.LOI\_ISSUED | LOI Issued |
| Column.DUE\_DILIGENCE | Due Diligence |
| Column.CLOSED\_WON | Closed / Won |
| Badge.Tier1 | Tier 1 (Private) |
| Badge.Tier2 | Tier 2 (Shared) |
| Toast.Error.DragDrop | Failed to move deal. The change has been reverted. |

---

### **5\. Deal Detail & Workspace Specification**

#### **1\. The Mental Model**

The mental model here is a **secure, centralized dossier**. The Searcher must feel absolute confidence in the privacy controls. Because a single click dictates whether an Investor can see this deal (Tier 2\) or if it remains strictly confidential (Tier 1), the UI must make the current visibility state the most prominent element on the screen. The layout is structured as a hub-and-spoke, using Tabs to organize deep data (Documents, Financials) without overwhelming the initial Overview.

#### **2\. The User Journey (Step-by-Step)**

1. User clicks a Deal card in the Pipeline and lands on /searcher/pipeline/deal/{id}.  
2. The Header clearly displays the Company Name, current DealStage, and a prominent VisibilityTier toggle.  
3. User reviews the "Overview" tab, showing company firmographics and recent activity.  
4. User switches to the "Documents" tab to upload a new CIM (Confidential Information Memorandum).  
5. User toggles the specific document's visibility to "Shared" (allowing Investors to view it, assuming the Deal itself is Tier 2).  
6. User decides to share the deal with their Investor network by clicking the "Upgrade to Tier 2 (Shared)" button in the header, triggering a confirmation modal.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+---------+-------------------------------------------------------------+

| Sidebar | \< Back to Pipeline                                          |

|         | \=========================================================== |

| \[Home\]  |  Acme Logistics               \[ Stage: CIM Review v \]       |

| \[Univ.\] |  acme.com                     \[ TIER 1 (PRIVATE) Toggle \]   |

| \[Deals\] | \=========================================================== |

| \[Docs\]  |  \[ Overview \]  \[ Documents (4) \]  \[ Financials \]            |

|         |                                                             |

|         |  \+--------------------------+ \+---------------------------+ |

|         |  | Company Details      \[E\] | | Activity Feed             | |

|         |  | Industry: Logistics      | |                           | |

|         |  | HQ: Chicago, IL          | | \* Jules uploaded CIM.pdf  | |

|         |  | Employees: 150           | | \* Moved to CIM Review     | |

|         |  \+--------------------------+ | \* Deal created            | |

|         |  \+--------------------------+ |                           | |

|         |  | AI P\&L Summary           | |                           | |

|         |  | Rev: $12.5M  Margin: 40% | | \[ Input: Add Note... \]    | |

|         |  \+--------------------------+ \+---------------------------+ |

\+---------+-------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayout (flex, h-screen, bg-slate-50, overflow-hidden)

  ├─ Sidebar (persistent)

  └─ MainContent (flex-1, flex-col, overflow-y-auto)

       ├─ BreadcrumbNav (px-8, py-4, text-sm, text-slate-500)

       │    └─ Link (href="/searcher/pipeline") \-\> Text ("\< Back to Pipeline")

       │

       ├─ DealHeader (px-8, py-6, bg-white, border-b, flex, justify-between, items-start)

       │    ├─ TitleGroup (flex-col, gap-1)

       │    │    ├─ PageTitle (text-3xl, font-bold, text-slate-900) \<- Mapped to \-\> Deal.Company.name

       │    │    └─ Link (text-sm, text-blue-600, hover:underline) \<- Mapped to \-\> Deal.Company.domain

       │    └─ ControlGroup (flex, gap-4, items-center)

       │         ├─ Select \<- Mapped to \-\> Deal.stage

       │         │    └─ SelectTrigger \-\> Value (e.g., "CIM Review")

       │         └─ Card (bg-slate-50, border, p-1, rounded-lg, flex, items-center, gap-2)

       │              ├─ Badge (variant dynamically mapped) \<- Mapped to \-\> Deal.visibilityTier

       │              │    (If TIER\_1\_PRIVATE \-\> variant="secondary", text="Tier 1: Private")

       │              │    (If TIER\_2\_SHARED \-\> variant="default", bg-emerald-600, text="Tier 2: Shared")

       │              └─ Button (variant="ghost", size="sm") \-\> Text ("Change") \-\> Triggers VisibilityModal

       │

       └─ DealWorkspace (px-8, py-6, max-w-7xl, mx-auto, w-full)

            └─ Tabs (defaultValue="overview", w-full)

                 ├─ TabsList (grid, w-full max-w-md, grid-cols-3)

                 │    ├─ TabsTrigger (value="overview") \-\> Text ("Overview")

                 │    ├─ TabsTrigger (value="documents") \-\> Text ("Documents")

                 │    └─ TabsTrigger (value="financials") \-\> Text ("Financials (AI)")

                 │

                 ├─ TabsContent (value="overview", mt-6, grid, grid-cols-1 md:grid-cols-3, gap-6)

                 │    ├─ LeftColumn (col-span-2, flex-col, gap-6)

                 │    │    ├─ Card (shadow-sm) \-\> Company Firmographics

                 │    │    │    ├─ CardHeader \-\> CardTitle ("Company Details")

                 │    │    │    └─ CardContent \-\> DataList (Industry, HQ, Employee Count) \<- Mapped to \-\> Deal.Company.\*

                 │    │    └─ Card (shadow-sm) \-\> Quick Financials 

                 │    │         ├─ CardHeader \-\> CardTitle ("Latest Extracted Metrics")

                 │    │         └─ CardContent \-\> MetricsGrid (Revenue, Gross Margin, EBITDA) \<- Mapped to \-\> OCR Output DB Table

                 │    │

                 │    └─ RightColumn (col-span-1)

                 │         └─ Card (shadow-sm, h-full)

                 │              ├─ CardHeader \-\> CardTitle ("Activity Feed")

                 │              └─ CardContent (flex-col, gap-4)

                 │                   ├─ ScrollArea (h-96)

                 │                   │    └─ FeedItem (flex, gap-3) \<- Mapped to \-\> Array\[ActivityLog\]

                 │                   │         ├─ Avatar (size="sm")

                 │                   │         └─ TextBlock (Action description \+ Relative Time)

                 │                   └─ Textarea (placeholder="Leave a note...")

                 │

                 ├─ TabsContent (value="documents")

                 │    └─ DocumentManager (DataTable of associated PDFs/Excel with per-document visibility toggles)

                 │

                 └─ TabsContent (value="financials")

                      └─ EmptyState \-\> Button ("Launch AI OCR Extraction") \-\> Routes to Split-Screen OCR View

*Contract Gap Note:* The exact firmographic fields (HQ, Industry, Employees) are assumed here. The DTO must extend the base Company model to include these enriched details, or the UI will only display the name and domain.

#### **4\. Interactive States & Logic (Finite State Machine)**

**State Machine for Toggling Privacy (The Most Critical Action):**

* **State: IDLE** \-\> Deal is TIER\_1\_PRIVATE.  
* **Event: CLICK\_CHANGE\_TIER** \-\> User clicks the "Change" button next to the Tier badge.  
* **State: MODAL\_OPEN** \-\> AlertDialog component mounts.  
  * *Warning UI:* "You are about to move this deal to Tier 2 (Shared). This will alert connected Investor Workspaces and expose the Deal Name, Domain, and public documents. This action cannot be easily undone."  
* **Event: CONFIRM\_UPGRADE** \-\> User types the company name to confirm and clicks "Upgrade to Tier 2".  
* **State: MUTATING** \-\> Trigger PATCH /api/deals/{id} with { visibilityTier: "TIER\_2\_SHARED" }. Button shows loading spinner.  
  * *(If Success)* \-\> **State: SUCCESS**. Close modal. Badge updates to green TIER\_2\_SHARED. Success Toast fires. (Backend asynchronously triggers the SendGrid "New Deal Shared" email debounce logic outlined in the Idea doc).  
  * *(If Error)* \-\> Show Destructive Toast. Keep modal open.

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| Deal.Header.Tier1 | Tier 1 (Private) |
| Deal.Header.Tier2 | Tier 2 (Shared) |
| Deal.Tabs.Overview | Overview |
| Deal.Tabs.Docs | Documents |
| Deal.Tabs.Financials | Financials (AI) |
| Modal.TierUpgrade.Title | Upgrade to Tier 2 (Shared)? |
| Modal.TierUpgrade.Warning | Upgrading this deal will make its sanitized profile and public documents visible to your connected Investors. They will be notified of this change. |
| Toast.Success.TierChanged | Deal visibility updated to Tier 2\. Investors have been notified. |

---

### **6\. AI P\&L Extraction (Split-Screen Validation) Specification**

#### **1\. The Mental Model**

The user must perceive this screen as a **Focused Validation Workspace**. To minimize context switching, we remove the global navigation sidebar entirely. The mental model is an "Audit." The left side represents the *Ground Truth* (the original unstructured document), and the right side represents the *Proposed Structured Data*. The user acts as an editor, cross-referencing the AI's guesses, correcting them, and firmly committing them to the database.

#### **2\. The User Journey (Step-by-Step)**

1. User clicks "Launch AI OCR Extraction" from the Deal Detail's *Financials* tab.  
2. The user is routed to /searcher/pipeline/deal/{id}/extract/{documentId}.  
3. The layout expands to a full-bleed split-screen view. The target PDF loads on the left.  
4. The system triggers the AI extraction prompt via the backend. The right panel shows a skeleton loading state ("Analyzing Financials...").  
5. The extracted fields (Revenue, Gross Margin, EBITDA) populate the right panel.  
6. The user clicks an extracted value. The left-side PDF viewer automatically scrolls to the exact page and highlights the bounding box of the source text.  
7. The user reviews each field, manually correcting any hallucinated numbers.  
8. The user clicks "+ Add Custom Metric" to track a deal-specific data point (e.g., "CapEx" or "Owner Add-backs" leveraging the JSONB database flexibility).  
9. The user clicks "Confirm & Save", permanently writing the structured data to the Deal record and returning to the Deal Detail page.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------+

| \< Back to Deal |  Document: CIM\_2023\_Final.pdf        \[ Confirm & Save\] |

| \======================================================================= |

| \<\< PDF VIEWER PANEL \>\>              | \<\< VALIDATION PANEL \>\>          |

|                                     |                                 |

| ... Financial Highlights ...        | Extracted Metrics (FY2023)      |

| Revenue for 2023 was $12.5M         | \+-----------------------------+ |

| with a gross margin of 40%.         | | Revenue              \[ 98%\] | |

| EBITDA reached $5.0M due to...      | | \[ $12,500,000      \] \[  ✓ \] | |

|                                     | \+-----------------------------+ |

|                                     | \+-----------------------------+ |

|                                     | | Gross Margin         \[ 95%\] | |

|                                     | | \[ 40%              \] \[  ✓ \] | |

|                                     | \+-----------------------------+ |

|                                     | \+-----------------------------+ |

|                                     | | EBITDA               \[ 60%\] | |

|                                     | | \[ $5,000,000       \] \[  ✓ \] | |

|                                     | \+-----------------------------+ |

|                                     |                                 |

| \< Page 14 of 50 \>      \[Zoom \+ \-\]   | \[ \+ Add Custom Metric (JSON) \]  |

\+-----------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayout (flex, flex-col, h-screen, bg-slate-50, overflow-hidden)

  ├─ ExtractionHeader (h-16, flex, items-center, justify-between, px-6, bg-white, border-b, shrink-0)

  │    ├─ LeftGroup (flex, items-center, gap-4)

  │    │    ├─ Button (variant="ghost", size="sm") \-\> Link ("\< Back")

  │    │    ├─ Separator (orientation="vertical", h-6)

  │    │    └─ Text (font-medium, text-slate-900) \<- Mapped to \-\> Document.fileName

  │    └─ RightGroup (flex, items-center, gap-4)

  │         └─ Button (variant="default", bg-slate-900)

  │              ├─ SaveIcon

  │              └─ Text ("Confirm & Save")

  │

  └─ ResizablePanelGroup (direction="horizontal", w-full, flex-1)

       ├─ ResizablePanel (defaultSize=60, minSize=40) \-\> The Ground Truth

       │    └─ PDFViewerContainer (h-full, bg-slate-200/50, flex-col, relative)

       │         ├─ PDFDocument (react-pdf wrapper) \<- Mapped to \-\> Document.fileUrl

       │         │    └─ HighlightOverlay (absolute, mix-blend-multiply, bg-yellow-200) \<- Mapped to \-\> AI\_BoundingBox\_Coordinates

       │         └─ PDFToolbar (absolute, bottom-6, left-1/2, \-translate-x-1/2, flex, gap-2, bg-white, p-1, rounded-full, shadow-md)

       │              ├─ Button (variant="ghost", size="icon") \-\> ZoomOut

       │              ├─ Text \-\> "Page {current} of {total}"

       │              └─ Button (variant="ghost", size="icon") \-\> ZoomIn

       │

       ├─ ResizableHandle (w-2, bg-slate-200, hover:bg-slate-300, cursor-col-resize, transition-colors)

       │

       └─ ResizablePanel (defaultSize=40, minSize=30) \-\> The Validation Form

            └─ ScrollArea (h-full, bg-white, p-6)

                 ├─ PanelHeader (mb-6)

                 │    ├─ Title (text-lg, font-semibold) \-\> "Extracted Metrics"

                 │    └─ Text (text-sm, text-slate-500) \-\> "Review and correct AI findings."

                 │

                 ├─ Form (flex-col, gap-6)

                 │    ├─ ExtractionFieldCard (border, rounded-lg, p-4, flex-col, gap-3) \<- Mapped to \-\> DealFinancials.revenue

                 │    │    ├─ FieldHeader (flex, justify-between)

                 │    │    │    ├─ Label ("Revenue")

                 │    │    │    └─ Badge (variant="outline", text-emerald-600) \<- Mapped to \-\> AI\_ConfidenceScore ("98% Match")

                 │    │    └─ FieldInputGroup (flex, gap-2)

                 │    │         ├─ Input (type="text", flex-1) \<- Mapped to \-\> Extracted Value ($12,500,000)

                 │    │         └─ Button (variant="outline", size="icon", text-slate-400, hover:text-emerald-600) \-\> CheckIcon (Approve)

                 │    │

                 │    ├─ ExtractionFieldCard \<- Mapped to \-\> DealFinancials.grossMargin

                 │    ├─ ExtractionFieldCard \<- Mapped to \-\> DealFinancials.ebitda

                 │    │

                 │    └─ DynamicFieldSection (mt-4, pt-4, border-t)

                 │         ├─ Title (text-sm, font-medium, text-slate-700, mb-4) \-\> "Custom Metrics"

                 │         ├─ CustomFieldList (renders mapped key-value pairs) \<- Mapped to \-\> DealFinancials.customMetrics (JSONB)

                 │         └─ Button (variant="dashed", w-full, text-slate-500)

                 │              ├─ PlusIcon

                 │              └─ Text ("Add Custom Metric")

*Contract Gap Note:* The functional spec indicates dynamic extraction needs (JSONB). The API DTO must structure the AI response to include bounding\_box coordinates (page number, x, y, width, height) alongside the extracted text and confidence\_score so the UI can draw the highlight overlay over the PDF.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: INITIALIZING** \-\> PDF is downloading to the client. Form panel shows generic Skeleton loading.  
* **State: EXTRACTING\_AI** \-\> PDF is rendered. Backend is calling OpenAI (or similar) microservice.  
  * *UI:* The validation panel shows a specialized LoadingState: A spinning BotIcon and text "Analyzing document structure and extracting P\&L data... This may take up to 30 seconds."  
* **State: REVIEW\_PENDING** \-\> AI returns payload. Inputs are populated. "Confirm & Save" button is disabled until all core fields are either approved or manually edited.  
* **Event: FIELD\_FOCUS** \-\> User clicks inside the Input for Revenue.  
  * *Logic:* The PDF viewer programmatically jumps to the corresponding page, and a yellow HighlightOverlay div fades in over the source text.  
* **Event: FIELD\_APPROVE** \-\> User clicks the CheckIcon next to an input.  
  * *UI:* The CheckIcon turns solid green. The input border turns border-emerald-500.  
* **State: MUTATING (Save)** \-\> User clicks "Confirm & Save".  
  * *Logic:* Triggers PUT /api/deals/{id}/financials containing the verified standard columns and the JSONB custom metrics. Shows saving spinner. On success, redirects to /searcher/pipeline/deal/{id}.

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| Extraction.Header.Save | Confirm & Save |
| Extraction.Panel.Title | Extracted Metrics |
| Extraction.Panel.Subtitle | Please review and correct the AI findings against the source document. |
| Extraction.Loading.Title | Analyzing Financials... |
| Extraction.Loading.Body | Securely extracting P\&L data. This usually takes 10-30 seconds. |
| Field.Revenue.Label | Revenue |
| Field.GrossMargin.Label | Gross Margin |
| Field.EBITDA.Label | EBITDA |
| Field.Action.AddCustom | Add Custom Metric |
| Tooltip.Confidence | AI Confidence Score. Lower scores require careful manual review. |
| Toast.Success.Save | Financial data validated and saved to Deal profile. |

---

### **7\. Investor Portfolio Dashboard Specification**

#### **1\. The Mental Model**

The Investor Portfolio Dashboard acts as a **"Command Center" for capital deployment monitoring**. The mental model is an aggregated bird's-eye view. Investors typically back multiple Searchers simultaneously. This screen answers their primary questions: *Which of my Searchers are actively finding deals? Which deals have reached the LOI stage? What new documents have been shared with me today?* Crucially, the UI must reinforce that this is a *read-only* environment regarding Deal data. They cannot edit a Deal; they can only observe what the Searcher has explicitly designated as TIER\_2\_SHARED.

#### **2\. The User Journey (Step-by-Step)**

1. An Investor logs in and is routed to /investor/dashboard.  
2. The user scans the top KPI cards to see the health of their entire network (e.g., "5 Active Searchers", "12 Shared Deals", "3 Active LOIs").  
3. The user scrolls down to the "Portfolio Searchers" table to see a breakdown of pipeline health per individual Searcher Workspace.  
4. The user checks the right-hand "Recent Network Activity" feed to see a timeline of newly shared documents or deals that have progressed in stage.  
5. The user clicks on a specific Deal name in the activity feed, navigating them to the read-only Investor Deal View.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+---------+-------------------------------------------------------------+

| Sidebar | Portfolio Overview                        \[Invite Searcher\] |

|         |                                                             |

| \[Home\]  | \+-----------+ \+-----------+ \+-----------+ \+---------------+ |

| \[Netwk\] | | Active    | | Total     | | Deals at  | | New Docs      | |

| \[Deals\] | | Searchers | | Shared    | | LOI / DD  | | (This Week)   | |

| \[Docs\]  | | 5         | | Deals: 12 | | 3         | | 8             | |

|         | \+-----------+ \+-----------+ \+-----------+ \+---------------+ |

|         |                                                             |

|         | \+-----------------------------------+ \+-------------------+ |

|         | | Portfolio Searchers               | | Network Activity  | |

|         | |-----------------------------------| |                   | |

|         | | Searcher        | Shared | Status | | \* Blue Ocean      | |

|         | |-----------------+--------+--------| |   shared CIM for  | |

|         | | Blue Ocean      | 4      | Active | |   Acme Logistics  | |

|         | | Apex Acq.       | 7      | Active | | \* Apex Acq.       | |

|         | | Delta Search    | 1      | Active | |   moved Beta Co   | |

|         | \+-----------------------------------+ |   to LOI Issued   | |

|         |                                       \+-------------------+ |

\+---------+-------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayout (flex, h-screen, bg-slate-50, overflow-hidden)

  ├─ Sidebar (w-64, flex-col, border-r, border-slate-200, bg-slate-900, text-white, hidden md:flex) \-\> Investor OS gets a dark sidebar to visually distinguish it from the Searcher OS.

  │    └─ SidebarNav (links to /dashboard, /network, /shared-deals)

  └─ MainContent (flex-1, flex-col, overflow-y-auto)

       ├─ Topbar (h-16, flex, items-center, justify-between, px-8, border-b, bg-white)

       │    ├─ PageTitle (text-xl, font-semibold, text-slate-900)

       │    └─ Button (variant="default") \-\> Text ("Invite Searcher") \-\> Triggers InviteModal

       └─ PageContainer (p-8, max-w-7xl, mx-auto, w-full, flex-col, gap-8)

            ├─ MetricsGrid (grid, grid-cols-1 md:grid-cols-2 lg:grid-cols-4, gap-4)

            │    ├─ Card (bg-white)

            │    │    ├─ CardHeader \-\> CardTitle ("Active Searchers")

            │    │    └─ CardContent \-\> Text (text-2xl) \<- Mapped to \-\> Count(NetworkConnection where status='ACTIVE')

            │    ├─ Card (bg-white)

            │    │    ├─ CardHeader \-\> CardTitle ("Total Shared Deals")

            │    │    └─ CardContent \-\> Text \<- Mapped to \-\> Count(Deal where visibilityTier='TIER\_2\_SHARED')

            │    ├─ Card (bg-white)

            │    │    ├─ CardHeader \-\> CardTitle ("Deals in LOI/DD")

            │    │    └─ CardContent \-\> Text \<- Mapped to \-\> Count(Deal where stage IN \[LOI\_ISSUED, DUE\_DILIGENCE\] AND visibilityTier='TIER\_2\_SHARED')

            │    └─ Card (bg-white)

            │         ├─ CardHeader \-\> CardTitle ("Recent Documents")

            │         └─ CardContent \-\> Text \<- Mapped to \-\> Count(Documents shared in last 7 days)

            │

            └─ DashboardContentGrid (grid, grid-cols-1 lg:grid-cols-3, gap-6)

                 ├─ PortfolioTableWrapper (col-span-2, flex-col, gap-4)

                 │    └─ Card (bg-white, shadow-sm)

                 │         ├─ CardHeader \-\> CardTitle ("Connected Searchers")

                 │         └─ CardContent (p-0)

                 │              └─ Table (w-full)

                 │                   ├─ TableHeader (bg-slate-50/50)

                 │                   │    └─ TableRow \-\> TableHead ("Workspace"), TableHead ("Shared Deals"), TableHead ("Status")

                 │                   └─ TableBody

                 │                        └─ TableRow (hover:bg-slate-50, cursor-pointer) \<- Mapped to \-\> Array\[NetworkConnection\]

                 │                             ├─ TableCell (font-medium) \<- Mapped to \-\> NetworkConnection.SearcherWorkspace.name

                 │                             ├─ TableCell \<- Mapped to \-\> Count(SearcherWorkspace.Deals where visibilityTier='TIER\_2\_SHARED')

                 │                             └─ TableCell \-\> Badge (variant="success") \<- Mapped to \-\> NetworkConnection.status

                 │

                 └─ ActivityFeedWrapper (col-span-1)

                      └─ Card (bg-white, shadow-sm, h-full, min-h-\[400px\])

                           ├─ CardHeader \-\> CardTitle ("Recent Network Activity")

                           └─ CardContent

                                └─ ScrollArea (h-\[400px\], pr-4)

                                     └─ FeedList (flex-col, gap-4)

                                          └─ FeedItem (flex, gap-3, relative) \<- Mapped to \-\> Array\[ActivityLog\] (Filtered by TIER\_2 permissions)

                                               ├─ TimelineConnector (absolute, left-4, top-8, bottom-0, w-px, bg-slate-200)

                                               ├─ Avatar (size="sm", bg-slate-100) \-\> BuildingIcon

                                               └─ TextBlock (flex-col)

                                                    ├─ Text (text-sm, text-slate-900) \<- Mapped to \-\> ActivityLog.description ("Blue Ocean shared CIM for Acme Corp")

                                                    └─ Text (text-xs, text-slate-500) \<- Mapped to \-\> ActivityLog.createdAt (Relative time format)

*Contract Gap Note:* The schema defines a relationship between Workspaces, but an explicit ActivityLog or Audit trail table wasn't in the provided snippet, though the "Idea" document mentions transaction emails and alerting. The backend must provide an aggregated timeline DTO of events explicitly filtered to ensure no TIER\_1\_PRIVATE events leak into this view.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: INITIAL\_LOAD** \-\> Fetching Investor Dashboard DTO. Skeletons render across the MetricsGrid, Table, and Feed.  
* **State: LOADED\_EMPTY\_NETWORK** \-\> The Investor has zero NetworkConnection records.  
  * *UI:* The dashboard hides the Table and Feed. Shows a prominent EmptyState component: "Welcome to Ceeq. You are currently not connected to any Searcher Workspaces." Action Button: "Invite a Searcher".  
* **State: LOADED\_DATA** \-\> Normal rendering.  
* **Interaction Logic (Row Click):** Clicking a TableRow in the Connected Searchers list triggers Next.js router push( /investor/network/searcher/${workspaceId} ) to view that specific searcher's dedicated pipeline.

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| InvDashboard.Title | Portfolio Overview |
| InvDashboard.Action.Invite | Invite Searcher |
| InvMetric.ActiveSearchers | Connected Searchers |
| InvMetric.TotalShared | Total Shared Deals |
| InvMetric.LateStage | Deals in LOI / DD |
| InvTable.Title | Connected Searchers |
| InvFeed.Title | Recent Network Activity |
| InvEmptyState.Title | Build your network |
| InvEmptyState.Body | Invite Searchers to connect their workspaces with your fund to start receiving deal flow and standardized financial metrics in real-time. |

---

# **Ceeq: UX and Design Spec**

Excellent. We have reached the final screen in our defined scope: the **Deal Flow Network Feed** for the Investor OS.

This screen is the primary value driver for the Investor. It is where the cryptographic privacy architecture pays off, surfacing a curated stream of high-quality, standardized deal flow from their network of Searchers.

---

### **8\. Deal Flow Network Feed Specification**

#### **1\. The Mental Model**

The mental model is an **Exclusive, Curated Marketplace Feed**. Unlike the Searcher's Pipeline (which is a tactical Kanban board for moving deals), the Investor's Feed is a consumption-first interface. It resembles a high-end real estate listing or an AngelList feed. Every card represents a TIER\_2\_SHARED deal. Crucially, the UI must emphasize the *source* (Which Searcher is working this?) and the *standardized financial health* (The AI-extracted OCR metrics). It is strictly Read-Only.

#### **2\. The User Journey (Step-by-Step)**

1. User navigates to /investor/deals via the dark Investor Sidebar.  
2. The screen presents a scrolling grid of Deal Cards, sorted by most recently updated.  
3. The user utilizes the top FilterBar to narrow the feed (e.g., "Show me only Deals in the 'LOI Issued' stage" or "Only deals from 'Blue Ocean Search'").  
4. The user scans a Deal Card, immediately noting the AI-extracted Revenue and EBITDA figures presented in a standardized format.  
5. The user clicks "View Deal Room" on a specific card.  
6. A Sheet component (Side Drawer) slides in from the right, displaying the read-only Deal Profile, including the firmographics and any Investor-visible (isPublic: true) documents like the CIM.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+---------+-------------------------------------------------------------+

| Sidebar | Network Deal Flow                                           |

|         |                                                             |

| \[Home\]  | Filters: \[ All Searchers v \] \[ All Stages v \] \[ Sort: New \] |

| \[Netwk\] | \=========================================================== |

| \[Deals\] |                                                             |

| \[Docs\]  | \+-------------------------+ \+-----------------------------+ |

|         | | Acme Logistics          | | Beta Co                     | |

|         | | Searcher: Blue Ocean    | | Searcher: Apex Acq.         | |

|         | | Stage: CIM Review       | | Stage: LOI Issued           | |

|         | |-------------------------| |-----------------------------| |

|         | | Est. Rev: $12.5M        | | Est. Rev: $8.2M             | |

|         | | EBITDA:   $5.0M         | | EBITDA:   $1.1M             | |

|         | | Margin:   40%           | | Margin:   15%               | |

|         | |-------------------------| |-----------------------------| |

|         | | \[ View Deal Room \-\> \]   | | \[ View Deal Room \-\> \]       | |

|         | \+-------------------------+ \+-----------------------------+ |

\+---------+-------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayout (flex, h-screen, bg-slate-50, overflow-hidden)

  ├─ Sidebar (w-64, flex-col, bg-slate-900, text-white, hidden md:flex)

  └─ MainContent (flex-1, flex-col, h-full)

       ├─ PageHeader (h-16, flex, items-center, justify-between, px-8, bg-white, border-b, shrink-0)

       │    └─ PageTitle (text-xl, font-semibold, text-slate-900)

       │

       ├─ FilterToolbar (px-8, py-4, flex, gap-4, border-b, bg-white, shrink-0)

       │    ├─ Select \<- Mapped to \-\> Filter: searcherId (Array\[NetworkConnection.SearcherWorkspace\])

       │    ├─ Select \<- Mapped to \-\> Filter: stage (DealStage Enum)

       │    └─ Select \<- Mapped to \-\> Sort: updatedAt (DESC/ASC)

       │

       └─ ScrollArea (flex-1, p-8)

            ├─ FeedGrid (grid, grid-cols-1 md:grid-cols-2 xl:grid-cols-3, gap-6)

            │    └─ Card (bg-white, shadow-sm, hover:shadow-md, transition-shadow) \<- Mapped to \-\> Array\[Deal where visibilityTier='TIER\_2\_SHARED'\]

            │         ├─ CardHeader (pb-4)

            │         │    ├─ TopRow (flex, justify-between, items-start)

            │         │    │    ├─ CardTitle (text-lg, font-bold) \<- Mapped to \-\> Deal.Company.name

            │         │    │    └─ Badge (variant="secondary") \<- Mapped to \-\> Deal.stage

            │         │    └─ SearcherAttribution (flex, items-center, gap-2, mt-2)

            │         │         ├─ Avatar (size="xs")

            │         │         └─ Text (text-sm, text-slate-500) \<- Mapped to \-\> "Sourced by {Deal.Workspace.name}"

            │         │

            │         ├─ CardContent (py-4, border-y, border-slate-100, bg-slate-50/50)

            │         │    └─ MetricsGrid (grid, grid-cols-3, gap-2, text-center)

            │         │         ├─ MetricItem

            │         │         │    ├─ Label (text-xs, text-slate-500) \-\> "Revenue"

            │         │         │    └─ Value (text-sm, font-semibold) \<- Mapped to \-\> Extracted DealFinancials.revenue

            │         │         ├─ MetricItem \-\> "EBITDA" \<- Mapped to \-\> Extracted DealFinancials.ebitda

            │         │         └─ MetricItem \-\> "Margin" \<- Mapped to \-\> Extracted DealFinancials.grossMargin

            │         │

            │         └─ CardFooter (pt-4)

            │              └─ Button (variant="ghost", w-full, justify-between) \-\> Triggers DealDrawer(Deal.id)

            │                   ├─ Text ("View Deal Room")

            │                   └─ ArrowRightIcon (text-slate-400)

            │

            └─ DealDrawer (Sheet component, side="right", w-\[400px\] sm:w-\[540px\]) \<- Mounted outside the grid loop

                 ├─ SheetHeader

                 │    ├─ SheetTitle \<- Mapped to \-\> Deal.Company.name

                 │    └─ SheetDescription \<- Mapped to \-\> "Managed by {Deal.Workspace.name}"

                 └─ ScrollArea (h-full, mt-6, pr-4)

                      ├─ Section (Firmographics) \-\> ReadOnly DataList

                      ├─ Section (Financials) \-\> ReadOnly Metrics

                      └─ Section (Documents)

                           └─ DocumentList (Only renders where Document.isShared \== true)

                                └─ DocumentItem (flex, justify-between)

                                     ├─ Text \<- Mapped to \-\> Document.fileName

                                     └─ Button (variant="outline", size="icon") \-\> DownloadIcon

*Contract Gap Note:* The exact schema for DealFinancials isn't fully detailed in the snippet, but the OCR requirements assume it exists. If a Searcher has *not* run the OCR extraction yet, the MetricsGrid in the card must gracefully fall back to a "Data Pending Extraction" state rather than rendering empty or null values.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: FETCHING** \-\> Initial load or when changing filters. Grid displays Skeleton cards.  
* **State: LOADED\_EMPTY** \-\> No deals match the current filters, or no Searchers have shared deals yet.  
  * *UI:* Empty state container displaying a FolderSearch icon. "No shared deals found. Adjust your filters or wait for your connected Searchers to upgrade deals to Tier 2."  
* **State: IDLE** \-\> Data populated, user browsing.  
* **Event: OPEN\_DEAL** \-\> User clicks "View Deal Room".  
  * *Logic:* The DealDrawer (Sheet) state toggles to open=true. A secondary fetch might be required (GET /api/investor/deals/{id}) to load the deep document list if not included in the initial feed DTO.  
* **Security Guardrail (API level, but reflected in UI):** The UI must completely omit any editing controls (No "Save", "Edit", or "Delete" buttons exist in this tree). The Investor is a viewer only.

#### **5\. Microcopy Specifications**

| Component ID | Text Content |
| :---- | :---- |
| Feed.Title | Network Deal Flow |
| Feed.Filter.Searcher | All Searchers |
| Feed.Filter.Stage | All Stages |
| Card.Action.View | View Deal Room |
| Card.Fallback.NoData | Financials Pending |
| Drawer.Docs.Title | Shared Documents |
| Drawer.Docs.Empty | No public documents have been shared for this deal yet. |
| EmptyState.Feed | No deals available. Connected Searchers will appear here once they upgrade targets to Tier 2\. |

---

**Project Completion Summary**

We have successfully mapped out the Global Design System and detailed the **8 core screens** required for Ceeq across both the Acquirer (Searcher) and Backer (Investor) experiences.

By enforcing **Contract-Driven UI** and relying entirely on a strict component mapping system (shadcn/ui), your development team has a blueprint that bridges the complex cryptographic and domain logic directly into a highly accessible, production-ready frontend architecture.

