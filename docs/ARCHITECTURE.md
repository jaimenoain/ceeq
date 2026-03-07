# Ceeq – System Architecture

This document describes the technical architecture of the Ceeq application as implemented in the Walking Skeleton (Phase 1). It is the single source of truth for route structure, authentication flow, and client configuration.

---

## 1. Framework & Routing

- **Framework:** Next.js 14+ (App Router) with TypeScript.
- **Route groups** separate unauthenticated and authenticated experiences. Group names `(auth)` and `(dashboard)` do not affect the URL path.

### 1.1 Next.js Route Groups

| Group        | Purpose                          | URL behavior |
|-------------|-----------------------------------|--------------|
| `(auth)`    | Unauthenticated flows (login, signup, forgot password) | Paths under this group are public. |
| `(dashboard)` | Authenticated app shell (repository, pipeline, deals, tasks, settings) | All paths require a valid session; otherwise the user is redirected to `/login`. |

### 1.2 App Router File Tree

The following structure reflects the current codebase:

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx          → /login
├── (dashboard)/
│   ├── repository/
│   │   └── page.tsx          → /repository
│   ├── pipeline/
│   │   ├── page.tsx          → /pipeline
│   │   └── closed/
│   │       └── page.tsx      → /pipeline/closed
│   ├── deals/
│   │   └── [id]/
│   │       └── page.tsx      → /deals/[id]
│   ├── tasks/
│   │   └── page.tsx          → /tasks
│   └── settings/
│       └── page.tsx          → /settings
├── actions/
│   └── auth.ts               (Server Actions: login, signup, forgot password, logout)
├── globals.css
├── layout.tsx
├── page.tsx                  → /  (redirect: unauthenticated → /login, authenticated → /repository)
└── favicon.ico
```

**Paths:**

- **Public:** `/`, `/login`
- **Protected (dashboard):** `/repository`, `/pipeline`, `/pipeline/closed`, `/deals/[id]`, `/tasks`, `/settings`

### 1.3 Layouts

- **Root:** `app/layout.tsx` – global layout and fonts.
- **Auth layout:** `app/(auth)/layout.tsx` – minimal wrapper (header + centered content) for login/signup/forgot password.
- **Dashboard layout:** `app/(dashboard)/layout.tsx` – persistent sidebar with navigation (Repository, Pipeline, Closed Deals, Tasks, Settings) and a Logout button. Renders `children` in the main content area. **This layout enforces authentication:** it calls `supabase.auth.getUser()`; if there is no user, it redirects to `/login`.

---

## 2. Authentication & Security

### 2.1 Auth Provider

- **Supabase Auth** is used for identity (email/password sign-in, sign-up, forgot password, logout). There is no custom auth server or mock auth in the application.

### 2.2 Environment Variables

All configuration is read from the environment; no secrets are hardcoded.

| Variable                     | Required | Purpose |
|-----------------------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL`  | Yes      | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes   | Supabase anonymous (public) key for client and server. |
| `NEXT_PUBLIC_APP_URL`       | No       | Base URL for password-reset redirect (e.g. `https://example.com`). If unset, reset link redirect uses an empty base. |

**Resend:** Transactional emails (e.g. signup confirmation, password reset) are sent by Supabase. Resend is used as the SMTP provider **configured in the Supabase Dashboard** (Project → Authentication → Providers → Email → SMTP Settings). The application does not use a Resend API key or any Resend-specific environment variables.

### 2.3 Supabase Client Setup

- **Browser:** `lib/supabase/client.ts` – `createBrowserClient` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Server:** `lib/supabase/server.ts` – `createServerClient` with the same env vars and Next.js `cookies()` for cookie read/write.
- **Middleware:** `middleware.ts` – creates a server client, calls `supabase.auth.getUser()` to refresh the session, and writes cookies to the response. Matcher excludes static assets and images.

### 2.4 Route Protection

- **Root (`/`):** Server component in `app/page.tsx` calls `supabase.auth.getUser()`. If user exists → `redirect("/repository")`. If no user → `redirect("/login")`.
- **Dashboard routes:** Every request under `(dashboard)` is wrapped by `app/(dashboard)/layout.tsx`. The layout awaits `supabase.auth.getUser()`; if no user, it calls `redirect("/login")`. Authenticated users see the sidebar and the requested page.
- **Login page:** `/login` is under `(auth)` and is public. After successful login or signup, Server Actions redirect to `/repository`. After logout, users are redirected to `/login`.

### 2.5 Server Actions

- **Location:** `app/actions/auth.ts`.
- **Actions:** `loginAction`, `signUpAction`, `forgotPasswordAction`, `logoutAction`. All use the server Supabase client. Input validation (email format, password min 8 characters) is aligned with the domain model; see `lib/validations/auth.ts`.

---

## 3. Database & RLS (Documentation Reference)

- Tenant isolation and Row Level Security (RLS) are defined in the domain and API contract documentation. RLS policies are intended to use `auth.jwt()` (e.g. `tenant_id` custom claim) once the Supabase project is configured accordingly. Application code does not implement RLS; that is configured in Supabase.

---

## 4. UI & Design

- **Design system:** Tailwind utility classes and Shadcn UI components under `components/ui/`. No custom CSS classes beyond the design tokens in `app/globals.css` and `tailwind.config.ts`.
- **Auth UI:** Login page at `/login` uses Shadcn Card, Tabs (Log in / Sign up / Forgot password), Input, and Button; forms submit to the auth Server Actions.

This architecture document is kept in sync with the implemented Walking Skeleton. For domain entities, DTOs, and API contracts, see `DOMAIN_MODEL.md` and `API_CONTRACT.md`.
