import { describe, expect, it } from 'vitest';
import { agorot } from '@/types/money';
import type { ImportCandidate } from '@/lib/imports/types';
import {
  normalizeMerchant,
  suggestCandidateCategorization,
  suggestSmartCategory,
} from './categorization';

const categories = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'מסעדות ומשלוחים',
    context: 'household' as const,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'פרסום ושיווק',
    context: 'business' as const,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'תספורות וטיפוח',
    context: 'household' as const,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'רכב ותחזוקה',
    context: 'household' as const,
  },
];

const candidate: ImportCandidate = {
  id: 'candidate-1',
  fingerprint: 'a'.repeat(64),
  sourceRow: 3,
  account: {
    provider: 'cal',
    accountType: 'credit_card',
    ownerHint: 'danielle',
    last4: '1234',
  },
  dateISO: '2026-07-20',
  amount: agorot(-5_000),
  currency: 'ILS',
  merchant: '  WOLT   ישראל ',
  status: 'cleared',
  suggestedKind: 'expense',
  reviewReasons: ['confirm_context'],
  eligible: false,
};

describe('import categorization', () => {
  it('normalizes learned merchant names without exposing transaction details', () => {
    expect(normalizeMerchant('  WOLT   ישראל ')).toBe('wolt ישראל');
  });

  it('prefers an exact learned rule and can infer an unambiguous context', () => {
    expect(
      suggestCandidateCategorization(candidate, categories, [
        {
          merchant_pattern: 'wolt ישראל',
          category_id: categories[0].id,
          context: 'household',
        },
      ]),
    ).toEqual({
      suggestedContext: 'household',
      suggestedCategoryId: categories[0].id,
      suggestedCategorySource: 'learned_rule',
    });
  });

  it('does not guess when the same merchant has household and business rules', () => {
    expect(
      suggestCandidateCategorization(candidate, categories, [
        {
          merchant_pattern: 'wolt ישראל',
          category_id: categories[0].id,
          context: 'household',
        },
        {
          merchant_pattern: 'wolt ישראל',
          category_id: categories[1].id,
          context: 'business',
        },
      ]),
    ).toEqual({});
  });

  it('suggests a smart category after a context is known', () => {
    expect(
      suggestSmartCategory('META ADS 123', 'business', categories),
    ).toEqual(categories[1]);
  });

  it('uses the real workbook merchant patterns for new household categories', () => {
    expect(
      suggestSmartCategory('מנטור ברבר שופ', 'household', categories),
    ).toEqual(categories[2]);
    expect(
      suggestSmartCategory('מוסך אוטו טוב', 'household', categories),
    ).toEqual(categories[3]);
  });

  it('keeps smart matching after a category is renamed', () => {
    const renamedCategories = categories.map((category) =>
      category.id === categories[2].id
        ? {
            ...category,
            name: 'טיפוח אישי',
            icon: 'content_cut',
          }
        : category,
    );

    expect(
      suggestSmartCategory(
        'מנטור ברבר שופ',
        'household',
        renamedCategories,
      ),
    ).toEqual(renamedCategories[2]);
  });
});
