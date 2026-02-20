# **Vexel: UX and Design Spec**

### **Phase 2: Global Architecture & Planning**

Thank you for the clear direction. Balancing a modern, breathable "consumer-enterprise" aesthetic with complex financial data is the sweet spot for a platform like Vexel. Given the Principal-focused requirements, we will lean heavily into generous whitespace, tabular typography for numbers, and native-feeling mobile interactions.

Here is the Global Design Architecture that will serve as the foundation for our Component Tree.

#### **1\. Global Design System (The "Lego Bricks")**

* **Core UI Library:** React \+ Tailwind CSS \+ **Shadcn/UI** (built on Radix UI primitives for supreme accessibility and composability).  
* **Typography:** \* *Primary Font:* Inter or Geist Sans.  
  * *Financial Figures:* We will heavily utilize the tabular-nums Tailwind utility for all financial grids and Net Worth calculations to ensure decimal alignment and prevent visual "jumping" when values update.  
* **Color Tokens & Aesthetic (Breathable & Modern):**  
  * *Backgrounds:* Soft off-whites (bg-slate-50 or bg-zinc-50) to reduce eye strain, with pure white (bg-white) reserved strictly for elevated components (Cards, Modals) to create depth.  
  * *Borders:* Very subtle borders (border-border / border-slate-200).  
  * *Primary Action:* A sophisticated, trustworthy brand color (e.g., bg-slate-900 or a deep navy).  
* **Governance Indicators (Subtle):**  
  * We will use minimalist semantic status dots (e.g., \<Badge variant="outline"\>\<div className="w-2 h-2 rounded-full bg-amber-500" /\> Review\</Badge\>) rather than full-row highlighting.  
* **Mobile Web Paradigm (Native Feel):**  
  * Instead of standard responsive stacking, mobile (\< md) will utilize iOS-style paradigms: Bottom Tab Navigation replacing sidebars, and Sheet (Slide-over) components pulling up from the bottom for detail views and forms, creating a seamless, app-like read-only experience for Principals.

---

#### **2\. Scope Definition (The Screen & Flow Inventory)**

Based on the Product Requirement Document, Functional Spec, and Domain Model, here are the primary screens and flows that require detailed UI/UX specification.

**Core Flows:**

1. **Authentication & Onboarding Flow:** Standard Login, strict password validation, and the Idle Timeout lock screen.  
2. **Global Dashboard & Net Worth Overview:** The primary executive view for the Principal, featuring top-level roll-ups, historical trends, and quick actions.  
3. **Asset Directory & Cap Table View:** The core structural ledger. A high-density data table displaying asset ownership, recursive valuations, and subtle Governance "Traffic Lights" (Ghost Entries vs. Verified).  
4. **Airlock Document Ingestion Flow:** The AI processing interface. Includes the file dropzone, the explicit "LLM Data Privacy Consent" modal, and the asynchronous extraction state machine (Pending \-\> Review Required \-\> Processed).  
5. **Billing & Overage Resolution State:** The "Unhappy Path" flow handling the 30-day hard-lock grace period, displaying the persistent Red Warning Banner, and the Stripe webhook manual refresh sync.

---

# **Vexel: UX and Design Spec**

Excellent. We will tackle these flows sequentially to ensure absolute precision and consistency. I have decided to start with **Flow 1: Authentication & Onboarding Flow**, as it establishes the security paradigm and the initial "breathable, modern consumer-enterprise" visual language.

Here is the deep-dive specification.

### **1\. Authentication & Onboarding Flow Specification**

#### **1\. The Mental Model**

The login screen is the "front door" to the family office's vault. It should evoke a sense of absolute security, privacy, and minimalist elegance. There are no distracting marketing graphics or unnecessary links (e.g., no "Sign up" or social logins) —only a focused, centered gateway for authorized Principals, Controllers, and Admins.

\+1

#### **2\. The User Journey (Step-by-Step)**

1. User navigates to the root domain (/login).  
2. The system presents a clean, centered authentication card.  
3. User enters their email and password.  
4. User clicks "Sign In".  
5. The system enters a brief loading state (button spinner) while validating credentials.  
6. **Unhappy Path:** If credentials fail, the input fields clear the password, and an inline error is displayed. If rate limits are hit, a strict lockout warning appears.  
7. \+1  
8. **Happy Path:** System redirects the user instantly to the Global Dashboard (/dashboard).

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-------------------------------------------------------------+  
|                                                             |  
|                                                             |  
|           \+---------------------------------------+         |  
|           |                                       |         |  
|           |                 VEXEL                 |         |  
|           |   Enter your credentials to access    |         |  
|           |                                       |         |  
|           |   Email Address                       |         |  
|           |   \[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]   |         |  
|           |                                       |         |  
|           |   Password                            |         |  
|           |   \[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]   |         |  
|           |                                       |         |  
|           |   \[           Sign In             \]   |         |  
|           |                                       |         |  
|           \+---------------------------------------+         |  
|                                                             |  
|                                                             |  
\+-------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

We will utilize a deeply nested Shadcn/UI structure, leveraging Tailwind utilities for spatial alignment.

Plaintext

