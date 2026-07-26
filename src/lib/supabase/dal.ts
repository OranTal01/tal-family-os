import 'server-only';

import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  memberRoleLabels,
  type HouseholdInvitationListItem,
  type HouseholdPersonListItem,
  type PendingHouseholdInvitation,
} from '@/lib/household/invitations';
import type { Database } from '@/types/database.generated';
import { createClient } from './server';

type MemberRole = Database['public']['Enums']['member_role'];

export type CurrentHouseholdMembership = {
  householdId: string;
  role: MemberRole;
};

/**
 * Data Access Layer for the current session. Unlike the proxy's `getClaims()`
 * check (a fast, local JWT verification used only to decide redirects),
 * `auth.getUser()` re-verifies the session against Supabase's Auth server — this
 * is the boundary Server Components / Server Actions should trust before touching
 * data. `cache()` dedupes repeated calls within a single render pass.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return data;
});

/**
 * Resolves household scope from the trusted authenticated profile. The product
 * is intentionally single-household; ordering makes legacy multi-membership
 * data deterministic without accepting a household id from the browser.
 */
export const getCurrentHouseholdMembership = cache(
  async (): Promise<CurrentHouseholdMembership | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('Unable to resolve the current household membership', {
        cause: error,
      });
    }

    if (!data) return null;

    return {
      householdId: data.household_id,
      role: data.role,
    };
  },
);

/**
 * Reads the one invitation whose normalized email matches the verified Auth
 * account. The RPC deliberately exposes no household IDs or invitation emails.
 */
export const getPendingHouseholdInvitation = cache(
  async (): Promise<PendingHouseholdInvitation | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      'get_pending_household_invitation',
    );

    if (error) {
      throw new Error('Unable to resolve a pending household invitation', {
        cause: error,
      });
    }

    const invitation = data?.[0];
    if (!invitation) return null;

    return {
      invitationId: invitation.invitation_id,
      householdName: invitation.household_name,
      invitedRole: invitation.invited_role,
      inviterName: invitation.inviter_name,
      expiresAt: invitation.expires_at,
      isExpired: invitation.is_expired,
    };
  },
);

/** Lists active invitations for the current household owner. */
export const getCurrentHouseholdInvitations = cache(
  async (): Promise<HouseholdInvitationListItem[]> => {
    const membership = await getCurrentHouseholdMembership();
    if (!membership || membership.role !== 'owner') return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('household_invitations')
      .select('id, email, role, expires_at')
      .eq('household_id', membership.householdId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Unable to load household invitations', { cause: error });
    }

    const now = Date.now();
    return data.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expires_at,
      isExpired: new Date(invitation.expires_at).getTime() <= now,
    }));
  },
);

/**
 * Builds the household member list from real people + membership rows. Children
 * can exist without login access, while adults with profiles receive a role label.
 */
export const getCurrentHouseholdPeople = cache(
  async (): Promise<HouseholdPersonListItem[]> => {
    const membership = await getCurrentHouseholdMembership();
    if (!membership) return [];

    const supabase = await createClient();
    const [peopleResult, membershipsResult] = await Promise.all([
      supabase
        .from('people')
        .select('id, name, kind, profile_id')
        .eq('household_id', membership.householdId)
        .is('archived_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('household_members')
        .select('profile_id, role')
        .eq('household_id', membership.householdId),
    ]);

    if (peopleResult.error || membershipsResult.error) {
      throw new Error('Unable to load household people', {
        cause: peopleResult.error ?? membershipsResult.error,
      });
    }

    const roles = new Map(
      membershipsResult.data.map((member) => [member.profile_id, member.role]),
    );

    return peopleResult.data.map((person) => {
      const role = person.profile_id ? roles.get(person.profile_id) : undefined;
      return {
        id: person.id,
        name: person.name,
        kind: person.kind,
        initial: Array.from(person.name.trim())[0] ?? '?',
        role:
          person.kind === 'child'
            ? 'ילד/ה · ללא גישה למערכת'
            : role
              ? memberRoleLabels[role]
              : 'מבוגר/ת · ללא גישה למערכת',
      };
    });
  },
);
