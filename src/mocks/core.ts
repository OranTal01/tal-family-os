import type {
  Account,
  Business,
  Category,
  Household,
  MonthBudget,
  BudgetAdjustment,
} from '@/types/domain';
import { ils } from '@/types/money';
import { currentMonthKey, shiftMonth } from '@/lib/format/date';

export const household: Household = {
  id: 'hh-tal',
  name: 'כספי הבית',
  carryOverEnabled: false,
  members: [
    { id: 'oran', name: 'אורן טל', kind: 'adult', role: 'בעלים · גישה מלאה', initial: 'א' },
    { id: 'danielle', name: 'דניאל טל', kind: 'adult', role: 'בעלים · גישה מלאה', initial: 'ד' },
    { id: 'aria', name: 'אריאה', kind: 'child', initial: 'א' },
    { id: 'eli', name: 'אלי', kind: 'child', initial: 'א' },
  ],
};

export const business: Business = {
  id: 'biz-danielle',
  ownerId: 'danielle',
  name: 'העסק של דניאל',
  legalForm: 'עוסק מורשה',
  vatRate: 0.18,
  nextVatReportLabel: `15 ב${new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
  )}`,
};

export const accounts: Account[] = [
  {
    id: 'acc-joint',
    name: 'בנק הפועלים',
    type: 'bank',
    icon: 'account_balance',
    last4: '••4821',
    subtitle: 'עו״ש משותף · ••4821',
    sync: 'ok',
    balance: ils(23450),
    balanceLabel: 'יתרה',
    context: 'household',
  },
  {
    id: 'acc-business',
    name: 'בנק לאומי',
    type: 'bank',
    ownerId: 'danielle',
    icon: 'account_balance',
    last4: '••7710',
    subtitle: 'חשבון עסק · ••7710',
    sync: 'ok',
    balance: ils(18900),
    balanceLabel: 'יתרה',
    context: 'business',
  },
  {
    id: 'acc-card-oran',
    name: 'ויזה כאל',
    type: 'credit_card',
    ownerId: 'oran',
    icon: 'credit_card',
    last4: '••2145',
    subtitle: 'כרטיס אורן · ••2145',
    sync: 'ok',
    balance: ils(8240),
    balanceLabel: 'חיוב צפוי',
    context: 'household',
  },
  {
    id: 'acc-card-danielle',
    name: 'מקס (מאסטרקארד)',
    type: 'credit_card',
    ownerId: 'danielle',
    icon: 'credit_card',
    last4: '••8890',
    subtitle: 'כרטיס דניאל · ••8890',
    sync: 'syncing',
    balance: ils(3120),
    balanceLabel: 'חיוב צפוי',
    context: 'household',
  },
  {
    id: 'acc-amex',
    name: 'אמריקן אקספרס',
    type: 'credit_card',
    ownerId: 'oran',
    icon: 'credit_card',
    last4: '••0032',
    subtitle: 'אשראי · ••0032',
    sync: 'error',
    balanceLabel: 'חיוב צפוי',
    context: 'household',
  },
  {
    id: 'acc-bit',
    name: 'Bit',
    type: 'wallet',
    ownerId: 'danielle',
    icon: 'account_balance_wallet',
    subtitle: 'ארנק דיגיטלי',
    sync: 'ok',
    balance: ils(600),
    balanceLabel: 'יתרה',
    context: 'household',
  },
  {
    id: 'acc-paybox',
    name: 'PayBox',
    type: 'wallet',
    ownerId: 'danielle',
    icon: 'account_balance_wallet',
    subtitle: 'ארנק דיגיטלי',
    sync: 'ok',
    balance: ils(900),
    balanceLabel: 'יתרה',
    context: 'household',
  },
  {
    id: 'acc-cash',
    name: 'מזומן',
    type: 'cash',
    icon: 'payments',
    subtitle: 'קופה קטנה בבית',
    sync: 'ok',
    balance: ils(550),
    balanceLabel: 'יתרה',
    context: 'household',
  },
];

/* ---------------------------------- categories --------------------------------- */

const cat = (
  id: string,
  name: string,
  shortName: string,
  icon: string,
  priority: Category['priority'],
  sortOrder: number,
  context: Category['context'] = 'household',
  archived = false,
): Category => ({ id, name, shortName, icon, context, priority, sortOrder, archived });