ViewContainer (h-screen w-screen flex flex-col items-center justify-center bg-slate-50)  
  FormWrapper (w-full max-w-md px-4 sm:px-0)  
    Card (bg-white shadow-sm border-border)  
      CardHeader (space-y-1 text-center pb-6)  
        CardTitle (text-2xl font-semibold tracking-tight tabular-nums) \<- Static text: "Vexel"  
        CardDescription (text-sm text-muted-foreground)  
      CardContent  
        Form  
          FormContainer (space-y-4)  
            FormField (name="email")  
              FormItem (space-y-2)  
                FormLabel (text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70)  
                FormControl  
                  Input (type="email", placeholder="name@familyoffice.com") \<- Mapped to \-\> User.emailAddress   
                FormMessage (text-\[0.8rem\] text-destructive) \<- Maps to Validation Errors  
            FormField (name="password")  
              FormItem (space-y-2)  
                FormLabel (text-sm font-medium)  
                FormControl  
                  Input (type="password") \<- Mapped to \-\> User.passwordHash \[cite: 10\]  
                FormMessage (text-\[0.8rem\] text-destructive)  
            ErrorAlertArea (h-8 flex items-center justify-center)  
              Alert (variant="destructive", hidden if no global auth error)  
                AlertDescription \<- Mapped to \-\> Auth API Error Response  
      CardFooter  
        Button (w-full, size="lg", type="submit")  
          SpinnerIcon (animate-spin mr-2, hidden if State \!= LOADING)  
          ButtonText \<- Static text: "Sign In"  
  Toaster (position="top-right") \<- Renders Global Session Expiration Toasts 

*Responsiveness:* On md and above, the card remains strictly 400px wide. On \< md, the card becomes w-full with padding, removing the outer background distinction to mimic a native mobile app login.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: IDLE**  
  * **Event:** User types credentials \-\> **State: TYPING**  
  * **Event:** Submit \-\> **State: LOADING**  
* **State: LOADING**  
  * UI locks. Button enters disabled state with SpinnerIcon.  
  * **Event:** API returns 200 OK \-\> **State: SUCCESS** (Redirect to /dashboard).  
  * **Event:** API returns 401 Unauthorized \-\> **State: ERROR\_CREDENTIALS**  
  * **Event:** API returns 429 Too Many Requests \-\> **State: ERROR\_LOCKED**  
* **State: ERROR\_CREDENTIALS**  
  * Logic: Password field clears. Alert component renders above the footer.  
  * UI explicitly does *not* specify whether email or password was wrong.  
* **State: ERROR\_LOCKED**  
  * Logic: Input fields disable. Alert renders strict rate-limit warning. Form submission blocked for 15 minutes.  
* **State: IDLE\_TIMEOUT (Global Modifier)**  
  * Logic: If no interaction for 30 minutes, system auto-redirects here.  
  * UI: Renders Toast notification immediately upon mounting the /login view.

#### **5\. Microcopy Specifications**

| Component ID | Scenario / State | Actual Text Content |
| :---- | :---- | :---- |
| CardDescription | Default Load | "Sign in to access your secure portal." |
| FormLabel (Email) | Default Load | "Email Address" |
| FormLabel (Password) | Default Load | "Password" |
| Button | Default Load | "Sign In" |
| AlertDescription | 401 Unauthorized (Invalid Creds) | "Invalid email or password." |
| AlertDescription | 429 Too Many Requests (Lockout) | "Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes." |
| ToastNotification | Idle Timeout / Expired Token | "Your session has expired. Please log in again to continue." |

---

# **Vexel: UX and Design Spec**

Thank you for the approval. Moving forward systematically, we will now detail **Flow 2: Global Dashboard & Net Worth Overview**.

This is the most critical screen in the application. It is the executive summary that the Principal will see immediately after logging in, and it must flawlessly communicate complex mathematical roll-ups (Net Worth), unverified capital (Ghost Entries), and immediate governance issues without overwhelming the user.

Here is the deep-dive specification for the Global Dashboard.

### **2\. Global Dashboard & Net Worth Overview Specification**

#### **1\. The Mental Model**

The dashboard acts as an "Executive Control Tower." It is not meant for granular data entry, but rather for high-level consumption and triage. The user should instantly understand three things: *What am I worth right now?* (Net Worth), *What data is pending?* (Pending Capital), and *What is broken/needs my attention?* (Governance Health). The design should feel authoritative, spacious, and mathematically absolute.

#### **2\. The User Journey (Step-by-Step)**

1. User logs in and is routed to /dashboard.  
2. The system calculates and renders the Total Net Worth hero metric, normalized to the tenant's base currency.  
3. \+1  
4. The system calculates and renders the "Pending Capital" widget (sum of unverified ghost entries $\< 60$ days old).  
5. The system renders the "Top-Level Entities Table" (e.g., Trusts, Holding Cos) that roll up into the Net Worth.  
6. The system renders a Governance Health Bar summarizing Red/Yellow/Green states across the portfolio.  
7. \+1  
8. **Interaction:** The user hovers over the "Pending Capital" widget to see a tooltip explaining its exclusion from Net Worth.  
9. **Interaction:** The user clicks a row in the Entities Table, which routes them to the detailed Cap Table view for that specific entity.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------+  
|  \[Sidebar Navigation\]  |                                                    |  
|  \- Dashboard           |  Good Morning, \[User.Name\]                         |  
|  \- Portfolio           |                                                    |  
|  \- Entities            |  Total Net Worth                      Pending      |  
|  \- Airlock             |  $ 125,450,000.00                    $ 1.2M        |  
|  \- Vault               |                                       \[4 Items\]    |  
|  \- Governance          |                                                    |  
|                        |  \------------------------------------------------  |  
|                        |  Governance Health: \[ 2 Critical \] \[ 1 Warning \]   |  
|                        |                                                    |  
|                        |  Top-Level Entities                                |  
|                        |  \+----------------------------------------------+  |  
|                        |  | Entity Name         | Type   | Net Value     |  |  
|                        |  \+----------------------------------------------+  |  
|                        |  | Alpha Trust (G1)  | Trust  | $ 85,000,000  |  |  
|                        |  | Beta Holding LLC  | LLC    | $ 40,450,000  |  |  
|                        |  \+----------------------------------------------+  |  
\+-----------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

