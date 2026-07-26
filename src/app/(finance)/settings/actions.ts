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
