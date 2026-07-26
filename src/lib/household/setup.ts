export const DEFAULT_HOUSEHOLD_NAME = 'כספי הבית';

export type HouseholdSetupActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string };

export const initialHouseholdSetupActionState: HouseholdSetupActionState = {
  status: 'idle',
};
