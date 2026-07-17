import type {
  ExpectedTransaction,
  IncomeSource,
  InstallmentPlan,
  MerchantRule,
  ReviewItem,
  Transaction,
} from '@/types/domain';
import { ils, type Agorot } from '@/types/money';
import {
  currentMonthKey,
  shiftMonth,
  toISODate,
  type ISODate,
  type MonthKey,
} from '@/lib/format/date';
import { chargeMonths, monthlyPortion, sequenceInMonth } from '@/lib/finance/installments';
import { categories } from '@/mocks/core';

/**
 * The activity dataset is generated relative to the real current date so the
 * in-month story always makes sense (recent purchases in the last ~2 weeks,
 * recurring charges on their fixed days, future fixed charges still pending).
 * No aggregate is stored anywhere — screens compute via lib/finance.
 */

const today = new Date();
const todayDay = today.getDate();
const m0 = currentMonthKey();

function daysAgo(n: number): ISODate {
  return toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
}

/** day-of-month within a shifted month; clamped to that month's length */
function monthDay(monthDelta: number, day: number): ISODate {
  const base = new Date(today.getFullYear(), today.getMonth() + monthDelta, 1);
  const clamped = Math.min(day, new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate());
  return toISODate(new Date(base.getFullYear(), base.getMonth(), clamped));
}

const categoryIcon = new Map(categories.map((c) => [c.id, c.icon]));

let seq = 0;
function tx(partial: Omit<Transaction, 'id' | 'icon'> & { icon?: string }): Transaction {
  seq += 1;
  return {
    id: `txn-${seq.toString().padStart(3, '0')}`,
    icon: partial.icon ?? (partial.categoryId ? categoryIcon.get(partial.categoryId)! : 'help'),
    ...partial,
  };
}

function expense(
  merchant: string,
  shekels: number,
  date: ISODate,
  categoryId: string,
  accountId: string,
  extra: Partial<Transaction> = {},
): Transaction {
  return tx({
    merchant,
    amount: ils(-shekels) as Agorot,
    date,
    categoryId,
    accountId,
    context: 'household',
    kind: 'expense',
    ...extra,
  });
}

/* -------------------------------- installments -------------------------------- */

export const installmentPlans: InstallmentPlan[] = [
  {
    id: 'plan-table',
    merchant: 'רהיטי הדר — שולחן אוכל',
    icon: 'chair',
    totalAmount: ils(4800),
    monthlyAmount: ils(400),
    count: 12,
    firstChargeMonth: shiftMonth(m0, -3),
    accountId: 'acc-card-oran',
    categoryId: 'cat-housing',
    context: 'household',
  },
  {
    id: 'plan-ac',
    merchant: 'אלקטרה — מזגן לסלון',
    icon: 'mode_fan',
    totalAmount: ils(3600),
    monthlyAmount: ils(600),
    count: 6,
    firstChargeMonth: shiftMonth(m0, -1),
    accountId: 'acc-card-danielle',
    categoryId: 'cat-housing',
    context: 'household',
  },
];

/** monthly installment charges up to today (only the month's own portion) */
function installmentCharges(): Transaction[] {
  const chargeDay: Record<string, number> = { 'plan-table': 6, 'plan-ac': 10 };
  const rows: Transaction[] = [];
  for (const plan of installmentPlans) {
    for (const month of chargeMonths(plan)) {
      if (month > m0) continue;
      const day = chargeDay[plan.id];
      if (month === m0 && day > todayDay) continue;
      const s = sequenceInMonth(plan, month)!;
      rows.push(
        tx({
          merchant: plan.merchant,
          icon: plan.icon,
          amount: (-monthlyPortion(plan, month)) as Agorot,
          date: monthDay(monthDelta(month), day),
          categoryId: plan.categoryId,
          accountId: plan.accountId,
          context: 'household',
          kind: 'expense',
          installment: { planId: plan.id, sequence: s },
        }),
      );
    }
  }
  return rows;
}

function monthDelta(month: MonthKey): number {
  const [y0, mm0] = m0.split('-').map(Number);
  const [y1, mm1] = month.split('-').map(Number);
  return (y1 - y0) * 12 + (mm1 - mm0);
}