DashboardLayout (flex h-screen bg-slate-50)  
  Sidebar (w-64 hidden md:flex flex-col border-r border-border bg-white) \<- App Navigation  
  MainContentArea (flex-1 flex flex-col overflow-hidden)  
    TopHeader (h-16 flex items-center px-8 bg-white border-b border-border)  
      Greeting (text-lg font-medium text-slate-900) \<- Static text \+ User.Name  
      UserAvatar (ml-auto)  
    ScrollableContent (flex-1 overflow-y-auto p-8 space-y-8)  
      MetricsGrid (grid grid-cols-1 md:grid-cols-3 gap-6)  
        Card (col-span-1 md:col-span-2 bg-slate-900 text-white shadow-md) \<- Hero Metric  
          CardHeader  
            CardTitle (text-sm font-medium text-slate-300 uppercase tracking-wider) \<- Static: "Total Net Worth"  
          CardContent  
            NetWorthValue (text-5xl font-light tabular-nums tracking-tight) \<- Mapped to \-\> Calculated Sum (Recursive Engine)  
            CurrencyBadge (ml-2 text-xl text-slate-400) \<- Mapped to \-\> Tenant.baseCurrency  
        Card (col-span-1 border border-border shadow-sm hover:border-slate-300 transition-colors cursor-pointer) \<- Pending Capital Widget  
          CardHeader  
            CardTitle (text-sm font-medium text-slate-500 uppercase tracking-wider) \<- Static: "Pending Capital"  
            TooltipProvider  
              Tooltip  
                TooltipTrigger (InfoIcon w-4 h-4 text-slate-400 ml-2)  
                TooltipContent \<- Static: "Unverified capital \< 60 days old. Excluded from Net Worth."  
          CardContent  
            PendingSum (text-3xl font-medium tabular-nums text-slate-900) \<- Mapped to \-\> Sum(Ghost Entries \< 60 days)  
            PendingCount (text-sm text-slate-500 mt-1) \<- Mapped to \-\> Count(Ghost Entries \< 60 days)  
      GovernanceHealthBar (flex items-center space-x-4 p-4 bg-white border border-border rounded-lg shadow-sm)  
        HealthLabel (text-sm font-medium text-slate-700) \<- Static: "Portfolio Health:"  
        Badge (variant="destructive")  
          RedStatusIcon (w-3 h-3 mr-2)  
          CountText \<- Mapped to \-\> Count(Assets/Tasks where State \== RED)  
        Badge (variant="warning", className="bg-amber-100 text-amber-800")  
          YellowStatusIcon (w-3 h-3 mr-2)  
          CountText \<- Mapped to \-\> Count(Assets/Tasks where State \== YELLOW)  
      EntitiesSection (space-y-4)  
        SectionHeader (flex justify-between items-center)  
          SectionTitle (text-xl font-semibold text-slate-900) \<- Static: "Top-Level Entities"  
          ViewAllLink (text-sm text-blue-600 hover:underline cursor-pointer)  
        Card (bg-white shadow-sm border-border overflow-hidden)  
          Table  
            TableHeader  
              TableRow (bg-slate-50)  
                TableHead \<- Static: "Entity Name"  
                TableHead \<- Static: "Type"  
                TableHead (text-right) \<- Static: "Net Value"  
            TableBody  
              TableRow (hover:bg-slate-50 cursor-pointer transition-colors) \<- Iterates over Top-Level Entities mapped to User  
                TableCell (font-medium text-slate-900 flex items-center)  
                  StatusIndicator (w-2 h-2 rounded-full mr-3) \<- Mapped to \-\> Entity.governance\_state (Green/Yellow/Red)  
                  EntityName \<- Mapped to \-\> Entity.name  
                TableCell (text-slate-500) \<- Mapped to \-\> Entity.entity\_type  
                TableCell (text-right tabular-nums font-medium) \<- Mapped to \-\> Calculated Net Value of Entity

*Responsiveness:* On mobile (\< md), the Sidebar is hidden, replaced by a bottom navigation bar. The MetricsGrid stacks vertically, prioritizing the Net Worth hero card. The Table component collapses into a stacked card layout (Mobile Stack View).

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: INITIAL\_LOAD**  
  * UI renders Skeleton components for the NetWorthValue, PendingSum, and TableBody while the recursive engine executes the Cap Table calculation.  
* **State: DATA\_READY (Green/Verified)**  
  * Net Worth displays. GovernanceHealthBar shows 0 Red/Yellow. Table rows all feature Green status dots.  
