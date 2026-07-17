import type {
  Asset,
  Goal,
  GoalContribution,
  InsurancePolicy,
  Liability,
} from '@/types/domain';
import { ils } from '@/types/money';
import { toISODate } from '@/lib/format/date';

/**
 * Wealth figures follow the design dataset exactly:
 * total assets ₪3,241,900 − liabilities ₪820,000 = net worth ₪2,421,900.
 */

export const assets: Asset[] = [
  { id: 'as-home', name: 'דירת מגורים', subtitle: 'נדל״ן · הערכת שווי', icon: 'home', type: 'real_estate', chip: 'נכס', value: ils(2450000) },
  { id: 'as-pension', name: 'פנסיה — מנורה מבטחים', subtitle: 'צבירה · תשואה 12 ח׳ ‎+6.2%', icon: 'elderly', type: 'pension', chip: 'פנסיה', value: ils(412000) },
  { id: 'as-hishtalmut', name: 'קרן השתלמות — אלטשולר', subtitle: 'נזילה מ־2027', icon: 'school', type: 'education_fund', chip: 'חיסכון', value: ils(138500) },
  { id: 'as-ibi', name: 'תיק השקעות — IBI', subtitle: 'מנוהל · ‎+2.1% החודש', icon: 'trending_up', type: 'investment', chip: 'השקעות', value: ils(96800) },
  { id: 'as-gemel', name: 'קופת גמל להשקעה', subtitle: 'הפקדה חודשית ₪1,500', icon: 'savings', type: 'provident_fund', chip: 'חיסכון', value: ils(64200) },
  { id: 'as-kid-aria', name: 'חיסכון לכל ילד — אריאה', subtitle: 'הפקדה חודשית ₪250', icon: 'family_restroom', type: 'child_savings', chip: 'חיסכון', value: ils(14600), ownerId: 'aria' },
  { id: 'as-kid-eli', name: 'חיסכון לכל ילד — אלי', subtitle: 'הפקדה חודשית ₪250', icon: 'family_restroom', type: 'child_savings', chip: 'חיסכון', value: ils(13800), ownerId: 'eli' },
  { id: 'as-deposit', name: 'פיקדון עו״ש', subtitle: 'ריבית 4.1%', icon: 'account_balance_wallet', type: 'deposit', chip: 'נזיל', value: ils(52000) },
];

export const liabilities: Liability[] = [
  {
    id: 'li-mortgage',
    name: 'משכנתא — יתרה',
    subtitle: 'הפועלים · סיום 2039',
    icon: 'real_estate_agent',
    balance: ils(820000),
  },
];

export const insurancePolicies: InsurancePolicy[] = [
  { id: 'ins-life', name: 'ביטוח חיים', provider: 'הפניקס', icon: 'favorite', premiumMonthly: ils(220), coverage: '₪1,500,000', status: 'active', statusLabel: 'פעיל', insuredId: 'oran' },
  { id: 'ins-health', name: 'בריאות משלים', provider: 'כלל', icon: 'health_and_safety', premiumMonthly: ils(180), coverage: 'כיסוי מלא למשפחה', status: 'active', statusLabel: 'פעיל' },
  { id: 'ins-car', name: 'רכב — מקיף', provider: 'הראל', icon: 'directions_car', premiumMonthly: ils(310), coverage: 'יונדאי טוסון', status: 'renewal_due', statusLabel: 'חידוש 20/08' },
  { id: 'ins-home', name: 'דירה — מבנה ותכולה', provider: 'מגדל', icon: 'home', premiumMonthly: ils(95), coverage: '₪1,900,000', status: 'active', statusLabel: 'פעיל' },
  { id: 'ins-mortgage', name: 'משכנתא', provider: 'הפניקס', icon: 'account_balance', premiumMonthly: ils(140), coverage: 'יתרת הלוואה', status: 'active', statusLabel: 'פעיל' },
  { id: 'ins-work', name: 'אובדן כושר עבודה', provider: 'מנורה', icon: 'work', premiumMonthly: ils(88), coverage: '75% מהשכר', status: 'active', statusLabel: 'פעיל', insuredId: 'danielle' },
];

export const goals: Goal[] = [
  {
    id: 'goal-apartment',
    name: 'יעד דירה',
    icon: 'apartment',
    target: ils(600000),
    // עקבי עם מסך הנכסים: השתלמות + IBI + גמל + פיקדון = 351,500
    current: ils(351500),
    monthlyDeposit: ils(3000),
    forecastLabel: 'בקצב הנוכחי: 2032',
  },
  {
    id: 'goal-aria',
    name: 'חיסכון אריאה',
    icon: 'family_restroom',
    target: ils(60000),
    current: ils(14600),
    monthlyDeposit: ils(250),
    beneficiaryId: 'aria',
    forecastLabel: 'יעד לגיל 18',
  },
  {
    id: 'goal-eli',
    name: 'חיסכון אלי',
    icon: 'family_restroom',
    target: ils(60000),
    current: ils(13800),
    monthlyDeposit: ils(250),
    beneficiaryId: 'eli',
    forecastLabel: 'יעד לגיל 18',
  },
];

const today = new Date();
const monthsAgo = (n: number, day: number) =>
  toISODate(new Date(today.getFullYear(), today.getMonth() - n, day));

export const goalContributions: GoalContribution[] = [
  { id: 'gc-1', goalId: 'goal-apartment', amount: ils(3000), date: monthsAgo(0, 2), label: 'הפקדה חודשית' },
  { id: 'gc-2', goalId: 'goal-apartment', amount: ils(3000), date: monthsAgo(1, 2), label: 'הפקדה חודשית' },
  { id: 'gc-3', goalId: 'goal-aria', amount: ils(250), date: monthsAgo(0, 2), label: 'הפקדה חודשית' },
  { id: 'gc-4', goalId: 'goal-aria', amount: ils(250), date: monthsAgo(1, 2), label: 'הפקדה חודשית' },
  { id: 'gc-5', goalId: 'goal-aria', amount: ils(500), date: monthsAgo(1, 18), label: 'מתנת יום הולדת — סבתא' },
  { id: 'gc-6', goalId: 'goal-eli', amount: ils(250), date: monthsAgo(0, 2), label: 'הפקדה חודשית' },
  { id: 'gc-7', goalId: 'goal-eli', amount: ils(250), date: monthsAgo(1, 2), label: 'הפקדה חודשית' },
  { id: 'gc-8', goalId: 'goal-eli', amount: ils(250), date: monthsAgo(2, 2), label: 'הפקדה חודשית' },
];
