import 'server-only';

import type { Context } from '@/types/domain';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';

export type SettingsCategoryItem = {
  id: string;
  name: string;
  icon: string;
  context: Context;
};

export type SettingsMerchantRuleItem = {
  id: string;
  pattern: string;
  categoryName: string;
};

export async function getPersistedSettingsScreen(): Promise<{
  categories: SettingsCategoryItem[];
  rules: SettingsMerchantRuleItem[];
}> {
  const membership = await getCurrentHouseholdMembership();
  if (!membership) return { categories: [], rules: [] };

  const supabase = await createClient();
  const [categoriesResult, rulesResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, icon, context')
      .eq('household_id', membership.householdId)
      .is('archived_at', null)
      .order('context', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('merchant_rules')
      .select('id, merchant_pattern, category_id')
      .eq('household_id', membership.householdId)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const error = categoriesResult.error ?? rulesResult.error;
  if (error) {
    throw new Error('Unable to load persisted settings', { cause: error });
  }

  const categories: SettingsCategoryItem[] = (
    categoriesResult.data ?? []
  ).map((category) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    context: category.context,
  }));
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return {
    categories,
    rules: (rulesResult.data ?? []).map((rule) => ({
      id: rule.id,
      pattern: rule.merchant_pattern,
      categoryName: rule.category_id
        ? categoryNames.get(rule.category_id) ?? 'קטגוריה שאינה פעילה'
        : 'העברה בין חשבונות',
    })),
  };
}
