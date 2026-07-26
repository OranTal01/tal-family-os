'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  DEFAULT_HOUSEHOLD_NAME,
  type HouseholdSetupActionState,
} from '@/lib/household/setup';
import type { InvitationActionState } from '@/lib/household/invitations';
import { routes } from '@/lib/routes';
import {
  getCurrentHouseholdMembership,
  getCurrentProfile,
  getCurrentUser,
} from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';

const householdSetupSchema = z.object({
  householdName: z.literal(DEFAULT_HOUSEHOLD_NAME),
});

const RETRY_MESSAGE = 'לא הצלחנו להקים את כספי הבית. אפשר לנסות שוב בעוד רגע.';
const invitationAcceptanceSchema = z.object({
  invitationId: z.string().uuid(),
});

/**
 * Creates the first household through the authenticated, retry-safe database
 * RPC. Every authorization input is resolved again on the server.
 */
export async function createHouseholdAction(
  _previousState: HouseholdSetupActionState,
  formData: FormData,
): Promise<HouseholdSetupActionState> {
  const parsed = householdSetupSchema.safeParse({
    householdName: formData.get('householdName'),
  });

  if (!parsed.success) {
    return { status: 'error', message: RETRY_MESSAGE };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      status: 'error',
      message: 'פרופיל המשתמש לא נמצא. יש לפנות למי שמנהל את המערכת.',
    };
  }

  let existingMembership;
  try {
    existingMembership = await getCurrentHouseholdMembership();
  } catch {
    return { status: 'error', message: RETRY_MESSAGE };
  }

  if (existingMembership) {
    redirect(routes.dashboard);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_household', {
    p_name: parsed.data.householdName,
  });

  if (error || !data) {
    if (error) {
      console.error('Household bootstrap RPC failed', { code: error.code });
    }
    return { status: 'error', message: RETRY_MESSAGE };
  }

  redirect(routes.dashboard);
}

/**
 * Accepts only the invitation selected by the database for the authenticated,
 * email-confirmed account. The RPC repeats every authorization check atomically.
 */
export async function acceptHouseholdInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = invitationAcceptanceSchema.safeParse({
    invitationId: formData.get('invitationId'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'פרטי ההזמנה אינם תקינים. יש לרענן את העמוד ולנסות שוב.',
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      status: 'error',
      message: 'פרופיל המשתמש לא נמצא. יש לפנות למי שמנהל את המערכת.',
    };
  }

  let membership;
  try {
    membership = await getCurrentHouseholdMembership();
  } catch {
    return {
      status: 'error',
      message: 'לא הצלחנו לבדוק את החברות במשק הבית. אפשר לנסות שוב בעוד רגע.',
    };
  }

  if (membership) {
    redirect(routes.dashboard);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_household_invitation', {
    p_invitation_id: parsed.data.invitationId,
  });

  if (error || !data) {
    if (error) {
      console.error('Household invitation acceptance failed', {
        code: error.code,
      });
    }
    return {
      status: 'error',
      message:
        'לא הצלחנו לאשר את ההזמנה. ייתכן שפג תוקפה; בקשו מבעל/ת הבית לחדש אותה.',
    };
  }

  redirect(routes.dashboard);
}
