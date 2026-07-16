@AGENTS.md
# The Tal Family OS

## Project overview

The Tal Family OS is a private family operating system for Oran and Danielle.

The first active module is Finance.

The application is Hebrew-first, RTL-first, responsive, and supports Light, Dark, and System themes.

## Source of truth

Before implementing or modifying product UI, read these files completely:

- `docs/design-system-and-mvp.pdf`
- `docs/product-design-handoff.pdf`

These files are the source of truth for:

- product scope
- visual design
- design tokens
- screens
- reusable components
- responsive behavior
- accessibility
- UX rules
- developer handoff requirements

Do not replace the supplied Financial Calm design with generic UI.

## Current stack

Inspect `package.json` before making assumptions.

The project currently uses:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- next-themes

Use npm unless the repository indicates otherwise.

## Core requirements

- Hebrew-first UI
- RTL-first layout
- use CSS logical properties
- Light, Dark, and System modes
- WCAG AA where practical
- financial meaning must never rely on color alone
- household and business expenses must remain clearly separated
- internal transfers must not count as income or expense
- money calculations must never use floating-point arithmetic
- mock data must remain mathematically consistent across screens

## Development rules

- Inspect existing code before editing
- Do not overwrite unrelated user changes
- Use TypeScript strict mode
- Avoid `any`
- Use Server Components by default
- Use Client Components only when interaction requires them
- Keep financial calculation logic separate from UI
- Use reusable components
- Do not hardcode duplicated design values
- Do not commit secrets
- Do not connect to real banks yet
- Do not push to GitHub unless explicitly requested

## Required validation

Before declaring work complete, run:

```bash
npm run lint
npm run build
