import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  addFingerprints,
  normalizeProviderWorksheetXml,
} from './workbook';
import type { UnfingerprintedImportCandidate } from './types';
import { agorot } from '@/types/money';

describe('provider XLSX compatibility normalization', () => {
  it('turns typed empty cells into blanks and flattens rich inline text', () => {
    const xml =
      '<x:worksheet><x:sheetData><x:row>' +
      '<x:c r="A1" t="inlineStr"><x:is /></x:c>' +
      '<x:c r="B1" t="inlineStr"><x:is><x:r><x:t>Hello </x:t></x:r><x:r><x:t>world</x:t></x:r></x:is></x:c>' +
      '<x:c r="C1" t="s"><x:v></x:v></x:c>' +
      '<x:c r="D1" t="s"><x:v>4</x:v></x:c>' +
      '</x:row></x:sheetData></x:worksheet>';

    const normalized = normalizeProviderWorksheetXml(xml);

    expect(normalized).toContain('<x:c r="A1" t="z"></x:c>');
    expect(normalized).toContain(
      '<x:c r="B1" t="inlineStr"><x:is><x:t>Hello world</x:t></x:is></x:c>',
    );
    expect(normalized).toContain('<x:c r="C1" t="z"></x:c>');
    expect(normalized).toContain('<x:c r="D1" t="s"><x:v>4</x:v></x:c>');
  });
});

describe('import fingerprints', () => {
  it('flags exact duplicates without using the source row number', () => {
    const base: UnfingerprintedImportCandidate = {
      sourceRow: 3,
      account: {
        provider: 'cal',
        accountType: 'credit_card',
        ownerHint: 'oran',
        last4: '1234',
      },
      dateISO: '2026-07-01',
      amount: agorot(-1_000),
      currency: 'ILS',
      merchant: 'חנות לדוגמה',
      status: 'cleared',
      suggestedKind: 'expense',
      suggestedContext: 'household',
      reviewReasons: [],
      eligible: true,
    };

    const candidates = addFingerprints([
      base,
      { ...base, sourceRow: 9 },
    ]);

    expect(candidates[0].fingerprint).toBe(candidates[1].fingerprint);
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eligible: false,
          reviewReasons: ['possible_duplicate'],
        }),
      ]),
    );
  });
});
