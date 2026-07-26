import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HouseholdInvitation } from './household-invitation';

vi.mock('@/app/(finance)/actions', () => ({
  acceptHouseholdInvitationAction: vi.fn(),
}));

vi.mock('@/components/auth/sign-out-button', () => ({
  SignOutButton: () => <button type='button'>התנתקות</button>,
}));

const invitation = {
  invitationId: '40000000-0000-4000-8000-000000000001',
  householdName: 'כספי הבית',
  invitedRole: 'owner' as const,
  inviterName: 'אורן',
  expiresAt: '2026-08-09T12:00:00.000Z',
  isExpired: false,
};

describe('HouseholdInvitation', () => {
  it('explains the exact-email invitation and submits its fixed id', () => {
    render(
      <HouseholdInvitation invitation={invitation} displayName='דניאל' />,
    );

    expect(
      screen.getByRole('heading', { name: 'הוזמנת אל כספי הבית' }),
    ).toBeInTheDocument();
    expect(screen.getByText('שלום דניאל')).toBeInTheDocument();
    expect(screen.getByText('בעלים · גישה מלאה')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /אישור והצטרפות/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/רק לחשבון עם כתובת האימייל/)).toBeInTheDocument();

    expect(
      document.querySelector<HTMLInputElement>('input[name="invitationId"]'),
    ).toHaveValue(invitation.invitationId);
  });

  it('does not offer acceptance after the invitation expires', () => {
    render(
      <HouseholdInvitation
        invitation={{ ...invitation, isExpired: true }}
        displayName='דניאל'
      />,
    );

    expect(screen.getByText('תוקף ההזמנה פג')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /אישור והצטרפות/ }),
    ).not.toBeInTheDocument();
  });
});
