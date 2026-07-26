import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/lib/routes';
import {
  createHouseholdInvitationAction,
  revokeHouseholdInvitationAction,
} from './actions';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentHouseholdMembership: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/lib/supabase/dal', () => ({
  getCurrentUser: mocks.getCurrentUser,
  getCurrentHouseholdMembership: mocks.getCurrentHouseholdMembership,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

function formDataWith(name: string, value: string) {
  const formData = new FormData();
  formData.set(name, value);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({
    id: 'profile-1',
    email: 'oran@example.com',
  });
  mocks.getCurrentHouseholdMembership.mockResolvedValue({
    householdId: 'household-1',
    role: 'owner',
  });
  mocks.rpc.mockResolvedValue({
    data: '30000000-0000-4000-8000-000000000001',
    error: null,
  });
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe('createHouseholdInvitationAction', () => {
  it('rejects an invalid email before loading the authenticated user', async () => {
    const result = await createHouseholdInvitationAction(
      { status: 'idle' },
      formDataWith('email', 'not-an-email'),
    );

    expect(result).toEqual({
      status: 'error',
      message: 'יש להזין כתובת אימייל תקינה.',
    });
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('does not let a non-owner create an invitation', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue({
      householdId: 'household-1',
      role: 'member',
    });

    const result = await createHouseholdInvitationAction(
      { status: 'idle' },
      formDataWith('email', 'danielle@example.com'),
    );

    expect(result.status).toBe('error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('normalizes the email and creates an owner invitation', async () => {
    const result = await createHouseholdInvitationAction(
      { status: 'idle' },
      formDataWith('email', '  DANIELLE@EXAMPLE.COM  '),
    );

    expect(result.status).toBe('success');
    expect(mocks.rpc).toHaveBeenCalledWith('create_household_invitation', {
      p_email: 'danielle@example.com',
      p_role: 'owner',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(routes.settings);
  });

  it('returns a useful message when that account already has a household', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'the invited account already belongs to a household',
      },
    });

    const result = await createHouseholdInvitationAction(
      { status: 'idle' },
      formDataWith('email', 'danielle@example.com'),
    );

    expect(result).toEqual({
      status: 'error',
      message: 'לחשבון עם האימייל הזה כבר יש משק בית.',
    });
    consoleError.mockRestore();
  });
});

describe('revokeHouseholdInvitationAction', () => {
  it('revokes through the owner-only RPC and refreshes settings', async () => {
    const result = await revokeHouseholdInvitationAction(
      { status: 'idle' },
      formDataWith(
        'invitationId',
        '30000000-0000-4000-8000-000000000001',
      ),
    );

    expect(result).toEqual({
      status: 'success',
      message: 'ההזמנה בוטלה.',
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'revoke_household_invitation',
      {
        p_invitation_id: '30000000-0000-4000-8000-000000000001',
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(routes.settings);
  });
});
