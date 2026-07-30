# The Tal Family OS · כספי הבית

Private family operating system for the Tal family. First active module: **Finance** —
a calm, Hebrew-first, RTL-first family finance dashboard ("Financial Calm" design).

> Private software for one household. Authentication, household membership, finance
> screens, categorized XLSX imports, learned merchant rules, recurring expenses, and
> imported bank-balance snapshots are persisted in Supabase. No sample finance records
> are shown or seeded.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /dashboard
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (financial engine + component tests) |
| `npm run test:watch` | Vitest watch mode |
| `npm run build` | Production build |

All four checks (lint, typecheck, test, build) must pass before work is considered done.

## Stack

Next.js 16.2.12 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
shadcn/ui v4 (base-nova / @base-ui/react) · next-themes · Assistant font ·
Material Symbols Rounded · Supabase · read-excel-file/fflate · zod · date-fns ·
Vitest + Testing Library.

## Documentation

- `CLAUDE.md` — permanent engineering source of truth (stack facts, tokens, rules)
- `docs/PRODUCT_SPEC.md` — product scope, 14 screens, UX/content/a11y rules
- `docs/ARCHITECTURE.md` — folder structure, principles, deferred decisions
- `docs/DATA_MODEL.md` — Supabase/PostgreSQL-ready schema (money = bigint agorot)
- `docs/IMPLEMENTATION_PLAN.md` — phase status
- `docs/design-system-and-mvp.pdf`, `docs/product-design-handoff.pdf` — the design
  source of truth (visuals + full spec; `.dc.html` companions embed the raw data)

## Screens (14)

`/dashboard` לוח חודשי · `/budget` תקציב · `/transactions` תנועות ·
`/transactions/review` לבדיקה · `/planning` תכנון וצפי · `/split` בית מול עסק ·
`/business` עסק דניאל · `/assets` נכסים וחיסכון · `/insurance` ביטוחים ·
`/goals` יעדים · `/kids` חיסכון ילדים · `/accounts` חשבונות וכרטיסים ·
`/daily` סיכום יומי · `/settings` הגדרות

## Environment

Authenticated routes require the Supabase publishable URL and key documented in
`.env.example`. Never commit secrets, service-role keys, or raw financial exports.