* **State: HAS\_PENDING\_CAPITAL**  
  * If Count(Ghost Entries \< 60 days) \> 0, the Pending Capital widget renders the sum.  
  * **Event:** Click Widget \-\> Routes to /airlock filtered by status=pending.  
* **State: HAS\_GOVERNANCE\_WARNINGS**  
  * If any asset/entity evaluates to Yellow or Red, the GovernanceHealthBar badges render the count.  
  * \+1  
  * Table rows reflect the inherited status (e.g., a Red dot next to "Alpha Trust" if an underlying asset is failing).  
  * **Event:** Click Red Badge \-\> Routes to /governance task list.  
* **State: EMPTY\_PORTFOLIO (First Login)**  
  * If Tenant.assets.length \== 0 and Tenant.entities.length \== 0.  
  * Net Worth displays $0.00.  
  * Table renders a zero-state graphic with a primary action button: "Create Your First Entity".  
* **State: STRIPE\_OVERAGE\_HARD\_LOCK (Global Modifier)**  
  * Logic: If Tenant.overageStartDate \> 30 days.  
  * UI: A non-dismissible Red Alert banner is injected at the very top of the MainContentArea: "Plan limit exceeded. You can no longer add new assets. Upgrade to unlock.".

#### **5\. Microcopy Specifications**

| Component ID | Scenario / State | Actual Text Content |
| :---- | :---- | :---- |
| TooltipContent (Pending) | Default Load | "Unverified capital extracted from documents within the last 60 days. This sum is strictly excluded from your Total Net Worth until manually approved." |
| EmptyStateTitle (Table) | No Entities Exist | "Your portfolio is empty." |
| EmptyStateAction (Table) | No Entities Exist | "Begin by defining your top-level legal entities (Trusts, Holding Companies) to establish your cap table architecture." |
| PendingCount | 1 Item Pending | "$\[X\] across 1 pending item" |
| PendingCount | \> 1 Items Pending | "$\[X\] across \[Count\] pending items" |
| PendingSum | 0 Items Pending | "All data reconciled" (Renders instead of $0.00, accompanied by a Green checkmark icon). |

---

### **3\. Asset Directory & Cap Table View Specification**

#### **1\. The Mental Model**

If the Dashboard is the "Executive Control Tower," the Asset Directory is the "Master Ledger." This screen must handle extreme data density without feeling cluttered. The mental model is an infinitely nestable, hierarchical spreadsheet that acts as the single source of truth for the family office's ownership structure. It uses an expandable row pattern to visually represent recursive ownership (e.g., a Trust owning an LLC, which owns Real Estate).

#### **2\. The User Journey (Step-by-Step)**

