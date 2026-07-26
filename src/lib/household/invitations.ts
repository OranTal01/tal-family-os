import type { Database } from '@/types/database.generated';

export type MemberRole = Database['public']['Enums']['member_role'];

export type PendingHouseholdInvitation = {
  invitationId: string;
  householdName: string;
  invitedRole: MemberRole;
  inviterName: string;
  expiresAt: string;
  isExpired: boolean;
};
export type HouseholdInvitationListItem = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  isExpired: boolean;
};

export type HouseholdPersonListItem = {
  id: string;
  name: string;
  kind: 'adult' | 'child';
  initial: string;
  role: string;
};

export type InvitationActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string };

export const initialInvitationActionState: InvitationActionState = {
  status: 'idle',
};

export const memberRoleLabels: Record<MemberRole, string> = {
  owner: 'בעלים · גישה מלאה',
  member: 'חבר/ת משק בית · עריכה',
  viewer: 'צפייה בלבד',
};
