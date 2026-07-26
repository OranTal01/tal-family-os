import type { Context } from '@/types/domain';
import type {
  ImportCandidate,
  ImportCategorySuggestionSource,
} from '@/lib/imports/types';

export type ImportCategory = {
  id: string;
  name: string;
  context: Context;
};

export type ImportMerchantRule = {
  merchant_pattern: string;
  category_id: string | null;
  context: Context;
};

type CategorySuggestion = {
  suggestedContext?: Context;
  suggestedCategoryId?: string;
  suggestedCategorySource?: ImportCategorySuggestionSource;
};

type SmartRule = {
  categoryName: string;
  terms: string[];
};

const smartRules: Record<Context, SmartRule[]> = {
  household: [
    {
      categoryName: 'דיור ומשכנתא',
      terms: ['משכנתא', 'שכר דירה', 'ארנונה', 'mortgage', 'rent'],
    },
    {
      categoryName: 'סופר וקניות',
      terms: [
        'שופרסל',
        'רמי לוי',
        'ויקטורי',
        'קרפור',
        'יוחננוף',
        'אושר עד',
        'מחסני השוק',
      ],
    },
    {
      categoryName: 'מסעדות ומשלוחים',
      terms: [
        'wolt',
        'וולט',
        'תן ביס',
        'tenbis',
        'ארומה',
        'קפה גרג',
        'מסעדה',
      ],
    },
    {
      categoryName: 'חשמל',
      terms: ['חברת החשמל', 'electric'],
    },
    {
      categoryName: 'אינטרנט וסלולר',
      terms: [
        'בזק',
        'פרטנר',
        'סלקום',
        'פלאפון',
        'hot',
        '012',
        '019',
      ],
    },
    {
      categoryName: 'ביגוד',
      terms: ['zara', 'h&m', 'terminal x', 'קסטרו', 'fox', 'פוקס'],
    },
    {
      categoryName: 'תחבורה וחניה',
      terms: [
        'pango',
        'פנגו',
        'gett',
        'yango',
        'דלק',
        'סונול',
        'פז',
        'דור אלון',
      ],
    },
    {
      categoryName: 'ביטוחים',
      terms: [
        'הראל',
        'כלל ביטוח',
        'מגדל ביטוח',
        'הפניקס',
        'מנורה מבטחים',
        'איילון ביטוח',
      ],
    },
    {
      categoryName: 'בריאות ופארם',
      terms: [
        'סופר פארם',
        'super-pharm',
        'בית מרקחת',
        'כללית',
        'מכבי',
        'מאוחדת',
      ],
    },
    {
      categoryName: 'בילויים',
      terms: ['קולנוע', 'cinema', 'יס פלאנט', 'סינמה סיטי'],
    },
    {
      categoryName: 'חופשות ופנאי',
      terms: ['booking', 'airbnb', 'אל על', 'ישראייר', 'ארקיע', 'מלון'],
    },
    {
      categoryName: 'עמלות ומסים',
      terms: ['עמלה', 'ריבית חובה'],
    },
  ],
  business: [
    {
      categoryName: 'פרסום ושיווק',
      terms: [
        'meta',
        'facebook',
        'instagram',
        'google ads',
        'tiktok',
        'פרסום',
      ],
    },
    {
      categoryName: 'ציוד וטכנולוגיה',
      terms: [
        'apple',
        'ksp',
        'ivory',
        'adobe',
        'canva',
        'zoom',
        'dropbox',
      ],
    },
    {
      categoryName: 'שירותים מקצועיים',
      terms: ['רואה חשבון', 'הנהלת חשבונות', 'עורך דין', 'ייעוץ'],
    },
    {
      categoryName: 'נסיעות ופגישות',
      terms: ['gett', 'yango', 'pango', 'פנגו', 'מונית', 'חניון'],
    },
    {
      categoryName: 'עמלות ומסים לעסק',
      terms: ['מס הכנסה', 'מע"מ', 'ביטוח לאומי', 'עמלה'],
    },
  ],
};

export function normalizeMerchant(value: string): string {
  return value.trim().replaceAll(/\s+/g, ' ').toLocaleLowerCase();
}

export function suggestSmartCategory(
  merchant: string,
  context: Context,
  categories: ImportCategory[],
): ImportCategory | undefined {
  const normalized = normalizeMerchant(merchant);
  const rule = smartRules[context].find((candidate) =>
    candidate.terms.some((term) => normalized.includes(term)),
  );
  if (!rule) return undefined;

  return categories.find(
    (category) =>
      category.context === context && category.name === rule.categoryName,
  );
}

export function suggestCandidateCategorization(
  candidate: ImportCandidate,
  categories: ImportCategory[],
  merchantRules: ImportMerchantRule[],
): CategorySuggestion {
  if (
    candidate.suggestedKind !== 'expense' &&
    candidate.suggestedKind !== 'refund'
  ) {
    return {};
  }

  const normalizedMerchant = normalizeMerchant(candidate.merchant);
  const exactRules = merchantRules.filter(
    (rule) =>
      rule.category_id &&
      normalizeMerchant(rule.merchant_pattern) === normalizedMerchant,
  );
  const learnedRule = candidate.suggestedContext
    ? exactRules.find((rule) => rule.context === candidate.suggestedContext)
    : exactRules.length === 1
      ? exactRules[0]
      : undefined;
  const learnedCategory = learnedRule
    ? categories.find(
        (category) =>
          category.id === learnedRule.category_id &&
          category.context === learnedRule.context,
      )
    : undefined;

  if (learnedRule && learnedCategory) {
    return {
      suggestedContext:
        candidate.suggestedContext ?? learnedRule.context,
      suggestedCategoryId: learnedCategory.id,
      suggestedCategorySource: 'learned_rule',
    };
  }

  if (!candidate.suggestedContext) return {};
  const smartCategory = suggestSmartCategory(
    candidate.merchant,
    candidate.suggestedContext,
    categories,
  );
  if (!smartCategory) return {};

  return {
    suggestedCategoryId: smartCategory.id,
    suggestedCategorySource: 'smart_rule',
  };
}
