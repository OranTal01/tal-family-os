import type { Business, Transaction } from '@/types/domain';
import type { MonthKey } from '@/lib/format/date';
import { agorot, type Agorot } from '@/types/money';
import { actualBusinessRevenue } from '@/lib/finance/income';
import { actualSpending } from '@/lib/finance/spending';

export type BusinessSummary = {
  revenue: Agorot;
  expenses: Agorot;
  profitBeforeTax: Agorot;
  /** informational only — not a tax filing (PRODUCT_SPEC §2) */
  vatDueEstimate: Agorot;
};

/**
 * Business month view. Revenue/expenses are strictly business-context
 * transactions — household totals never include them (and vice versa).
 * VAT estimate: output VAT on revenue minus input VAT on expenses, assuming
 * VAT-inclusive amounts. Informational area only.
 */
export function summarizeBusiness(
  txns: Transaction[],
  month: MonthKey,
  business: Business,
): BusinessSummary {
  const revenue = actualBusinessRevenue(txns, month);
  const expenses = actualSpending(txns, month, 'business');
  const rate = business.vatRate;
  const outputVat = Math.round((revenue * rate) / (1 + rate));
  const inputVat = Math.round((expenses * rate) / (1 + rate));
  return {
    revenue,
    expenses,
    profitBeforeTax: agorot(revenue - expenses),
    vatDueEstimate: agorot(Math.max(outputVat - inputVat, 0)),
  };
}
