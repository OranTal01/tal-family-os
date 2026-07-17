# The Tal Family OS — Finance Module · Product Specification

> Derived from the design source of truth: `docs/design-system-and-mvp.pdf` and
> `docs/product-design-handoff.pdf` (and their `.dc.html` companions, which embed the
> exact data). Where this file and the design docs disagree, the design docs win.

## 1. Product overview

Private family operating system for **אורן טל** and **דניאל טל**. Finance is the first
active module. Household members: אורן, דניאל, and the children אריאה and אלי.

### Goals (from handoff §1)

- One calm, trustworthy picture of the family's money at any moment.
- Clear separation between what already happened (הוצאה בפועל) and what is expected (צפוי).
- Projected end-of-month balance (יתרה חזויה) and surplus/deficit (מאזן) as the central
  actionable information.
- Routine tasks — classification, confirmation, category fixes — as two-tap actions.
- Absolute separation between household money and Danielle's business (עוסק מורשה).

### Users

| User | Description |
|---|---|
| אורן טל | Employee (salaried). Primary mobile user; quick checks 1–2×/day. |
| דניאל טל | Employee + עוסק מורשה. Needs separate business view + VAT reminders. |
| Both together | Monthly planning on desktop — budget, goals, big decisions. |
| Accountant (future) | Read-only access to business data — out of MVP. |

### In MVP scope

Dashboard, budget, transactions, review queue, planning/expected expenses, household vs
business, Danielle's business view, assets/pensions/savings, insurance, goals, children's
savings, accounts/cards/wallets + sync status, daily summary, settings/household members,
Light/Dark/System.

### Out of scope (deliberate)

Investment advice/trading, actual tax/VAT filing, paying bills from the app, multi-household,
accountant access/graded permissions, multi-currency, calendars/tasks/shopping/other modules,
real bank connections (mock data only in this phase), paid services.

## 2. Core financial rules

### Income

- Predictable employee salaries for both partners.
- Danielle also has variable business income (Instagram collaborations, legal/business work)
  arriving via bank transfer, **Bit**, or **PayBox**.
- All business income is family income, but retains business origin for business reporting.
- Three income classes, never conflated:
  - **expected guaranteed** (salary) · **expected uncertain** (business estimates) ·
    **received** (actual).
- Uncertain income is never presented as guaranteed.

### Budgets

- Monthly budget = sum of category budgets. Categories are dynamic: create, rename,
  reorder, archive. Categories with historical transactions are archived, never hard-deleted.
- Category priority: essential / important / flexible / discretionary
  (חיוני / חשוב / גמיש / רשות).
- Each category exposes: allocated, actual, remaining, utilization %, projected month-end,
  status (תקין / קרוב לגבול ≥80% / חריגה >100%).

### Overspending

- Spending stays in the month it occurred; history is never moved.
- Compensation options: reallocate from another category, reduce a future month's budget,
  mark as exceptional, or raise the current category budget.
- Every budget adjustment is audited (who, when, what, one-time vs permanent).

### Accounts & payment sources

Account types: shared bank account, credit card, digital wallet, cash, investment,
savings, pension/education fund, other. Initial real accounts: חשבון משותף (bank),
כרטיס אורן, כרטיס דניאל, **Bit**, **PayBox**, מזומן (rare).

- Bit and PayBox are real wallets: income into them counts immediately; payments from them
  are expenses.
- Transfers between owned accounts (Bit ↔ bank ↔ PayBox ↔ cash) are **internal transfers**
  and are never income or expense. UI: marked "העברה", neutral gray, swap icon.
- ATM withdrawal = internal transfer bank→cash; the cleaner payment from cash is the expense.

### Installments (תשלומים)

Store the full purchase commitment and the monthly amount. Show: original amount,
number of installments, paid, remaining, next installment, future monthly commitments.
Only the current month's installment counts against that month's spending; the rest is
weighted into future expected commitments. Row copy: "תשלום 2 מתוך 12".

### Household vs business

- Household is primary. Business totals are never silently mixed into household expense
  totals; business income may contribute to total family income.
- Business reporting: revenue, expenses, profit before tax, plus a VAT-oriented
  informational card (מע״מ לתשלום + next reporting date). No official tax filing.
- Business transactions carry an "עסק" tag + storefront icon and appear only in the
  business view; misclassification is fixable in one tap.

### Review queue (לבדיקה)

Low classification confidence never auto-decides. A review item asks the user to confirm:
category, household/business, owner, internal-transfer status, and whether to remember the
decision ("זכור כלל זה" → reusable merchant rule, managed in settings). One clear reason +
one primary action per card. Resolution is instant with undo via toast.

### Goals & long-term

- Goals: יעד דירה, חיסכון אריאה, חיסכון אלי (emergency fund supported by architecture,
  not prominent).
- Assets: education funds (קרנות השתלמות), pensions, provident funds, savings, children's
  savings, investment accounts, liabilities → net worth (שווי נטו = נכסים − התחייבויות).
  Net worth includes both household and business.