1. User navigates to /assets.  
2. The system renders the primary Asset Directory, defaulting to a top-level view (only showing parent entities that are not owned by anything else).  
3. The user sees an expand/collapse chevron next to "Master Trust."  
4. **Interaction:** The user clicks the chevron. The row expands downwards to reveal the child assets (e.g., "Waystar HoldCo LLC") indented below it, along with their ownership percentages.  
5. **Interaction:** The user clicks the "More Actions" (...) menu on a specific asset row to open a dropdown menu.  
6. **Interaction:** The user selects "View Details," which triggers a Sheet component to slide in from the right side of the screen, displaying the deep-dive view and edit forms for that specific asset without losing context of the main table.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------+  
|  \[Sidebar Navigation\]  |  Asset Directory                            \[+ Add\]  |  
|                        |                                                    |  
|                        |  \[ Search Assets... \] \[ Filter: All Types v \]      |  
|                        |  \+----------------------------------------------+  |  
|                        |  |   | Name             | Type  | Own % | Value |  |  
|                        |  \+----------------------------------------------+  |  
|                        |  | v | Alpha Trust (G1) | Trust | 100%  | $ 85M |  |  
|                        |  |   |   L Beta Holding | LLC   |  50%  | $ 40M |  |  
|                        |  |   |   L Delta Realty | Real  |  50%  | $ 45M |  |  
|                        |  | \> | Gamma Foundation | Trust | 100%  | $ 12M |  |  
|                        |  \+----------------------------------------------+  |  
\+-----------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageContainer (flex-1 flex flex-col h-full bg-slate-50 p-8)  
  PageHeader (flex justify-between items-end mb-6)  
    HeaderTitles (space-y-1)  
      PageTitle (text-2xl font-semibold tracking-tight text-slate-900) \<- Static: "Asset Directory"  
      PageDescription (text-sm text-slate-500) \<- Static: "Manage your cap table and entity structures."  
    HeaderActions (flex space-x-3)  
      Button (variant="default")  
        PlusIcon (w-4 h-4 mr-2)  
        Text \<- Static: "Add Asset"  
  Toolbar (flex space-x-4 mb-4)  
    Input (placeholder="Search assets...", className="max-w-sm bg-white") \<- Mapped to \-\> Local Filter State  
    Select (defaultValue="ALL") \<- Mapped to \-\> Asset.type Filter  
      SelectTrigger (bg-white)  
        SelectValue (placeholder="All Types")  
      SelectContent  
        SelectItem (value="TRUST") \<- Static: "Trust"  
        SelectItem (value="LLC") \<- Static: "LLC"  
        SelectItem (value="REAL\_ESTATE") \<- Static: "Real Estate"  
  TableContainer (border border-border rounded-md bg-white shadow-sm overflow-hidden flex-1)  
    Table  
      TableHeader  
        TableRow (bg-slate-50)  
          TableHead (w-12) \<- Spacer for Chevron  
          TableHead \<- Static: "Asset Name"  
          TableHead \<- Static: "Type"  
          TableHead (text-right) \<- Static: "Ownership %"  
          TableHead (text-right) \<- Static: "Total Value"  
          TableHead (w-12) \<- Spacer for Actions Dropdown  
      TableBody  
        Collapsible (asChild) \<- Iterates over Top-Level Assets  
          TableRow (group hover:bg-slate-50 transition-colors border-b border-border)  
            TableCell  
              CollapsibleTrigger (asChild)  
                Button (variant="ghost", size="icon", className="w-6 h-6 p-0")  
                  ChevronRightIcon (transition-transform duration-200, rotate-90 on expand)  
            TableCell (font-medium text-slate-900 flex items-center space-x-2)  
              StatusDot (w-2 h-2 rounded-full) \<- Mapped to \-\> Asset.governance\_state  
              AssetIcon (w-4 h-4 text-slate-400) \<- Derived from Asset.type  
              Text \<- Mapped to \-\> Asset.name  
            TableCell (text-slate-500 text-sm) \<- Mapped to \-\> Asset.type  
            TableCell (text-right tabular-nums text-slate-500) \<- Mapped to \-\> EntityOwnership.percentage (or 100% if top-level)  
            TableCell (text-right tabular-nums font-medium text-slate-900) \<- Mapped to \-\> Asset.totalValue  
            TableCell  
              DropdownMenu  
                DropdownMenuTrigger (asChild)  
                  Button (variant="ghost", size="icon", className="h-8 w-8 p-0")  
                    MoreHorizontalIcon (w-4 h-4)  
                DropdownMenuContent (align="end")  
                  DropdownMenuLabel \<- Static: "Actions"  
                  DropdownMenuItem \<- Static: "View Details" (Triggers Sheet)  
                  DropdownMenuItem \<- Static: "Add Child Asset"  
                  DropdownMenuSeparator  
                  DropdownMenuItem (className="text-destructive") \<- Static: "Delete Asset"  
        CollapsibleContent (asChild) \<- Rendered if Row is expanded  
          TableRow (bg-slate-50/50) \<- Iterates over Child Assets (EntityOwnership)  
            TableCell \<- Spacer  
            TableCell (pl-8 flex items-center space-x-2 text-sm) \<- Indented to show hierarchy  
              CornerDownRightIcon (w-3 h-3 text-slate-300)  
              StatusDot (w-2 h-2 rounded-full) \<- Mapped to \-\> ChildAsset.governance\_state  
              Text \<- Mapped to \-\> ChildAsset.name  
            // ... remaining cells map to ChildAsset fields  
  AssetDetailSheet (Side modal triggering on "View Details")  
    Sheet  
      SheetContent (className="sm:max-w-xl overflow-y-auto")  
        SheetHeader  
          SheetTitle \<- Mapped to \-\> SelectedAsset.name  
          SheetDescription \<- Mapped to \-\> SelectedAsset.id (UUID)  
        // Detailed forms and deeper metrics go here

*Responsiveness:* On mobile (\< md), the standard data table is completely hidden. It is replaced by a \<StackList\> component where each asset is a discrete \<Card\> showing the Name, Type, and Value. Clicking the card uses standard iOS-style push navigation to show children or details.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: IDLE (Loaded)**  
  * All top-level assets are rendered. Children are hidden inside closed Collapsible states.  
* **State: ROW\_EXPANDING**  
  * **Event:** User clicks Chevron.  
  * Logic: If child data is not pre-fetched, trigger skeleton loaders inside the CollapsibleContent while fetching the EntityOwnership array for that specific parentAssetId. If cached, animate open immediately.  
* **State: SEARCHING / FILTERING**  
  * **Event:** User types in Input or selects from Select.  
  * Logic: System debounces input (300ms) and filters the visible tree. *Crucial UX rule:* If a child asset matches the search but the parent does not, the system must render the parent row in an auto-expanded state to show the matching child, preserving the structural context.  
* **State: ZERO\_RESULTS**  
  * Logic: Search yields no matches.  
  * UI: Table body is replaced with an empty state: "No assets match your search." with a button to "Clear Filters".  
* **State: ASSET\_DETAIL\_OPEN**  
  * **Event:** User selects "View Details" from the row dropdown.  
  * UI: Sheet slides in, locking the background scroll. The URL updates via shallow routing (e.g., ?asset=uuid) to allow direct linking to the detail view without losing the underlying table state.

#### **5\. Microcopy Specifications**

| Component ID | Scenario / State | Actual Text Content |
| :---- | :---- | :---- |
| PageTitle | Default Load | "Asset Directory" |
| PageDescription | Default Load | "Manage your cap table and entity structures." |
| Search Input Placeholder | Default Load | "Search assets by name or ID..." |
| Empty State (Search) | No search results found | "No assets found. Try adjusting your search or clearing filters." |
| DropdownMenuItem (Add) | Happy Path | "Add Child Asset" |
| DropdownMenuItem (Delete) | Happy Path | "Delete Asset" |
| Delete Confirmation Dialog | User clicks Delete | "Are you sure you want to delete \[Asset.name\]? This action cannot be undone and will recursively remove all child ownership connections." |