/* ---------------------------- recurring (3 months) ---------------------------- */

function recurring(): Transaction[] {
  const rows: Transaction[] = [];
  for (const delta of [-2, -1, 0]) {
    const push = (day: number, build: (date: ISODate) => Transaction) => {
      if (delta === 0 && day > todayDay) return;
      rows.push(build(monthDay(delta, day)));
    };
    push(1, (date) =>
      expense('משכנתא — בנק הפועלים', 6200, date, 'cat-housing', 'acc-joint', { icon: 'account_balance' }),
    );
    push(3, (date) => expense('ועד בית', 450, date, 'cat-housing', 'acc-joint'));
    push(10, (date) => expense('צהרון — עיריית ת״א', 2300, date, 'cat-education', 'acc-joint'));
    push(10, (date) =>
      tx({
        merchant: 'העברת שכר — דניאל',
        icon: 'south_west',
        amount: ils(18200),
        date,
        accountId: 'acc-joint',
        context: 'household',
        ownerId: 'danielle',
        kind: 'income',
        incomeClass: 'salary',
      }),
    );
    push(25, (date) =>
      tx({
        merchant: 'העברת שכר — אורן',
        icon: 'south_west',
        amount: ils(21400),
        date,
        accountId: 'acc-joint',
        context: 'household',
        ownerId: 'oran',
        kind: 'income',
        incomeClass: 'salary',
      }),
    );
  }
  return rows;
}

/* ------------------------- current-period variable rows ------------------------ */