### Insurance

Policies: provider, insured person, type, premium, coverage summary, renewal date, status,
document reference. Renewal-due flagged with icon + text ("חידוש 20/08").

### Daily summary

Scheduled 21:30 Asia/Jerusalem (architecture only; no paid notification provider).
Contents: today's expenses/income, category breakdown, אורן vs דניאל spending, monthly
budget position, categories near/over limit, unusual charges, upcoming large payments,
review items, projected EOM position, dashboard link.

### Carry-over

Month-end surplus/deficit may roll into next month as "יתרת פתיחה" — **opt-in, off by
default**, always displayed as a separate "מהחודש הקודם" line, never blended into income.

## 3. Information architecture & navigation

Primary nav (desktop sidebar, fixed inline-start/right, 206px): לוח חודשי, תקציב חודשי,
תנועות, לבדיקה (badge), תכנון וצפי, בית מול עסק, נכסים וחיסכון, ביטוחים,
חשבונות וכרטיסים, הגדרות. Secondary (via "עוד" on mobile): סיכום יומי and the rest.

Mobile bottom nav (5): לוח · תקציב · תנועות · נכסים · עוד. "עוד" opens a sheet with
תכנון, בית/עסק, עסק דניאל, ביטוחים, יעדים, חיסכון ילדים, חשבונות, סיכום יומי, הגדרות.
Active item: accent-ink + filled icon + 3px bar; touch targets ≥44px.

Entry: `/dashboard` is home after login. Every screen has a unique deep-linkable route.
Rings open detail: bottom sheet (<1024px) / centered modal (≥1024px).

## 4. Screen inventory (14)

| # | Screen | Route | Purpose |
|---|---|---|---|
| 1 | לוח חודשי ראשי | `/dashboard` | Actionable month overview: projected balance, KPIs, cashflow bar, rings, recent txns, upcoming, insights, alerts |
| 2 | תקציב חודשי | `/budget` | Category rings, budget editing, category detail sheet |
| 3 | תנועות | `/transactions` | Search, filters, tabs, day-grouped list / desktop table |
| 4 | תנועות לבדיקה | `/transactions/review` | Action queue: one reason + one primary action per card |
| 5 | תכנון וצפי הוצאות | `/planning` | Fixed / variable-estimate / one-time groups + projected balance |
| 6 | בית מול עסק | `/split` | Side-by-side household (primary) vs business + VAT reminder |
| 7 | מבט עסק דניאל | `/business` | Business KPIs, VAT card + reporting date, business transactions |
| 8 | נכסים, פנסיה וחיסכון | `/assets` | Net worth, assets vs liabilities list |
| 9 | ביטוחים | `/insurance` | Policies with premium, coverage, renewal status |
| 10 | יעדים פיננסיים | `/goals` | Goals with progress, forecast, deposits |
| 11 | חיסכון ילדים — אריאה ואלי | `/kids` | Two separate child savings tracks |
| 12 | חשבונות וכרטיסים | `/accounts` | Connected sources + sync status (ok/syncing/error) |
| 13 | סיכום יומי | `/daily` | 15-second daily digest |
| 14 | הגדרות ובני משק בית | `/settings` | Members, preferences, theme, notifications, security, backup |

