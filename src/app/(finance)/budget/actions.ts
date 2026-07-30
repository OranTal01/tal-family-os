'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  getCurrentHouseholdMembership,
  getCurrentUser,
} from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';

const budgetItemSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  context: z.enum(['household', 'business']),
  categoryId: z.string().uuid(),
  amount: z.number().int().min(0).max(1_000_000_000),
});

export type SaveBudgetItemResult =
  | { status: 'success' }
  | { status: 'error'; message: string };

export async function saveBudgetItemAction(
  input: z.infer<typeof budgetItemSchema>,
): Promise<SaveBudgetItemResult> {
  const parsed = budgetItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'פרטי התקציב אינם תקינים.',
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    };
  }

  const membership = await getCurrentHouseholdMembership();
  if (!membership || !['owner', 'member'].includes(membership.role)) {
    return {
      status: 'error',
      message: 'אין לחשבון הזה הרשאה לשנות את התקציב.',
    };
  }

  const supabase = await createClient();
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', parsed.data.categoryId)
    .eq('household_id', membership.householdId)
    .eq('context', parsed.data.context)
    .is('archived_at', null)
    .maybeSingle();

  if (categoryError || !category) {
    return {
      status: 'error',
      message: 'הקטגוריה אינה זמינה בתקציב הזה.',
    };
  }

  const monthDate = `${parsed.data.month}-01`;
  let { data: budget, error: budgetError } = await supabase
    .from('monthly_budgets')
    .select('id')
    .eq('household_id', membership.householdId)
    .eq('month', monthDate)
    .eq('context', parsed.data.context)
    .maybeSingle();

  if (budgetError) {
    console.error('Budget lookup failed', { code: budgetError.code });
    return {
      status: 'error',
      message: 'לא הצלחנו לפתוח את התקציב לחודש הזה.',
    };
  }

  if (!budget) {
    const created = await supabase
      .from('monthly_budgets')
      .insert({
        household_id: membership.householdId,
        month: monthDate,
        context: parsed.data.context,
      })
      .select('id')
      .single();
    budget = created.data;
    budgetError = created.error;
  }

  if (budgetError || !budget) {
    console.error('Budget creation failed', {
      code: budgetError?.code ?? 'missing-row',
    });
    return {
      status: 'error',
      message: 'לא הצלחנו ליצור את התקציב לחודש הזה.',
    };
  }

  const { error: itemError } = await supabase
    .from('monthly_budget_items')
    .upsert(
      {
        household_id: membership.householdId,
        monthly_budget_id: budget.id,
        category_id: parsed.data.categoryId,
        amount: parsed.data.amount,
      },
      { onConflict: 'monthly_budget_id,category_id' },
    );

  if (itemError) {
    console.error('Budget item save failed', { code: itemError.code });
    return {
      status: 'error',
      message: 'לא הצלחנו לשמור את סכום התקציב. אפשר לנסות שוב.',
    };
  }

  for (const path of ['/budget', '/dashboard', '/daily', '/split']) {
    revalidatePath(path);
  }

  return { status: 'success' };
}