function currentVariable(): Transaction[] {
  const co = 'acc-card-oran';
  const cd = 'acc-card-danielle';
  return [
    // סופר וקניות — groceries
    expense('שופרסל דיל', 486, daysAgo(0), 'cat-groceries', co, { time: '09:14', ownerId: 'oran' }),
    expense('רמי לוי', 288, daysAgo(2), 'cat-groceries', cd, { ownerId: 'danielle' }),
    expense('רמי לוי', 512, daysAgo(5), 'cat-groceries', cd, { ownerId: 'danielle' }),
    expense('ויקטורי', 298, daysAgo(9), 'cat-groceries', cd, { ownerId: 'danielle' }),
    expense('שופרסל', 420, daysAgo(12), 'cat-groceries', co, { ownerId: 'oran' }),
    expense('מכולת השכונה', 176, daysAgo(15), 'cat-groceries', co, { ownerId: 'oran' }),
    // מסעדות ומשלוחים
    expense('Wolt', 164, daysAgo(0), 'cat-restaurants', cd, { time: '20:32', ownerId: 'danielle' }),
    expense('גרג קפה', 52, daysAgo(1), 'cat-restaurants', co, { ownerId: 'oran' }),
    expense('לוקנדה — ארוחה זוגית', 337, daysAgo(4), 'cat-restaurants', co, { ownerId: 'oran' }),
    expense('דומינו׳ס פיצה', 118, daysAgo(6), 'cat-restaurants', cd, { ownerId: 'danielle' }),
    expense('מסעדה משפחתית', 320, daysAgo(8), 'cat-restaurants', co, { ownerId: 'oran' }),
    expense('Wolt', 186, daysAgo(11), 'cat-restaurants', cd, { ownerId: 'danielle' }),
    expense('Wolt', 217, daysAgo(12), 'cat-restaurants', cd, { ownerId: 'danielle' }),
    expense('קפה נמרוד', 94, daysAgo(13), 'cat-restaurants', co, { ownerId: 'oran' }),
    expense('Wolt', 152, daysAgo(15), 'cat-restaurants', cd, { ownerId: 'danielle' }),
    // ילדים
    expense('משחקים ועוד', 385, daysAgo(3), 'cat-kids', cd, { ownerId: 'danielle' }),
    expense('חוג התעמלות — אריאה', 240, daysAgo(8), 'cat-kids', 'acc-joint'),
    expense('קייטנת יום — אלי', 480, daysAgo(10), 'cat-kids', 'acc-joint'),
    expense('צעצועים ר', 130, daysAgo(11), 'cat-kids', cd, { ownerId: 'danielle' }),
    expense('ספרי ילדים — צומת', 85, daysAgo(14), 'cat-kids', co, { ownerId: 'oran' }),
    // חינוך
    expense('חוג מוזיקה — אריאה', 430, daysAgo(12), 'cat-education', 'acc-joint'),
    // מנקה — במזומן (הכלל: המשיכה בכספומט היא העברה; התשלום הוא ההוצאה)
    expense('מנקה — תשלום שבועי', 450, daysAgo(2), 'cat-cleaner', 'acc-cash'),
    expense('מנקה — תשלום שבועי', 450, daysAgo(13), 'cat-cleaner', 'acc-cash'),
    // חשמל · תקשורת
    expense('חברת חשמל', 612, daysAgo(3), 'cat-electricity', 'acc-joint'),
    expense('HOT', 219, daysAgo(9), 'cat-telecom', 'acc-joint'),
    expense('Partner', 211, daysAgo(9), 'cat-telecom', 'acc-joint'),
    // ביגוד — חריגה מכוונת (+₪140)
    expense('ZARA', 290, daysAgo(4), 'cat-clothing', cd, { ownerId: 'danielle' }),
    expense('קסטרו', 360, daysAgo(8), 'cat-clothing', cd, { ownerId: 'danielle' }),
    expense('נעלי גלי', 290, daysAgo(12), 'cat-clothing', co, { ownerId: 'oran' }),
    // תחבורה — כולל זיכוי (החזר מקטין את ההוצאה בחודש שלו)
    expense('פנגו', 42, daysAgo(1), 'cat-transport', co, { ownerId: 'oran' }),
    tx({
      merchant: 'זיכוי — פנגו',
      icon: 'directions_car',
      amount: ils(25),
      date: daysAgo(3),
      categoryId: 'cat-transport',
      accountId: co,
      context: 'household',
      ownerId: 'oran',
      kind: 'refund',
    }),
    expense('פנגו', 38, daysAgo(5), 'cat-transport', cd, { ownerId: 'danielle' }),
    expense('פז — דלק', 300, daysAgo(7), 'cat-transport', co, { ownerId: 'oran' }),
    expense('חניון אחוזת החוף', 45, daysAgo(10), 'cat-transport', co, { ownerId: 'oran' }),
    expense('סונול — דלק', 280, daysAgo(14), 'cat-transport', cd, { ownerId: 'danielle' }),
    // ביטוחים
    expense('הפניקס — ביטוח', 438, daysAgo(4), 'cat-insurance', 'acc-joint'),
    expense('מגדל — ביטוח דירה', 95, daysAgo(6), 'cat-insurance', 'acc-joint'),
    expense('מנורה — אובדן כושר', 88, daysAgo(10), 'cat-insurance', 'acc-joint'),
    expense('כלל — בריאות', 180, daysAgo(11), 'cat-insurance', 'acc-joint'),
    // בריאות ופארם
    expense('סופר-פארם', 286, daysAgo(1), 'cat-health', cd, { ownerId: 'danielle' }),
    // בילויים — חריגה מכוונת (+₪140), כולל חשד לחיוב כפול
    expense('סינמה סיטי', 96, daysAgo(5), 'cat-fun', co, { ownerId: 'oran' }),
    expense('נטפליקס', 56, daysAgo(7), 'cat-fun', cd, { ownerId: 'danielle' }),
    expense('נטפליקס', 56, daysAgo(7), 'cat-fun', cd, {
      ownerId: 'danielle',
      needsReview: true,
      reviewReason: 'possible_duplicate',
      icon: 'content_copy',
    }),
    expense('הצגת ילדים', 280, daysAgo(11), 'cat-fun', 'acc-joint'),
    expense('בריכת גורדון', 162, daysAgo(12), 'cat-fun', co, { ownerId: 'oran' }),
    expense('מופע סטנדאפ', 240, daysAgo(15), 'cat-fun', cd, { ownerId: 'danielle' }),
    // מתנות
    expense('מתנה לחתונה — Buyme', 400, daysAgo(6), 'cat-gifts', co, { ownerId: 'oran' }),
    // לבדיקה — ללא קטגוריה / לא מזוהה
    tx({
      merchant: 'KSP',
      icon: 'devices',
      amount: ils(-1249),
      date: daysAgo(3),
      accountId: co,
      context: 'household',
      ownerId: 'oran',
      kind: 'expense',
      needsReview: true,
      reviewReason: 'uncategorized',
    }),
    tx({
      merchant: 'חיוב לא מזוהה',
      icon: 'help',
      amount: ils(-317),
      date: daysAgo(5),
      accountId: co,
      context: 'household',
      kind: 'expense',
      needsReview: true,
      reviewReason: 'unrecognized_merchant',
    }),
    // הכנסה שלא סווגה — אולי העברה פנימית
    tx({
      merchant: 'העברה נכנסת',
      icon: 'south_west',
      amount: ils(1200),
      date: daysAgo(6),
      accountId: 'acc-joint',
      context: 'household',
      kind: 'income',
      incomeClass: 'other',
      needsReview: true,
      reviewReason: 'possible_transfer',
    }),
  ];
}