Every screen ships default + loading (skeleton) + empty + error states, with the exact
Hebrew copy specified in the handoff (e.g., review empty state: "הכול מסודר ✨ — אין תנועות
שדורשות בדיקה…"; dashboard error: partial-sync banner with last-known data + timestamp).

## 5. Dashboard requirements

Answers, in order: How are we doing vs budget? What remains? What was spent? What's still
expected? Projected month-end? What needs action now?

Sections: month selector + sync status, 5 KPI cards (הכנסה צפויה, הוצא בפועל, נותרו
צפויות, יתרה חזויה, מאזן החודש), cashflow bar (solid spent / dashed expected / positive
surplus), category rings (6–8 on desktop + "הכול" tile, compact 3-ring row on mobile),
recent transactions, upcoming payments, review summary, overspend alerts, calm insights.

Reference figures from the design (mock data must reproduce this *shape* coherently):
expected income ₪39,600 · spent ₪18,400 · expected remaining ₪15,600 · projected ₪28,850 ·
balance +₪5,600 · current ₪23,450 · total budget ₪34,000 (54% used).

## 6. UX rules (hard requirements)

1. **Actual vs expected**: actual = solid fill + certain amount; expected = dashed pattern +
   "צפוי/עתידי" label. Cashflow bar: solid (הוצא) / dashed (צפוי) / pos (עודף).
2. **Projected balance** always shown next to current: "כעת ₪23,450 · חזויה ₪28,850";
   projected = current + expected income − remaining expected expenses; labeled a forecast.
3. **Overspend**: ring/bar switches to warn tone, stops at 100%, label "חריגה +₪140" +
   `priority_high` icon. Never color alone. Factual, non-blaming tone.
4. **Internal transfers**: "העברה" + swap icon, neutral, excluded from income/expense/budget,
   link to the counterpart account.
5. **Business transactions**: "עסק" tag + storefront icon; excluded from household
   budget/balance/projection; visible only in business view.
6. **Unclassified**: enter review queue with a reason; smart category suggestions first;
   instant resolution + toast undo.
7. **Installments**: "תשלום 2 מתוך 12" + monthly amount (+ total in expanded view).
8. **Category fix**: tap category in row/detail → picker; saved instantly; historical
   transactions unchanged unless explicitly applied retroactively.
9. **"זכור כלל זה"**: offer to auto-classify merchant in future; rule creation explicit,
   reversible, managed in Settings → classification rules.
10. **Budget edits**: immediately update ring + totals; logged; one-time (this month) or
    permanent (from next month).
11. **Carry-over**: opt-in; transparent separate line.

## 7. Content & formatting rules

- Currency: prefix `₪` attached, comma thousands (`₪12,450`), rounded to whole shekels by
  default (agorot only in transaction detail), tabular numerals, abbreviate big values
  (`₪2.42M`), amounts LTR-embedded inside RTL text, aligned to line start.
- Negative: true minus `−` (U+2212), regular ink — red only for overspend. Positive income:
  explicit `+` and pos-ink. Zero: `₪0`, never blank.
- Dates in Hebrew: "היום · 09:14", "אתמול", "14 ביולי", "1 באוגוסט"; months "יולי 2025".
- Tone: friendly second-person plural ("אתם בכיוון טוב"), short sentences, no accounting
  jargon, clear action verbs on buttons ("שמירה", "סיווג", "חיבור מחדש"), no exclamation
  marks, emoji only in isolated positive states. Insights: factual, one concrete step,
  states certainty ("צפוי", "בקצב הנוכחי"), never blames.

## 8. Accessibility (WCAG AA)

- Financial status never by color alone: icon + word + color (+ pattern/sign when relevant);
  meaningful in full grayscale.
- Keyboard: full Tab access in logical RTL order; Enter/Space activate; Esc closes layers;
  arrows in tabs/menus/date picker; focus trap in overlays with focus restore.
- Focus: `:focus-visible` ring 2px accent + halo, ≥3:1 contrast, never hidden.
- Screen readers: rings announce "קניות ומזון, נוצל 62 אחוז, נותרו 1,320 שקלים, תקין";
  amounts read with currency; decorative icons `aria-hidden`; live changes via polite
  `aria-live`.
- Contrast: body ≥4.5:1; large text/badges ≥3:1; verified in both themes.
- Touch ≥44×44px with spacing; `prefers-reduced-motion` → fade only, static spinners.
- RTL: `dir="rtl"` on document; logical properties only (no left/right); directional icons
  flip; "next" in time = left; SVG rings mirrored (`scaleX(-1)`).

## 9. Responsive behavior

| Aspect | Mobile <640 | Tablet 640–1023 | Desktop ≥1024 |
|---|---|---|---|
| Nav | Bottom bar 5 + עוד | Bottom bar or collapsed sidebar | Fixed sidebar 206px |
| KPI grid | 1 col / stacked 2×N | 2–3 cols | 5 in a row |
| Rings | 2–3 cols | 3–4 cols | 4 cols + "הכול" tile |
| Main layout | Single column | Wide single column | Two columns 2fr/1fr |
| Detail/form | Bottom sheet | Bottom sheet | Centered modal |
| Transactions | Day-grouped list | List/reduced table | Wide table |

Large desktop ≥1440: content locked to 1360px centered, gaps 24–32, rings size lg, no 4th
column. Horizontal scroll only for filter chips (scroll-snap) and the tablet transactions
table — never page-level. Sticky: top bar, desktop sidebar, mobile bottom nav, sheet
primary action. Amounts never wrap; long merchant names truncate with `…` + full title.

## 10. Edge cases

- Amounts ≥₪1M abbreviated (M/K) with tooltip for exact value.
- Overspend >200%: ring still stops at 100%; exact amount in text.
- Partial sync: show last-known data + timestamp + banner, never a blank screen.
- Future months: everything labeled "תכנון/צפי", no "הוצא בפועל".
- Multi-month installment: only monthly part in current budget.

## 11. Glossary

| Term | Meaning |
|---|---|
| יתרה חזויה | Current + expected income − remaining expected expenses |
| מאזן החודש | Expected income − expected expenses (surplus/deficit) |
| הוצא בפועל | Money already out this month (certain) |
| נותרו צפויות | Planned expenses not yet executed (future, dashed) |
| לבדיקה | Transaction requiring classification/identification/confirmation |
| העברה | Movement between family-owned accounts — not income/expense |
| עוסק מורשה | Danielle's business status; data separated from household |
| שווי נטו | Total assets − total liabilities |
