# Vexel: Architecture & Technical Specification

## 1. Executive Summary
Vexel is a precision wealth management and structural financial tracking platform engineered for ultra-high-net-worth (UHNW) individuals and family offices. The system architecture is designed to prioritize immutable data integrity, mathematically rigorous recursive calculations (Net Worth / Cap Tables), and enterprise-grade privacy for automated AI document ingestion (Airlock).

## 2. Core Technology Stack
* **Framework:** Next.js (App Router)
* **Database:** PostgreSQL
* **ORM:** Prisma ORM (TypeScript)
* **Validation:** Zod (Runtime validation & API boundaries)
* **UI Foundation:** React, Tailwind CSS, Shadcn/UI (Radix UI primitives)

## 3. Data Architecture & State Management
### 3.1. Precision Financial Math
To prevent floating-point arithmetic errors inherent in JavaScript, all high-precision financial figures and net worth calculations must be formatted and transmitted as `string` types in Data Transfer Objects (DTOs) and API contracts, preserving exact decimal precision before rendering or server-side calculation.

### 3.2. Event Sourcing & Immutability
The platform relies on an immutable "Source of Truth" pattern. State changes are captured via an `AuditLog` table using a strictly typed `JSONB` payload to track point-in-time modifications, ensuring total traceability for family office oversight.

### 3.3. Tenant Lifecycle (Cold Storage)
Account deprecation does not result in hard deletion. Instead, it utilizes a "Cold Storage" state. Operations must intercept the `billingStatus` (e.g., transitioning to `FROZEN`) at the application/database layer to revoke write permissions, effectively placing the tenant in a Read-Only mode.

## 4. Authentication & Authorization Boundaries
Vexel implements a decoupled authorization matrix separating system actions from object-level visibility:
* **Role-Based Access Control (RBAC):** Governs system-level CRUD actions.
    * *Admin:* Complete platform control.
    * *Principal:* Full structural/data actions (cannot delete tenant or alter billing).
    * *Controller:* Restricted operational access (Airlock ingestion, task resolution).
* **Cohort-Based Access (Object Level):** Users belong to "Cohorts" which dictate granular visibility into specific Assets and Document Vaults, operating independently of their base Role.

## 5. Security & AI Privacy (The "Airlock")
* **Document Vault Encryption:** All financial PDFs and documents stored in the Airlock vault are encrypted at rest using AES-256 (utilizing either Cloud Provider Managed Keys or Customer Managed Keys to allow for cryptographic shredding).
* **LLM Data Governance:** Vexel bypasses proprietary PII redaction layers in favor of Zero-Data Retention API tiers (e.g., OpenAI/Anthropic Enterprise). Application logic must guarantee that the chosen provider SLA explicitly drops payload data post-processing and excludes it from model training.

## 6. API & Data Fetching Strategy
* **Type Safety:** All inbound API requests must be validated against strict Zod schemas (e.g., `RequestUploadUrlSchema`, `UpdateDocumentMetadataSchema`) before hitting the Prisma database layer.
* **Lazy Loading:** Complex structural hierarchies (like Cap Tables and Asset Trees) must utilize lazy-loading patterns (e.g., `/api/assets/:id/children`) upon row expansion rather than front-loading massive recursive tree structures.

## 7. UI/UX & Styling Conventions
* **Aesthetic Principles:** The UI balances a "consumer-enterprise" aesthetic. Backgrounds should utilize soft off-whites (`bg-slate-50` or `bg-zinc-50`) to reduce eye strain, reserving pure white (`bg-white`) exclusively for elevated components (Cards, Modals) to create depth.
* **Typography & Grids:** The primary font is Inter or Geist Sans. **Crucial:** All financial grids and numeric displays must utilize the `tabular-nums` Tailwind utility to ensure decimal alignment and prevent visual layout shifts during state updates.
* **Governance Indicators:** Avoid heavy, blocky alert states for standard data health. Use minimalist semantic status dots (e.g., `<Badge variant="outline"><div className="w-2 h-2 rounded-full bg-amber-500" /> Review</Badge>`).

## 8. File System & Naming Conventions
Follows Feature-Sliced Design adapted for Next.js App Router:
* `src/app/`: Next.js routing shell only. No complex business logic. 
* `src/shared/`: Globally reusable utilities, UI components, and API clients.
* **Naming Rules:** * Files/Directories: `kebab-case`
    * React Components: `PascalCase`
    * Server Actions: `camelCase` (ending in `Action`)

## 9. Testing Taxonomy
* **Unit & Integration:** Vitest
* **Component Testing:** React Testing Library (RTL)
* **End-to-End (E2E):** Playwright