/* --------------------------- business (current period) ------------------------- */

function currentBusiness(): Transaction[] {
  return [
    tx({
      merchant: 'העברה מלקוח — ייעוץ משפטי',
      icon: 'gavel',
      amount: ils(7400),
      date: daysAgo(12),
      accountId: 'acc-business',
      context: 'business',
      ownerId: 'danielle',
      kind: 'income',
      incomeClass: 'business',
    }),
    // הכנסת עסק שהתקבלה ב-Bit — נספרת מיידית, פעם אחת
    tx({
      merchant: 'שיתוף פעולה באינסטגרם — Bit',
      icon: 'photo_camera',
      amount: ils(2600),
      date: daysAgo(5),
      accountId: 'acc-bit',
      context: 'business',
      ownerId: 'danielle',
      kind: 'income',
      incomeClass: 'business',
    }),
    tx({
      merchant: 'סדנת תוכן — PayBox',
      icon: 'groups',
      amount: ils(2400),
      date: daysAgo(2),
      accountId: 'acc-paybox',
      context: 'business',
      ownerId: 'danielle',
      kind: 'income',
      incomeClass: 'business',
    }),
    tx({
      merchant: 'צלם תוכן — סטודיו אור',
      icon: 'work',
      amount: ils(-1100),
      date: daysAgo(9),
      accountId: 'acc-business',
      context: 'business',
      ownerId: 'danielle',
      kind: 'expense',
      categoryId: 'cat-biz-services',
    }),
    tx({
      merchant: 'קמפיין ממומן — Meta',
      icon: 'campaign',
      amount: ils(-800),
      date: daysAgo(8),
      accountId: 'acc-business',
      context: 'business',
      ownerId: 'danielle',
      kind: 'expense',
      categoryId: 'cat-biz-marketing',
    }),
    tx({
      merchant: 'הנהלת חשבונות',
      icon: 'work',
      amount: ils(-600),
      date: daysAgo(5),
      accountId: 'acc-business',
      context: 'business',
      ownerId: 'danielle',
      kind: 'expense',
      categoryId: 'cat-biz-services',
    }),
    tx({
      merchant: 'KSP — עדשה למצלמה',
      icon: 'devices',
      amount: ils(-2400),
      date: daysAgo(3),
      accountId: 'acc-business',
      context: 'business',
      ownerId: 'danielle',
      kind: 'expense',
      categoryId: 'cat-biz-equipment',
    }),
  ];
}

/* ------------------------------ internal transfers ----------------------------- */

function transferPair(
  id: string,
  fromAccount: string,
  toAccount: string,
  shekels: number,
  date: ISODate,
  fromLabel: string,
  toLabel: string,
): Transaction[] {
  return [
    tx({
      merchant: fromLabel,
      icon: 'swap_horiz',
      amount: ils(-shekels),
      date,
      accountId: fromAccount,
      context: 'household',
      kind: 'transfer',
      transferId: id,
    }),
    tx({
      merchant: toLabel,
      icon: 'swap_horiz',
      amount: ils(shekels),
      date,
      accountId: toAccount,
      context: 'household',
      kind: 'transfer',
      transferId: id,
    }),
  ];
}