---

### **4\. Airlock Document Ingestion Flow Specification**

#### **1\. The Mental Model**

The Airlock is the system’s "quarantine zone." Because Vexel deals with highly sensitive financial PDFs (K-1s, statements, valuations) that are processed by AI, users need to feel they are placing documents into a secure, controlled chamber. The mental model is a highly structured mailroom: documents are dropped in, the AI extracts the data (creating "Ghost Entries"), and human Controllers must explicitly verify the extraction before the data is allowed into the permanent Asset Directory.

#### **2\. The User Journey (Step-by-Step)**

1. User navigates to /airlock.  
2. The user drags and drops a PDF into the primary upload dropzone.  
3. **Crucial Interruption:** The system immediately suspends the upload and presents the "LLM Data Privacy Consent" Modal.  
4. The user explicitly types "I CONSENT" and confirms.  
5. The document uploads and appears in the queue with a status of PENDING\_EXTRACTION.  
6. Once the AI webhook returns, the status changes to REVIEW\_REQUIRED.  
7. **Interaction:** The user clicks "Review". A full-screen split-pane interface opens: original PDF on the left, the extracted "Ghost Entry" data fields on the right.  
8. The user corrects any AI mistakes and clicks "Approve & Post to Ledger."  
9. The document status updates to PROCESSED, and the data becomes an active Asset/Valuation.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe (Main Airlock View)**

Plaintext

\+-----------------------------------------------------------------------------+  
|  \[Sidebar Navigation\]  |  Airlock Ingestion                            |    |  
|                        |                                                    |  
|                        |  \+----------------------------------------------+  |  
|                        |  |                                              |  |  
|                        |  |       \[^\] Drag & Drop Financial PDFs         |  |  
|                        |  |     (K-1s, Appraisals, Bank Statements)      |  |  
|                        |  |                                              |  |  
|                        |  \+----------------------------------------------+  |  
|                        |                                                    |  
|                        |  \[Tabs:  Needs Review (2) | Pending (1) | Done \]   |  
|                        |  \+----------------------------------------------+  |  
|                        |  | Document Name     | Uploaded   | Status | Act|  |  
|                        |  \+----------------------------------------------+  |  
|                        |  | Q4\_Appraisal.pdf  | 10 min ago | YELLOW | \[\>\]|  |  
|                        |  | K1\_AlphaTrust.pdf | 2 hrs ago  | YELLOW | \[\>\]|  |  
|                        |  \+----------------------------------------------+  |  
\+-----------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageContainer (flex-1 flex flex-col h-full bg-slate-50 p-8)  
  PageHeader (mb-6)  
    PageTitle \<- Static: "Airlock Ingestion"  
    PageDescription \<- Static: "Securely extract structured data from your financial documents."  
  DropzoneArea (mb-8)  
    Card (border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center py-12 cursor-pointer)  
      UploadCloudIcon (w-10 h-10 text-slate-400 mb-4)  
      CardTitle (text-lg font-medium text-slate-700) \<- Static: "Drag & Drop Financial PDFs"  
      CardDescription (text-sm text-slate-500) \<- Static: "Supported formats: .pdf, .csv up to 50MB"  
      HiddenInput (type="file", accept=".pdf,.csv")  
  QueueSection  
    Tabs (defaultValue="REVIEW\_REQUIRED")  
      TabsList (grid w-full grid-cols-3 max-w-md mb-4)  
        TabsTrigger (value="REVIEW\_REQUIRED")  
          Text \<- Static: "Needs Review"  
          Badge (variant="warning", ml-2) \<- Mapped to \-\> Count(Docs where status \== REVIEW\_REQUIRED)  
        TabsTrigger (value="PENDING\_EXTRACTION") \<- Static: "Processing"  
        TabsTrigger (value="PROCESSED") \<- Static: "Completed"  
      TabsContent (value="REVIEW\_REQUIRED")  
        Table (bg-white border border-border rounded-md shadow-sm)  
          TableHeader  
            TableRow (bg-slate-50)  
              TableHead \<- Static: "Document Name"  
              TableHead \<- Static: "Uploaded At"  
              TableHead \<- Static: "Status"  
              TableHead (w-24 text-right) \<- Static: "Action"  
          TableBody  
            TableRow \<- Iterates over Document list  
              TableCell (font-medium flex items-center space-x-2)  
                FileTextIcon (w-4 h-4 text-slate-400)  
                Text \<- Mapped to \-\> Document.fileName  
              TableCell (text-slate-500) \<- Mapped to \-\> Document.createdAt (Formatted Relative)  
              TableCell  
                Badge (variant="warning") \<- Mapped to \-\> Document.status (REVIEW\_REQUIRED)  
              TableCell (text-right)  
                Button (variant="default", size="sm") \<- Triggers ReviewScreen  
                  Text \<- Static: "Review"

  // Modals & Overlays  
  ConsentDialog (Triggered on file drop before upload)  
    AlertDialog  
      AlertDialogContent  
        AlertDialogHeader  
          AlertDialogTitle (flex items-center space-x-2)  
            AlertTriangleIcon (text-destructive)  
            Text \<- Static: "Data Privacy Consent Required"  
          AlertDialogDescription (space-y-4)  
            Paragraph \<- Static: "To extract data, this document will be securely transmitted to our LLM partner (OpenAI/Anthropic). V1 does not utilize proprietary PII redaction."  
            Paragraph \<- Static: "By proceeding, you acknowledge that no PII has been manually redacted. Our partner SLA guarantees zero data retention and strictly excludes payload data from future model training."  
        AlertDialogFooter  
          Button (variant="outline") \<- Cancels upload  
          Button (variant="destructive") \<- Approves upload, sets State: UPLOADING

  ReviewFullScreenModal (Triggered via "Review" button)  
    Dialog (full-screen w-screen h-screen m-0 p-0 rounded-none)  
      DialogContent (flex h-full w-full max-w-none p-0 gap-0)   
        DocumentViewerPane (w-1/2 bg-slate-900 border-r border-slate-700 p-4 flex flex-col)  
          PdfToolbar (h-12 flex justify-between items-center text-slate-300)  
          PdfCanvasWrapper (flex-1 bg-slate-800 rounded-md overflow-hidden) \<- Renders PDF Blob  
        ExtractionFormPane (w-1/2 bg-white flex flex-col)  
          PaneHeader (h-16 px-6 border-b border-border flex items-center justify-between)  
            Title \<- Static: "Extracted Ghost Entry"  
          FormScrollArea (flex-1 p-6 overflow-y-auto space-y-6)  
            FormField \<- Mapped to \-\> GhostEntry.assetName  
            FormField \<- Mapped to \-\> GhostEntry.totalValue  
            FormField \<- Mapped to \-\> GhostEntry.effectiveDate  
          PaneFooter (h-20 px-6 border-t border-border flex items-center justify-end space-x-4 bg-slate-50)  
            Button (variant="ghost") \<- Static: "Reject Data"  
            Button (variant="default") \<- Static: "Approve & Post to Ledger"

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: IDLE**  
  * Dropzone is waiting. Tabs show current queue counts.  
