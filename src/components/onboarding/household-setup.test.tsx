import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HouseholdSetup } from './household-setup';
import { DEFAULT_HOUSEHOLD_NAME } from '@/lib/household/setup';

vi.mock('@/app/(finance)/actions', () => ({
  createHouseholdAction: vi.fn(),
}));

vi.mock('@/components/auth/sign-out-button', () => ({
  SignOutButton: () => <button type='button'>התנתקות</button>,
}));

describe('HouseholdSetup', () => {
  it('explains the private first-owner setup and submits the fixed household name', () => {
    render(<HouseholdSetup displayName='אורן' />);

    expect(
      screen.getByRole('heading', { name: 'בואו נקים את כספי הבית' }),
    ).toBeInTheDocument();
    expect(screen.getByText('שלום אורן')).toBeInTheDocument();
    expect(
      screen.getByText(/רק בני משפחה שתאשרו יוכלו לראות או לעדכן/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /הקמת כספי הבית/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התנתקות' })).toBeInTheDocument();

    const hiddenName = document.querySelector<HTMLInputElement>(
      'input[name="householdName"]',
    );
    expect(hiddenName).toHaveValue(DEFAULT_HOUSEHOLD_NAME);
  });
});
