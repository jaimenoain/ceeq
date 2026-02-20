# SearchFundOS Architecture Spec
## 1. File System & Naming Convention
Strict Feature-Sliced Design within the Next.js App Router ecosystem.
- `src/app/`: Next.js App Router (Routing only, no business logic). Includes `(auth)`, `(searcher)`, and `(investor)`.
- `src/shared/`: Globally reusable utilities (`components/`, `lib/`, `types/`).

**Naming Rules**: Files/Directories use kebab-case. React Components use PascalCase. Server Actions use camelCase ending in Action.

## 2. Testing Taxonomy
- **Unit & Integration**: Vitest
- **Component**: React Testing Library (RTL)
- **E2E**: Playwright
