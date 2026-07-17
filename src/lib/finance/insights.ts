import type { Agorot } from '@/types/money';
import type { CategoryBudgetSummary } from '@/lib/finance/budgets';
import { formatMoney } from '@/lib/format/currency';

export type InsightModel = { icon: string; text: string };

/**
 * Rule-based calm insights (content spec §9): factual, states certainty,
 * offers one concrete step, never blames.
 */
export function buildInsights(
  summaries: CategoryBudgetSummary[],
  surplus: Agorot,
): InsightModel[] {
  const insights: InsightModel[] = [];

  const projectedOver = summaries
    .filter((s) => s.status !== 'over' && s.projected > s.allocated && s.allocated > 0)
    .sort((a, b) => b.projected - b.allocated - (a.projected - a.allocated))[0];
  if (projectedOver) {
    const overage = formatMoney((projectedOver.projected - projectedOver.allocated) as Agorot);
    insights.push({
      icon: 'lightbulb',
      text: `בקצב הנוכחי צפויה חריגה של כ־${overage} ב${projectedOver.category.name} עד סוף החודש. האטה קלה בקצב תאזן אותה.`,
    });
  }

  if (surplus > 0) {
    const suggestion = Math.max(Math.floor(surplus / 2 / 50000) * 50000, 50000);
    insights.push({
      icon: 'savings',
      text: `צפוי עודף ${formatMoney(surplus)} — שקלו העברה של ${formatMoney(suggestion as Agorot)} לחיסכון.`,
    });
  }

  const nearCount = summaries.filter((s) => s.status === 'near').length;
  if (nearCount >= 2) {
    insights.push({
      icon: 'balance',
      text: `${nearCount} קטגוריות קרובות לגבול החודש. אתם בכיוון טוב — שווה מבט קצר לפני ההוצאה הבאה.`,
    });
  }

  return insights.slice(0, 2);
}
