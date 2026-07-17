import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyRange, formatPercent } from '@/lib/format/currency';
import { ils } from '@/types/money';

describe('formatMoney (content rules §7)', () => {
  it('₪ prefix with comma thousands, whole shekels by default', () => {
    expect(formatMoney(ils(12450))).toBe('₪12,450');
    expect(formatMoney(ils(0))).toBe('₪0');
  });

  it('negative uses true minus U+2212', () => {
    expect(formatMoney(ils(-140))).toBe('−₪140');
  });

  it('explicit plus for income when requested', () => {
    expect(formatMoney(ils(18200), { sign: 'always' })).toBe('+₪18,200');
  });

  it('agorot only when explicitly requested (transaction detail)', () => {
    expect(formatMoney(486_50 as ReturnType<typeof ils>, { withAgorot: true })).toBe('₪486.50');
  });

  it('abbreviates ≥ ₪1M to M with tooltip-exact left to callers', () => {
    expect(formatMoney(ils(2421900), { abbreviate: true })).toBe('₪2.42M');
    expect(formatMoney(ils(820000), { abbreviate: true })).toBe('₪820K');
  });

  it('ranges and percents', () => {
    expect(formatMoneyRange(ils(18400), ils(34000))).toBe('₪18,400 / ₪34,000');
    expect(formatPercent(0.54)).toBe('54%');
  });
});
