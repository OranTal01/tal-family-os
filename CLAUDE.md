@AGENTS.md
# The Tal Family OS

## Project overview

The Tal Family OS is a private family operating system for Oran and Danielle Tal.
The first active module is **Finance**. Household: אורן, דניאל, אריאה, אלי.
The application is Hebrew-first, RTL-first, responsive, and supports Light, Dark, and
System themes. Visual direction: **Financial Calm** — calm, trustworthy, premium,
non-judgmental. Not a spreadsheet, not a trading platform, no aggressive gradients.

## Source of truth

Before implementing or modifying product UI, read these files completely:

- `docs/design-system-and-mvp.pdf`
- `docs/product-design-handoff.pdf`

Tip: the companion `docs/*.dc.html` files embed the exact spec data (tokens, 14 screens
with routes/states/copy, 24 component specs) as JS objects — extract data from them
rather than re-OCRing the PDFs. The PDFs are the rendered visual truth.

Distilled specs live in `docs/PRODUCT_SPEC.md` (screens, UX rules, copy rules, a11y),
`docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/IMPLEMENTATION_PLAN.md` (status).
Do not replace the supplied Financial Calm design with generic UI.

## Current stack (verified — inspect `package.json` before assuming)

- **Next.js 16.2.10** App Router. ⚠️ Differs from training data — read
  `node_modules/next/dist/docs/` first. `params`/`searchParams` are Promises.
- React 19.2.4 · TypeScript strict · **Tailwind v4** (CSS-first `@theme` in
  `src/app/globals.css`, no tailwind.config)
- **shadcn/ui v4**, style `base-nova`, on **@base-ui/react** (not Radix); `rtl: true`
  in components.json; add components with `npx shadcn@latest add <name>`
- next-themes (`attribute="class"`), Assistant font via `next/font/google`
- Icons: **Material Symbols Rounded** (`material-symbols` package) via
  `src/components/ui/icon.tsx` — not lucide (lucide only inside shadcn internals)
- zod, date-fns, Vitest + Testing Library (jsdom)
- Use **npm**.

## Design tokens (Calm Financial — do not alter the palette)

CSS custom properties in `globals.css`, Light on `:root`, Dark on `.dark`, exposed to
Tailwind via `@theme inline` (`bg-surface`, `text-ink`, `text-pos`, `bg-warn-soft`…):

| token | Light | Dark | role |
|---|---|---|---|
| bg | #f3f5f4 | #0e1513 | app background |
| surface / -2 / -3 | #fff / #eef2f0 / #e4eae7 | #161f1d / #1f2a27 / #293632 | cards / fields / hover |
| line | rgba(20,45,42,.11) | rgba(255,255,255,.11) | borders |
| ink / ink-2 / mut | #1b2a28 / #3a4a47 / #6a7a77 | #eef3f1 / #c6d2ce / #8a9f9a | text |
| accent / -ink / -soft | #3f7d9e / #2b5f7f / #e7eff4 | #66a9cb / #9fcadd / #1a2e38 | brand/actions |
| pos / pos-soft | #3f8f6d / #e6f1eb | #5cb089 / #152b22 | positive/ok |
| near / near-soft | #a9772a / #f5ecdb | #d3a24f / #312a19 | approaching limit |
| warn / warn-soft | #b5623a / #f5e6dd | #d0855b / #33231b | overspend/error |

Type (Assistant, tabular numerals for amounts): Display 30/800 · Title 22/800 ·
Heading 18/700 · Subhead 15/700 · Body 14/400 · Body-strong 14/700 · Caption 12/600 ·
Micro 10.5/700. Radii: sm 8 / md 12 / lg 16 / xl 22 / pill. Spacing: 4px grid.
Shadows sm/md/lg per ARCHITECTURE. Motion 120/200/320ms `cubic-bezier(.2,.7,.2,1)`.
Breakpoints: <640 / 640–1023 / 1024–1439 / ≥1440 (content max 1360px).

## Core requirements

- Hebrew-first UI (real product copy from the design docs — no lorem ipsum)
- RTL-first: CSS **logical properties only** (`ms-/me-/ps-/pe-/inset-inline-*/text-start`);
  never left/right utilities in app code; directional icons flip; time-forward = left
- Light, Dark, and System modes — same structure, only semantic colors/surfaces adapt
- WCAG AA; financial meaning **never by color alone** (always icon + text + color)
- Household and business expenses clearly separated — business totals never mixed into
  household budget/balance/projection (business income does count as family income)
- Internal transfers (Bit/PayBox/bank/cash between owned accounts) are never income or
  expense; ATM withdrawal = transfer bank→cash, cleaner payment = the expense
- Installments: only the current month's portion counts in that month's spending
- Money: **integer agorot** (branded `Agorot`), never floating point; format only via
  `lib/format/currency.ts` (`₪12,450`, `−` U+2212, LTR-embedded, no agorot by default)
- Mock data mathematically consistent across screens: totals are always **computed by
  `lib/finance/` engine functions from `src/mocks/`** — never hardcoded per screen

## Development rules

- Inspect existing code before editing
- Do not overwrite unrelated user changes
- Use TypeScript strict mode
- Avoid `any` (no `any` without written justification; no ignored TS/ESLint errors)
- Use Server Components by default
- Use Client Components only when interaction requires them
- Keep financial calculation logic separate from UI — it lives in `src/lib/finance/`
  (pure, tested)
- Data access goes through repository interfaces in `src/server/data/` (mock now,
  Supabase later); UI never imports `src/mocks/` directly
- Routes centralized in `src/lib/routes.ts`
- Use reusable components (`src/components/finance`, `src/components/shell`)
- Do not hardcode duplicated design values — use tokens
- Do not commit secrets
- Do not connect to real banks yet; no paid services
- Do not push to GitHub unless explicitly requested

## Required validation

Before declaring work complete, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
