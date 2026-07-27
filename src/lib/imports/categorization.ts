import type { Context } from '@/types/domain';
import type {
  ImportCandidate,
  ImportCategorySuggestionSource,
} from '@/lib/imports/types';

export type ImportCategory = {
  id: string;
  name: string;
  icon?: string;
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

const categoryIcons: Record<string, string> = {
  'דיור ומשכנתא': 'home',
  'סופר וקניות': 'shopping_cart',
  'מסעדות ומשלוחים': 'restaurant',
  חשמל: 'bolt',
  'אינטרנט וסלולר': 'wifi',
  ביגוד: 'checkroom',
  'תחבורה וחניה': 'directions_car',
  'רכב ותחזוקה': 'car_repair',
  ביטוחים: 'shield',
  'בריאות ופארם': 'medication',
  'תספורות וטיפוח': 'content_cut',
  קוסמטיקה: 'spa',
  'ספורט וכושר': 'fitness_center',
  'חיות מחמד': 'pets',
  'מנויים דיגיטליים': 'subscriptions',
  בילויים: 'celebration',
  'חופשות ופנאי': 'travel',
  'עמלות ומסים': 'receipt_long',
  'פרסום ושיווק': 'campaign',
  'ציוד וטכנולוגיה': 'devices',
  'שירותים מקצועיים': 'work',
  'נסיעות ופגישות': 'commute',
  'עמלות ומסים לעסק': 'request_quote',
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
        'סיטי מרקט',
        'סטופמרקט',
        'מחסן הסיטונאי',
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
        'פיצה',
        'פלאפל',
        'רולדין',
        'לנדוור',
        'מקדונלדס',
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
        'lime',
        'דלק',
        'yellow',
        'ילו',
        'סונול',
        'פז',
        'דור אלון',
        'דן חברה לתחבורה',
        'חניה',
        'סנטרל פארק',
      ],
    },
    {
      categoryName: 'רכב ותחזוקה',
      terms: [
        'מוסך',
        'פחחות',
        'מכון רישוי',
        'רשיונות רכב',
        'רישיונות רכב',
        'car repair',
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
      categoryName: 'תספורות וטיפוח',
      terms: ['ברבר', 'barber', 'מספרה', 'תספורת'],
    },
    {
      categoryName: 'קוסמטיקה',
      terms: ['קוסמטיקה', 'קוסמטיקאית', 'beauty', 'sephora'],
    },
    {
      categoryName: 'ספורט וכושר',
      terms: ['חדר כושר', 'fitness', 'gym', 'אייקון', 'הולמס פלייס'],
    },
    {
      categoryName: 'חיות מחמד',
      terms: ['וטרינר', 'מרפאט', 'pet', 'animal'],
    },
    {
      categoryName: 'מנויים דיגיטליים',
      terms: [
        'netflix',
        'disney plus',
        'playstation',
        'next tv',
        'spotify',
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
        'manychat',
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
        'anthropic',
        'claude',
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
      category.context === context &&
      (category.name === rule.categoryName ||
        category.icon === categoryIcons[rule.categoryName]),
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