* **State: DRAGGING\_FILE**  
  * **Event:** onDragEnter over DropzoneArea.  
  * Logic: DropzoneArea border color changes to border-slate-900, background becomes bg-slate-100.  
* **State: AWAITING\_CONSENT**  
  * **Event:** onDrop triggers AlertDialog.  
  * Logic: Upload does *not* hit the API yet. If canceled, queue clears. If accepted, transitions to UPLOADING.  
* **State: EXTRACTING (Pending)**  
  * Logic: Document row appears under the "Processing" tab. Status badge is bg-slate-100 text-slate-600 with an inline SpinnerIcon.  
  * **Event:** Webhook receives payload from LLM API \-\> Transitions to REVIEW\_READY.  
* **State: REVIEW\_READY**  
  * Logic: Document moves to "Needs Review" tab. Status badge is Yellow.  
* **State: REVIEW\_ACTIVE (Split-Screen)**  
  * **Event:** User clicks "Review".  
  * Logic: If user alters a field in the ExtractionFormPane, flag the field visually (e.g., border-amber-500) to indicate manual override of AI data.  
* **State: PROCESSED (Approved)**  
  * **Event:** User clicks "Approve & Post to Ledger".  
  * Logic: API call converts Ghost Entry into a permanent Asset/Valuation. Modal closes. Document row moves to "Completed" tab with a Green badge.

#### **5\. Microcopy Specifications**

| Component ID | Scenario / State | Actual Text Content |
| :---- | :---- | :---- |
| AlertDialogTitle | Privacy Consent Modal | "Data Privacy Consent Required" |
| AlertDialogDescription | Privacy Consent Modal | "To extract data, this document will be securely transmitted to an external LLM partner. V1 does not utilize proprietary PII redaction. Our partner SLA guarantees zero data retention and strictly excludes payload data from future model training. Do you consent to proceed?" |
| AlertDialogCancel | Cancel Upload | "Cancel" |
| AlertDialogAction | Confirm Upload | "I Consent & Upload" |
| TabsTrigger (Review) | Documents waiting | "Needs Review" |
| EmptyState (Review Tab) | Zero documents | "You're all caught up. No documents require manual review." |
| SubmitButton (Review) | Approve Form | "Approve & Post to Ledger" |

---

### **5\. Billing & Overage Resolution State Specification**

#### **1\. The Mental Model**

This is the platform's "digital velvet rope." The mental model here is firm but hospitable enforcement. Because Vexel caters to UHNW individuals, we never want them to feel like their data is held hostage. Therefore, the UI must clearly communicate *Read/Update Immunity*—they can always view, edit, and delete their existing assets, and the AI Airlock continues to function. Only structural expansion (adding new assets) is paused until the overage is resolved.

#### **2\. The User Journey (Step-by-Step)**

1. **The Trigger:** The tenant exceeds their plan's asset limit, setting the overageStartDate.  
2. **The Grace Period (Days 1-30):** The user logs in and sees a dismissible yellow Warning banner at the top of the app. All functionality remains active.  
3. **The Hard Lock (Day 31+):** The user logs in and sees a persistent, non-dismissible red Destructive banner.  
4. **The Block:** The user attempts to click "Add Asset" in the Asset Directory. The button is visually disabled and displays a padlock icon.  
5. **The Resolution:** The user clicks "Upgrade Plan" inside the banner, opening a Stripe Checkout session.  
6. **The Webhook Delay (Edge Case):** The user completes checkout and returns to Vexel, but the banner is still there because the webhook is delayed.  
7. **The Manual Sync:** The user clicks "Check Payment Status" inside the banner. The system forces a synchronous check, clears the overage, and instantly restores the UI to its normal state.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe (Dashboard during Hard Lock)**

