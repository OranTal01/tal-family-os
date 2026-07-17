import type { Asset, Liability } from '@/types/domain';
import { agorot, type Agorot } from '@/types/money';

export type NetWorthSummary = {
  totalAssets: Agorot;
  totalLiabilities: Agorot;
  netWorth: Agorot;
};

/** שווי נטו = נכסים − התחייבויות. Includes household and business. */
export function summarizeNetWorth(assets: Asset[], liabilities: Liability[]): NetWorthSummary {
  const totalAssets = agorot(assets.reduce((sum, a) => sum + a.value, 0));
  const totalLiabilities = agorot(liabilities.reduce((sum, l) => sum + l.balance, 0));
  return {
    totalAssets,
    totalLiabilities,
    netWorth: agorot(totalAssets - totalLiabilities),
  };
}
