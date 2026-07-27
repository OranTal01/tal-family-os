'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { InvitationActionState } from '@/lib/household/invitations';
import { routes } from '@/lib/routes';
import {
  getCurrentHouseholdMembership,
  getCurrentUser,
} from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';

const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(320)
    .pipe(z.email()),
});

const revokeInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

const normalizedCategoryName = z
  .string()
  .transform((value) => value.replaceAll(/\s+/g, ' ').trim())
  .pipe(z.string().min(2).max(50));

const createCategorySchema = z.object({
  name: normalizedCategoryName,
  context: z.enum(['household', 'business']),
  icon: z.string().trim().min(1).max(40).default('category'),
});

const renameCategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: normalizedCategoryName,
});

const GENERIC_INVITATION_ERROR =
  'לא הצלחנו לרשום את ההזמנה. אפשר לבדוק את הכתובת ולנסות שוב.';

function friendlyInvitationError(message: string): string {
  if (message.includes('already belongs to a household')) {
    return 'לחשבון עם האימייל הזה כבר יש משק בית.';
  }
  if (message.includes('cannot invite your own email address')) {
    return 'אין צורך להזמין את החשבון שלך — הוא כבר מחובר למשק הבית.';
  }
  return GENERIC_INVITATION_ERROR;
}

function shortCategoryName(name: string): string {
  return Array.from(name).slice(0, 20).join('');
}

function categoryMutationError(code: string | undefined): string {
  return code === '23505'
    ? 'כבר קיימת קטגוריה פעילה בשם הזה.'
    : 'לא הצלחנו לשמור את הקטגוריה. אפשר לנסות שוב בעוד רגע.';
}

async function getOwnerMembershipForCategoryMutation() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    } as const;
  }

  try {
    const membership = await getCurrentHouseholdMembership();
    if (!membership || membership.role !== 'owner') {
      return {
        error: 'רק בעלים של משק הבית יכולים לשנות קטגוריות.',
      } as const;
    }
    return { membership } as const;
  } catch {
    return {
      error: 'לא הצלחנו לאמת את משק הבית. אפשר לרענן ולנסות שוב.',
    } as const;
  }
}

export async function createCategoryAction(formData: FormData) {
  const parsed = createCategorySchema.safeParse({
    name: formData.get('name'),
    context: formData.get('context'),
    icon: formData.get('icon') || 'category',
  });
  if (!parsed.success) {
    return {
      status: 'error' as const,
      message: 'יש להזין שם קטגוריה באורך 2 עד 50 תווים.',
    };
  }

  const authorization = await getOwnerMembershipForCategoryMutation();
  if ('error' in authorization) {
    return { status: 'error' as const, message: authorization.error };
  }

  const { membership } = authorization;
  const supabase = await createClient();
  const { data: lastCategory, error: orderError } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('household_id', membership.householdId)
    .eq('context', parsed.data.context)
    .is('archived_at', null)
    .lt('sort_order', 99)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    console.error('Category order lookup failed', { code: orderError.code });
    return {
      status: 'error' as const,
      message: categoryMutationError(orderError.code),
    };
  }

  const { error } = await supabase.from('categories').insert({
    household_id: membership.householdId,
    name: parsed.data.name,
    short_name: shortCategoryName(parsed.data.name),
    icon: parsed.data.icon,
    context: parsed.data.context,
    priority: 'flexible',
    sort_order: Math.min((lastCategory?.sort_order ?? 0) + 1, 98),
  });

  if (error) {
    console.error('Category creation failed', { code: error.code });
    return {
      status: 'error' as const,
      message: categoryMutationError(error.code),
    };
  }

  revalidatePath(routes.settings);
  revalidatePath(routes.transactions);
  return {
    status: 'success' as const,
    message: `הקטגוריה „${parsed.data.name}” נוספה.`,
  };
}

export async function renameCategoryAction(formData: FormData) {
  const parsed = renameCategorySchema.safeParse({
    categoryId: formData.get('categoryId'),
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return {
      status: 'error' as const,
      message: 'פרטי הקטגוריה אינם תקינים.',
    };
  }

  const authorization = await getOwnerMembershipForCategoryMutation();
  if ('error' in authorization) {
    return { status: 'error' as const, message: authorization.error };
  }

  const { membership } = authorization;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .update({
      name: parsed.data.name,
      short_name: shortCategoryName(parsed.data.name),
    })
    .eq('id', parsed.data.categoryId)
    .eq('household_id', membership.householdId)
    .is('archived_at', null)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error('Category rename failed', { code: error.code });
    }
    return {
      status: 'error' as const,
      message: error
        ? categoryMutationError(error.code)
        : 'הקטגוריה לא נמצאה. אפשר לרענן ולנסות שוב.',
    };
  }

  revalidatePath(routes.settings);
  revalidatePath(routes.transactions);
  return {
    status: 'success' as const,
    message: `שם הקטגוריה שונה ל„${parsed.data.name}”.`,
  };
}

export async function createHouseholdInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = createInvitationSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'יש להזין כתובת אימייל תקינה.',
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    };
  }

  let membership;
  try {
    membership = await getCurrentHouseholdMembership();
  } catch {
    return { status: 'error', message: GENERIC_INVITATION_ERROR };
  }

  if (!membership || membership.role !== 'owner') {
    return {
      status: 'error',
      message: 'רק בעלים של משק הבית יכולים לרשום הזמנה.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_household_invitation', {
    p_email: parsed.data.email,
    p_role: 'owner',
  });

  if (error || !data) {
    if (error) {
      console.error('Household invitation creation failed', {
        code: error.code,
      });
    }
    return {
      status: 'error',
      message: error
        ? friendlyInvitationError(error.message)
        : GENERIC_INVITATION_ERROR,
    };
  }

  revalidatePath(routes.settings);
  return {
    status: 'success',
    message:
      'ההזמנה נרשמה. בשלב הפרטי הנוכחי לא נשלח אימייל אוטומטי — יש ליצור או לפתוח לדניאל חשבון עם אותה כתובת.',
  };
}

export async function revokeHouseholdInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = revokeInvitationSchema.safeParse({
    invitationId: formData.get('invitationId'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'פרטי ההזמנה אינם תקינים. יש לרענן ולנסות שוב.',
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    };
  }

  let membership;
  try {
    membership = await getCurrentHouseholdMembership();
  } catch {
    return { status: 'error', message: GENERIC_INVITATION_ERROR };
  }

  if (!membership || membership.role !== 'owner') {
    return {
      status: 'error',
      message: 'רק בעלים של משק הבית יכולים לבטל הזמנה.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('revoke_household_invitation', {
    p_invitation_id: parsed.data.invitationId,
  });

  if (error || !data) {
    if (error) {
      console.error('Household invitation revocation failed', {
        code: error.code,
      });
    }
    return {
      status: 'error',
      message: 'לא הצלחנו לבטל את ההזמנה. אפשר לנסות שוב בעוד רגע.',
    };
  }

  revalidatePath(routes.settings);
  return { status: 'success', message: 'ההזמנה בוטלה.' };
}