function currentTransfers(): Transaction[] {
  return [
    // משיכת מזומן לתשלום למנקה — העברה, לא הוצאה
    ...transferPair('tr-atm', 'acc-joint', 'acc-cash', 1000, daysAgo(15), 'משיכת מזומן — כספומט', 'הפקדת מזומן לקופה'),
    ...transferPair('tr-bit', 'acc-bit', 'acc-joint', 2000, daysAgo(4), 'העברה מ-Bit לעו״ש', 'העברה נכנסת מ-Bit'),
    ...transferPair('tr-paybox', 'acc-paybox', 'acc-joint', 1500, daysAgo(1), 'העברה מ-PayBox לעו״ש', 'העברה נכנסת מ-PayBox'),
  ];
}

/* --------------------------- prior months (history) ---------------------------- */

function priorMonths(): Transaction[] {
  const rows: Transaction[] = [];
  for (const delta of [-2, -1]) {
    const co = 'acc-card-oran';
    const cd = 'acc-card-danielle';
    rows.push(
      expense('שופרסל דיל', 820, monthDay(delta, 4), 'cat-groceries', co),
      expense('רמי לוי', 640, monthDay(delta, 11), 'cat-groceries', cd),
      expense('ויקטורי', 750, monthDay(delta, 18), 'cat-groceries', cd),
      expense('שופרסל', 910, monthDay(delta, 26), 'cat-groceries', co),
      expense('Wolt', 210, monthDay(delta, 7), 'cat-restaurants', cd),
      expense('מסעדה', 340, monthDay(delta, 15), 'cat-restaurants', co),
      expense('קפה', 75, monthDay(delta, 22), 'cat-restaurants', co),
      expense('פז — דלק', 320, monthDay(delta, 9), 'cat-transport', co),
      expense('פנגו', 60, monthDay(delta, 17), 'cat-transport', cd),
      expense('חברת חשמל', 590, monthDay(delta, 14), 'cat-electricity', 'acc-joint'),
      expense('HOT', 219, monthDay(delta, 8), 'cat-telecom', 'acc-joint'),
      expense('Partner', 211, monthDay(delta, 8), 'cat-telecom', 'acc-joint'),
      expense('ביטוחים — הוראות קבע', 1033, monthDay(delta, 13), 'cat-insurance', 'acc-joint'),
      expense('סופר-פארם', 190, monthDay(delta, 12), 'cat-health', cd),
      expense('נטפליקס', 56, monthDay(delta, 7), 'cat-fun', cd),
      expense('סינמה סיטי', 120, monthDay(delta, 20), 'cat-fun', co),
      expense('H&M', 240, monthDay(delta, 16), 'cat-clothing', cd),
      expense('מנקה — תשלום שבועי', 450, monthDay(delta, 6), 'cat-cleaner', 'acc-cash'),
      expense('מנקה — תשלום שבועי', 450, monthDay(delta, 20), 'cat-cleaner', 'acc-cash'),
      ...transferPair(`tr-atm${delta}`, 'acc-joint', 'acc-cash', 1000, monthDay(delta, 5), 'משיכת מזומן — כספומט', 'הפקדת מזומן לקופה'),
      tx({
        merchant: 'העברה מלקוח — ריטיינר',
        icon: 'gavel',
        amount: ils(6800),
        date: monthDay(delta, 12),
        accountId: 'acc-business',
        context: 'business',
        ownerId: 'danielle',
        kind: 'income',
        incomeClass: 'business',
      }),
      tx({
        merchant: 'שיתוף פעולה באינסטגרם — Bit',
        icon: 'photo_camera',
        amount: ils(1900),
        date: monthDay(delta, 19),
        accountId: 'acc-bit',
        context: 'business',
        ownerId: 'danielle',
        kind: 'income',
        incomeClass: 'business',
      }),
      tx({
        merchant: 'קמפיין ממומן — Meta',
        icon: 'campaign',
        amount: ils(-700),
        date: monthDay(delta, 9),
        accountId: 'acc-business',
        context: 'business',
        ownerId: 'danielle',
        kind: 'expense',
        categoryId: 'cat-biz-marketing',
      }),
    );
    // ההיסטוריה של הקטגוריה בארכיון נשמרת (חיות מחמד)
    if (delta === -2) {
      rows.push(expense('וטרינר — ד״ר כץ', 380, monthDay(delta, 21), 'cat-pets', co));
    }
  }
  return rows;
}