export const categories: Category[] = [
  cat('cat-housing', 'דיור ומשכנתא', 'דיור', 'home', 'essential', 1),
  cat('cat-groceries', 'סופר וקניות', 'סופר', 'shopping_cart', 'essential', 2),
  cat('cat-restaurants', 'מסעדות ומשלוחים', 'מסעדות', 'restaurant', 'flexible', 3),
  cat('cat-kids', 'ילדים', 'ילדים', 'child_care', 'important', 4),
  cat('cat-education', 'חינוך וצהרון', 'חינוך', 'school', 'essential', 5),
  cat('cat-cleaner', 'מנקה', 'מנקה', 'cleaning_services', 'important', 6),
  cat('cat-electricity', 'חשמל', 'חשמל', 'bolt', 'essential', 7),
  cat('cat-telecom', 'אינטרנט וסלולר', 'תקשורת', 'wifi', 'essential', 8),
  cat('cat-clothing', 'ביגוד', 'ביגוד', 'checkroom', 'flexible', 9),
  cat('cat-transport', 'תחבורה וחניה', 'תחבורה', 'directions_car', 'important', 10),
  cat('cat-insurance', 'ביטוחים', 'ביטוחים', 'shield', 'essential', 11),
  cat('cat-health', 'בריאות ופארם', 'בריאות', 'medication', 'important', 12),
  cat('cat-fun', 'בילויים', 'בילויים', 'celebration', 'discretionary', 13),
  cat('cat-gifts', 'מתנות ואירועים', 'מתנות', 'redeem', 'discretionary', 14),
  cat('cat-vacation', 'חופשות ופנאי', 'חופשות', 'travel', 'discretionary', 15),
  // archived category with history — never hard-deleted (core rule)
  cat('cat-pets', 'חיות מחמד', 'חיות', 'pets', 'flexible', 90, 'household', true),
  // business categories
  cat('cat-biz-marketing', 'פרסום ושיווק', 'שיווק', 'campaign', 'important', 1, 'business'),
  cat('cat-biz-equipment', 'ציוד וטכנולוגיה', 'ציוד', 'devices', 'important', 2, 'business'),
  cat('cat-biz-services', 'שירותים מקצועיים', 'שירותים', 'work', 'essential', 3, 'business'),
];

/* ----------------------------------- budgets ----------------------------------- */

const householdBudgetItems: MonthBudget['items'] = [
  { categoryId: 'cat-housing', amount: ils(8000) },
  { categoryId: 'cat-groceries', amount: ils(3500) },
  { categoryId: 'cat-restaurants', amount: ils(2000) },
  { categoryId: 'cat-kids', amount: ils(3000) },
  { categoryId: 'cat-education', amount: ils(3300) },
  { categoryId: 'cat-cleaner', amount: ils(1000) },
  { categoryId: 'cat-electricity', amount: ils(700) },
  { categoryId: 'cat-telecom', amount: ils(450) },
  { categoryId: 'cat-clothing', amount: ils(800) },
  { categoryId: 'cat-transport', amount: ils(1400) },
  { categoryId: 'cat-insurance', amount: ils(1050) },
  { categoryId: 'cat-health', amount: ils(1000) },
  { categoryId: 'cat-fun', amount: ils(750) },
  { categoryId: 'cat-gifts', amount: ils(700) },
  { categoryId: 'cat-vacation', amount: ils(1500) },
];

const businessBudgetItems: MonthBudget['items'] = [
  { categoryId: 'cat-biz-marketing', amount: ils(1200) },
  { categoryId: 'cat-biz-equipment', amount: ils(2500) },
  { categoryId: 'cat-biz-services', amount: ils(2000) },
];

const m0 = currentMonthKey();

export const budgets: MonthBudget[] = [-2, -1, 0, 1].flatMap((delta) => {
  const month = shiftMonth(m0, delta);
  return [
    { month, context: 'household' as const, items: householdBudgetItems },
    { month, context: 'business' as const, items: businessBudgetItems },
  ];
});

export const budgetAdjustments: BudgetAdjustment[] = [
  {
    id: 'adj-1',
    month: m0,
    categoryId: 'cat-clothing',
    delta: ils(200),
    kind: 'reallocation',
    counterpartCategoryId: 'cat-fun',
    scope: 'one_time',
    note: 'איזון חריגה בביגוד על חשבון בילויים',
    byId: 'danielle',
    atLabel: 'לפני 3 ימים',
  },
  {
    id: 'adj-2',
    month: shiftMonth(m0, -1),
    categoryId: 'cat-education',
    delta: ils(300),
    kind: 'increase',
    scope: 'permanent',
    note: 'עדכון מחיר צהרון',
    byId: 'oran',
    atLabel: 'לפני חודש',
  },
];
