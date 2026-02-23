# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server at http://localhost:8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests (vitest)
npm run test:watch   # Tests in watch mode
```

Tests live under `src/**/*.{test,spec}.{ts,tsx}` and use jsdom environment with setup at `src/test/setup.ts`. To run a single test file: `npx vitest run src/path/to/file.test.ts`.

## Environment Variables

The app requires a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```
The app will throw at startup if these are missing.

## Architecture

**Multi-tenant SaaS** appointment booking platform (Israeli market — Hebrew UI, RTL). Each business is a tenant with strict data isolation via `business_id`.

### Route Structure (`src/App.tsx`)

| Path | Purpose | Auth |
|---|---|---|
| `/b/:slug` | Public business landing page | None |
| `/b/:slug/book` | Booking wizard | None |
| `/b/:slug/success` | Booking confirmation | None |
| `/admin/*` | Business owner panel | `AdminAuthContext` |
| `/super-admin/*` | Platform-wide admin | `SuperAdminRoute` |
| `/dashboard`, `/my-bookings` | Client portal | `ClientAuthContext` |

All pages are **lazy-loaded**. The `/b/:slug/*` routes are wrapped in `BusinessProvider`.

### Context Providers (load order matters)

- **`AdminAuthContext`** — Admin auth; checks `user_roles` table for `role = 'admin'` after Supabase login
- **`BookingContext`** — Multi-step booking state (service → date → time → customer details). Selecting a new step resets all downstream selections.
- **`ClientAuthContext`** — Client OAuth/magic-link auth
- **`BusinessContext`** — Fetches business by `:slug` via `get_business_by_slug` RPC; provides `businessId` to all child hooks. Use `useBusiness()` inside `/b/:slug` routes.

### Data Layer

- **Supabase client**: `@/integrations/supabase/client` — do not edit (auto-generated). Likewise, `src/integrations/supabase/types.ts` is generated.
- **Tanstack Query** throughout with global config: 3 min staleTime, 30 min gcTime, 1 retry, no refetch-on-focus.
- **Key hooks**: `useSettings(businessId?)`, `useServices()`, `useMonthAvailability()`, `useAvailabilityCounts()`
- `useSettings` resolves settings by `business_id` → `admin_user_id` → fallback to first row. Always pass `businessId` explicitly in multi-tenant contexts.

### Database Tables (see `supabase/full_schema.sql`)

`services`, `settings`, `bookings`, `blocked_slots`, `portfolio_images`, `reviews`, `user_roles`, `waiting_list`

All tables have RLS enabled. Multi-tenant isolation is enforced by filtering on `business_id` in every query.

### Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose |
|---|---|
| `send-whatsapp` | WhatsApp booking notifications |
| `create-payment-intent` / `confirm-payment` | Stripe integration |
| `send-reminders` | Scheduled booking reminders |
| `sync-to-google-calendar` / `create-google-calendar-event` / `delete-booking-with-calendar` | Google Calendar sync |
| `create-admin-user` | Admin provisioning |

### UI Conventions

- Components from **shadcn-ui** (`src/components/ui/`) built on Radix UI primitives
- **Tailwind CSS** with custom `glass-card` class used throughout admin/dashboard
- Path alias `@` resolves to `./src`
- `@/lib/utils.ts` — `cn()` helper for class merging (clsx + tailwind-merge)
- `@/lib/dateHelpers.ts` — Hebrew date formatting utilities

### Admin User Setup

Run `supabase/setup_admin.sql` in the Supabase SQL editor to create the initial admin account, or invoke the `create-admin-user` Edge Function.