export const transactions: Transaction[] = [
  ...recurring(),
  ...installmentCharges(),
  ...currentVariable(),
  ...currentBusiness(),
  ...currentTransfers(),
  ...priorMonths(),
].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

/* ------------------------------ expected & income ------------------------------ */

const fulfilled = (day: number) => day <= todayDay;

function heDay(delta: number, day: number): string {
  const d = monthDay(delta, day);
  const date = new Date(d);
  return `${date.getDate()} ב${new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(date)}`;
}

export const expected: ExpectedTransaction[] = [
  /* ---- inflows, current month ---- */
  {
    id: 'exp-salary-oran',
    month: m0,
    name: 'משכורת אורן',
    icon: 'south_west',
    amount: ils(21400),
    dueLabel: heDay(0, 25),
    group: 'fixed',
    direction: 'inflow',
    certainty: 'guaranteed',
    context: 'household',
    fulfilled: fulfilled(25),
  },
  {
    id: 'exp-salary-danielle',
    month: m0,
    name: 'משכורת דניאל',
    icon: 'south_west',
    amount: ils(18200),
    dueLabel: heDay(0, 10),
    group: 'fixed',
    direction: 'inflow',
    certainty: 'guaranteed',
    context: 'household',
    fulfilled: fulfilled(10),
  },
  {
    id: 'exp-insta',
    month: m0,
    name: 'שיתוף פעולה באינסטגרם',
    icon: 'photo_camera',
    amount: ils(2500),
    dueLabel: 'לא ודאי',
    group: 'one_time',
    direction: 'inflow',
    certainty: 'uncertain',
    context: 'business',
    fulfilled: false,
  },
  /* ---- outflows, current month ---- */
  {
    id: 'exp-mortgage-0',
    month: m0,
    name: 'משכנתא',
    icon: 'account_balance',
    amount: ils(6200),
    dueLabel: '1 בכל חודש',
    group: 'fixed',
    categoryId: 'cat-housing',
    direction: 'outflow',
    context: 'household',
    fulfilled: fulfilled(1),
  },
  {
    id: 'exp-tsaharon-0',
    month: m0,
    name: 'צהרון ילדים',
    icon: 'child_care',
    amount: ils(2300),
    dueLabel: '10 בכל חודש',
    group: 'fixed',
    categoryId: 'cat-education',
    direction: 'outflow',
    context: 'household',
    fulfilled: fulfilled(10),
  },
  {
    id: 'exp-arnona-0',
    month: m0,
    name: 'ארנונה (דו־חודשי)',
    icon: 'home',
    amount: ils(610),
    dueLabel: heDay(0, 25),
    group: 'one_time',
    categoryId: 'cat-housing',
    direction: 'outflow',
    context: 'household',
    fulfilled: fulfilled(25),
  },
  {
    id: 'exp-car-ins-0',
    month: m0,
    name: 'ביטוח רכב — הראל',
    icon: 'directions_car',
    amount: ils(310),
    dueLabel: heDay(0, 20),
    group: 'fixed',
    categoryId: 'cat-insurance',
    direction: 'outflow',
    context: 'household',
    fulfilled: fulfilled(20),
  },
  {
    id: 'exp-summer-0',
    month: m0,
    name: 'חוג קיץ',
    icon: 'sports_soccer',
    amount: ils(430),
    dueLabel: heDay(0, 22),
    group: 'one_time',
    categoryId: 'cat-kids',
    direction: 'outflow',
    context: 'household',
    fulfilled: fulfilled(22),
  },
  {
    id: 'exp-grocery-rest-0',
    month: m0,
    name: 'סופר (עד סוף החודש)',
    icon: 'shopping_cart',
    amount: ils(1300),
    estimate: true,
    dueLabel: 'שבועי',
    group: 'variable_estimate',
    categoryId: 'cat-groceries',
    direction: 'outflow',
    context: 'household',
    fulfilled: false,
  },
  {
    id: 'exp-dining-rest-0',
    month: m0,
    name: 'מסעדות ומשלוחים',
    icon: 'restaurant',
    amount: ils(360),
    estimate: true,
    dueLabel: 'שוטף',
    group: 'variable_estimate',
    categoryId: 'cat-restaurants',
    direction: 'outflow',
    context: 'household',
    fulfilled: false,
  },
  {
    id: 'exp-fuel-rest-0',
    month: m0,
    name: 'דלק וחניה',
    icon: 'directions_car',
    amount: ils(300),
    estimate: true,
    dueLabel: 'שוטף',
    group: 'variable_estimate',
    categoryId: 'cat-transport',
    direction: 'outflow',
    context: 'household',
    fulfilled: false,
  },
  {
    id: 'exp-weekend-0',
    month: m0,
    name: 'בילוי סוף שבוע',
    icon: 'celebration',
    amount: ils(400),
    estimate: true,
    dueLabel: 'סוף השבוע',
    group: 'variable_estimate',
    categoryId: 'cat-fun',
    direction: 'outflow',
    context: 'household',
    fulfilled: false,
  },
  {
    id: 'exp-bday-0',
    month: m0,
    name: 'מתנה ליום הולדת',
    icon: 'redeem',
    amount: ils(250),
    dueLabel: heDay(0, 24),
    group: 'one_time',
    categoryId: 'cat-gifts',
    direction: 'outflow',
    context: 'household',
    fulfilled: fulfilled(24),
  },
  /* ---- next month (planning) ---- */
  ...([
    ['exp-mortgage-1', 'משכנתא', 'account_balance', 6200, '1 בכל חודש', 'fixed', 'cat-housing'],
    ['exp-tsaharon-1', 'צהרון ילדים', 'child_care', 2300, '10 בכל חודש', 'fixed', 'cat-education'],
    ['exp-vaad-1', 'ועד בית', 'home', 450, '3 בכל חודש', 'fixed', 'cat-housing'],
    ['exp-ins-1', 'ביטוחים (הוראות קבע)', 'shield', 1050, '13 בחודש', 'fixed', 'cat-insurance'],
    ['exp-telecom-1', 'אינטרנט וסלולר', 'wifi', 450, '8 בחודש', 'fixed', 'cat-telecom'],
    ['exp-electric-1', 'חשמל', 'bolt', 600, heDay(1, 28), 'variable_estimate', 'cat-electricity'],
    ['exp-water-1', 'מים', 'water_drop', 180, heDay(1, 30), 'variable_estimate', 'cat-housing'],
    ['exp-grocery-1', 'סופר', 'shopping_cart', 3500, 'שבועי', 'variable_estimate', 'cat-groceries'],
    ['exp-dining-1', 'מסעדות ומשלוחים', 'restaurant', 1800, 'שוטף', 'variable_estimate', 'cat-restaurants'],
    ['exp-fuel-1', 'דלק וחניה', 'directions_car', 600, 'שוטף', 'variable_estimate', 'cat-transport'],
    ['exp-arnona-1', 'ארנונה (דו־חודשי)', 'home', 610, heDay(1, 25), 'one_time', 'cat-housing'],
    ['exp-summer-1', 'חוג קיץ — מחזור ב׳', 'sports_soccer', 430, heDay(1, 22), 'one_time', 'cat-kids'],
    ['exp-wedding-1', 'מתנה לחתונה', 'redeem', 500, heDay(1, 14), 'one_time', 'cat-gifts'],
  ] as const).map(
    ([id, name, icon, amount, dueLabel, group, categoryId]): ExpectedTransaction => ({
      id,
      month: shiftMonth(m0, 1),
      name,
      icon,
      amount: ils(amount),
      estimate: group === 'variable_estimate',
      dueLabel,
      group,
      categoryId,
      direction: 'outflow',
      context: 'household',
      fulfilled: false,
    }),
  ),
  {
    id: 'exp-salary-oran-1',
    month: shiftMonth(m0, 1),
    name: 'משכורת אורן',
    icon: 'south_west',
    amount: ils(21400),
    dueLabel: '25 בכל חודש',
    group: 'fixed',
    direction: 'inflow',
    certainty: 'guaranteed',
    context: 'household',
    fulfilled: false,
  },
  {
    id: 'exp-salary-danielle-1',
    month: shiftMonth(m0, 1),
    name: 'משכורת דניאל',
    icon: 'south_west',
    amount: ils(18200),
    dueLabel: '10 בכל חודש',
    group: 'fixed',
    direction: 'inflow',
    certainty: 'guaranteed',
    context: 'household',
    fulfilled: false,
  },
  {
    id: 'exp-insta-1',
    month: shiftMonth(m0, 1),
    name: 'הכנסות עסק (הערכה)',
    icon: 'storefront',
    amount: ils(9500),
    dueLabel: 'לא ודאי',
    group: 'one_time',
    direction: 'inflow',
    certainty: 'uncertain',
    context: 'business',
    fulfilled: false,
  },
];