Plaintext

\+-----------------------------------------------------------------------------+  
|  \[\!\] Action Required: Asset limit exceeded. Structural additions are locked.|  
|      You maintain full access to existing data.                             |  
|      \[ Upgrade Plan \]  \[ Check Payment Status \]                             |  
\+-----------------------------------------------------------------------------+  
|  \[Sidebar Navigation\]  |  Asset Directory                         \[P Add\]   |  
|                        |                                           ^        |  
|                        |                                        Disabled    |  
|                        |                                                    |  
|                        |  \+----------------------------------------------+  |  
|                        |  |   | Name             | Type  | Own % | Value |  |  
|                        |  \+----------------------------------------------+  |  
|                        |  | v | Alpha Trust (G1) | Trust | 100%  | $ 85M |  |  
|                        |  \+----------------------------------------------+  |  
\+-----------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

AppLayoutWrapper (flex flex-col h-screen)  
  GlobalBillingAlert (Renders conditionally based on Tenant.overageStartDate)  
    Alert (variant="destructive", className="rounded-none border-x-0 border-t-0 flex items-center justify-between px-8 py-3")  
      AlertContentWrapper (flex items-center space-x-4)  
        AlertTriangleIcon (w-5 h-5 text-destructive-foreground)  
        AlertTextContainer (flex flex-col)  
          AlertTitle (text-sm font-semibold) \<- Static: "Plan Limit Exceeded (Action Required)"  
          AlertDescription (text-sm opacity-90) \<- Mapped to \-\> Days elapsed since Tenant.overageStartDate  
      AlertActionsWrapper (flex space-x-3)  
        Button (variant="outline", size="sm", className="bg-transparent border-current hover:bg-white/20")  
          RefreshCwIcon (w-3 h-3 mr-2, animate-spin if State \== REFRESHING)  
          Text \<- Static: "Check Payment Status"  
        Button (variant="secondary", size="sm")  
          Text \<- Static: "Upgrade Plan"  
    
  MainAppContent (flex-1 flex overflow-hidden)  
    Sidebar   
    PageContainer (p-8)  
      PageHeader  
        HeaderActions  
          Button (disabled={isHardLocked}) \<- isHardLocked derived from (Now \- Tenant.overageStartDate \> 30 days)  
            LockIcon (w-4 h-4 mr-2, rendered only if isHardLocked \== true)  
            Text \<- Static: "Add Asset"  
      // ... Rest of Page Content

*Responsiveness:* On mobile (\< md), the global alert banner stacks its content. The title and description appear on top, with the two action buttons spanning the full width side-by-side below the text.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: GRACE\_PERIOD (1 to 30 Days)**  
  * Logic: Tenant.overageStartDate is set, but \< 30 days ago.  
  * UI: Alert variant is warning (Yellow). "Add Asset" buttons are fully functional. The Alert includes a dismiss button (X) for the current session.  
* **State: HARD\_LOCK (Day 31+)**  
  * Logic: Tenant.overageStartDate is \> 30 days ago.  
  * UI: Alert variant is destructive (Red). No dismiss button. All POST /assets triggers in the UI (e.g., "Add Asset" buttons, "Add Child Asset" dropdown items) are explicitly disabled (disabled=true) and show a LockIcon.  
* **State: REFRESHING\_STATUS**  
  * **Event:** User clicks "Check Payment Status".  
  * Logic: Button enters loading state (spinner). Dispatches a synchronous API call to verify the Stripe Subscription status.  
  * Transition: If Stripe confirms payment \-\> **State: RESOLVED**. If no payment found \-\> Toast notification ("No recent payment detected").  
* **State: RESOLVED (Happy Path / Self-Correction)**  
  * **Event:** Webhook fires successfully OR User clicks "Check Payment Status" successfully OR User deletes an asset to drop below the plan limit.  
  * Logic: System detects Tenant is within limits. Tenant.overageStartDate is cleared.  
  * UI: Global alert unmounts entirely. "Add Asset" buttons re-enable dynamically without requiring a page refresh.

#### **5\. Microcopy Specifications**

| Component ID | Scenario / State | Actual Text Content |
| :---- | :---- | :---- |
| AlertTitle | Hard Lock (Day 31+) | "Plan Limit Exceeded (Action Required)" |
| AlertDescription | Hard Lock (Day 31+) | "Your 30-day grace period has expired. Structural additions (new assets/entities) are locked. You maintain full access to view, edit, or delete existing data." |
| AlertTitle | Grace Period (Day 1-30) | "Approaching Plan Limit" |
| AlertDescription | Grace Period (Day 1-30) | "You have exceeded your plan's asset limit. Please upgrade your plan within \[X\] days to prevent structural locks." |
| ActionButton (Upgrade) | Any Overage State | "Upgrade Plan" |
| ActionButton (Refresh) | Any Overage State | "Check Payment Status" |
| ToastNotification | Manual Refresh Fails | "No recent payment detected. If you just paid, please wait a moment and try again." |

---

This concludes the deep-dive UX/UI specifications for all 5 core flows requested based on the PRD and Domain Model.