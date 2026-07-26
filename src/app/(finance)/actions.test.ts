import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HOUSEHOLD_NAME } from '@/lib/household/setup';
import {
  acceptHouseholdInvitationAction,
  createHouseholdAction,
} from './actions';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  getCurrentHouseholdMembership: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/lib/supabase/dal', () => ({
  getCurrentUser: mocks.getCurrentUser,
  getCurrentProfile: mocks.getCurrentProfile,
  getCurrentHouseholdMembership: mocks.getCurrentHouseholdMembership,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

function setupFormData(name: string | null = DEFAULT_HOUSEHOLD_NAME) {
  const formData = new FormData();
  if (name !== null) formData.set('householdName', name);
  return formData;
}

function invitationFormData(
  invitationId: string | null = '20000000-0000-4000-8000-000000000001',
) {
  const formData = new FormData();
  if (invitationId !== null) formData.set('invitationId', invitationId);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  });
  mocks.getCurrentUser.mockResolvedValue({ id: 'profile-1' });
  mocks.getCurrentProfile.mockResolvedValue({
    id: 'profile-1',
    display_name: 'אורן',
  });
  mocks.getCurrentHouseholdMembership.mockResolvedValue(null);
  mocks.rpc.mockResolvedValue({ data: 'household-1', error: null });
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe('createHouseholdAction', () => {
  it('rejects a manipulated household name before touching authenticated data', async () => {
    const result = await createHouseholdAction(
      { status: 'idle' },
      setupFormData('משק בית אחר'),
    );

    expect(result.status).toBe('error');
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns a visible session error for an unauthenticated submission', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const result = await createHouseholdAction(
      { status: 'idle' },
      setupFormData(),
    );

    expect(result).toEqual({
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns a visible account error when the profile is missing', async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);

    const result = await createHouseholdAction(
      { status: 'idle' },
      setupFormData(),
    );

    expect(result).toEqual({
      status: 'error',
      message: 'פרופיל המשתמש לא נמצא. יש לפנות למי שמנהל את המערכת.',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('redirects without another RPC when a retry already has membership', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue({
      householdId: 'household-existing',
      role: 'owner',
    });

    await expect(
      createHouseholdAction({ status: 'idle' }, setupFormData()),
    ).rejects.toThrow('NEXT_REDIRECT:/dashboard');

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns a calm retry state when membership lookup fails', async () => {
    mocks.getCurrentHouseholdMembership.mockRejectedValue(new Error('network'));

    const result = await createHouseholdAction(
      { status: 'idle' },
      setupFormData(),
    );

    expect(result.status).toBe('error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns a calm retry state when the RPC fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'database failure' },
    });

    const result = await createHouseholdAction(
      { status: 'idle' },
      setupFormData(),
    );

    expect(result.status).toBe('error');
    expect(consoleError).toHaveBeenCalledWith('Household bootstrap RPC failed', {
      code: 'P0001',
    });
    consoleError.mockRestore();
  });

  it('calls the authenticated RPC and redirects after successful bootstrap', async () => {
    await expect(
      createHouseholdAction({ status: 'idle' }, setupFormData()),
    ).rejects.toThrow('NEXT_REDIRECT:/dashboard');

    expect(mocks.rpc).toHaveBeenCalledWith('create_household', {
      p_name: DEFAULT_HOUSEHOLD_NAME,
    });
  });
});

describe('acceptHouseholdInvitationAction', () => {
  it('rejects a manipulated invitation id before touching authenticated data', async () => {
    const result = await acceptHouseholdInvitationAction(
      { status: 'idle' },
      invitationFormData('not-a-uuid'),
    );

    expect(result.status).toBe('error');
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('redirects without accepting another invitation when membership already exists', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue({
      householdId: 'household-existing',
      role: 'owner',
    });

    await expect(
      acceptHouseholdInvitationAction(
        { status: 'idle' },
        invitationFormData(),
      ),
    ).rejects.toThrow('NEXT_REDIRECT:/dashboard');

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns a calm error when the database rejects the invitation', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'household invitation has expired' },
    });

    const result = await acceptHouseholdInvitationAction(
      { status: 'idle' },
      invitationFormData(),
    );

    expect(result.status).toBe('error');
    expect(consoleError).toHaveBeenCalledWith(
      'Household invitation acceptance failed',
      { code: 'P0001' },
    );
    consoleError.mockRestore();
  });

  it('accepts through the authenticated RPC and redirects to the dashboard', async () => {
    mocks.rpc.mockResolvedValue({ data: 'household-1', error: null });

    await expect(
      acceptHouseholdInvitationAction(
        { status: 'idle' },
        invitationFormData(),
      ),
    ).rejects.toThrow('NEXT_REDIRECT:/dashboard');

    expect(mocks.rpc).toHaveBeenCalledWith('accept_household_invitation', {
      p_invitation_id: '20000000-0000-4000-8000-000000000001',
    });
  });
});