export const incomeSources: IncomeSource[] = [
  { id: 'src-oran', personId: 'oran', name: 'משכורת אורן', kind: 'salary', expectedAmount: ils(21400), certainty: 'guaranteed' },
  { id: 'src-danielle', personId: 'danielle', name: 'משכורת דניאל', kind: 'salary', expectedAmount: ils(18200), certainty: 'guaranteed' },
  { id: 'src-legal', personId: 'danielle', name: 'הכנסות עסק — ייעוץ', kind: 'business', expectedAmount: ils(7000), certainty: 'uncertain' },
  { id: 'src-insta', personId: 'danielle', name: 'שיתופי פעולה באינסטגרם', kind: 'business', expectedAmount: ils(2500), certainty: 'uncertain' },
];

/* --------------------------------- review queue -------------------------------- */

const reviewTxns = transactions.filter((t) => t.needsReview);

const reviewMeta: Record<string, { reasonLabel: string; actionLabel: string }> = {
  uncategorized: { reasonLabel: 'ללא קטגוריה', actionLabel: 'שיוך קטגוריה' },
  unrecognized_merchant: { reasonLabel: 'סוחר לא זוהה', actionLabel: 'זיהוי' },
  possible_duplicate: { reasonLabel: 'חשד לכפילות', actionLabel: 'בדיקה' },
  possible_transfer: { reasonLabel: 'לא סווגה — אולי העברה', actionLabel: 'סיווג' },
  low_confidence: { reasonLabel: 'סיווג לא ודאי', actionLabel: 'אישור' },
};

export const reviewItems: ReviewItem[] = reviewTxns.map((t, i) => ({
  id: `rev-${i + 1}`,
  transactionId: t.id,
  reason: t.reviewReason!,
  reasonLabel: reviewMeta[t.reviewReason!].reasonLabel,
  actionLabel: reviewMeta[t.reviewReason!].actionLabel,
  status: 'open',
}));

/* -------------------------------- merchant rules ------------------------------- */

export const merchantRules: MerchantRule[] = [
  { id: 'rule-1', merchantPattern: 'שופרסל', categoryId: 'cat-groceries', context: 'household' },
  { id: 'rule-2', merchantPattern: 'Wolt', categoryId: 'cat-restaurants', context: 'household' },
  { id: 'rule-3', merchantPattern: 'פנגו', categoryId: 'cat-transport', context: 'household' },
  { id: 'rule-4', merchantPattern: 'סופר-פארם', categoryId: 'cat-health', context: 'household' },
  { id: 'rule-5', merchantPattern: 'נטפליקס', categoryId: 'cat-fun', context: 'household' },
  { id: 'rule-6', merchantPattern: 'הפניקס', categoryId: 'cat-insurance', context: 'household' },
];
