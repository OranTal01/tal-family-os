import { describe, expect, it } from 'vitest';
import { parseCalRows } from './providers/cal';
import { parseFibiRows } from './providers/fibi';
import { parseIsracardRows } from './providers/isracard';
import type { SpreadsheetRow } from './types';

describe('CAL transaction import profile', () => {
  it('normalizes expenses, refunds, cash transfers, and Danielle context review', () => {
    const rows: SpreadsheetRow[] = [
      ['פירוט עסקאות עבור דניאל'],
      [
        'תאריך\nעסקה',
        'שם בית עסק',
        'סכום\nבש"ח',
        'סכום\nבדולר',
        'כרטיס',
        'מועד\nחיוב',
        'סוג\nעסקה',
        'מזהה כרטיס\nבארנק דיגילטי',
        'הערות',
      ],
      [
        new Date('2026-07-01T00:00:00.000Z'),
        'מכולת לדוגמה',
        123.45,
        null,
        'ויזה 1639',
        new Date('2026-08-02T00:00:00.000Z'),
        'רגילה',
        null,
        '',
      ],
      [
        new Date('2026-07-02T00:00:00.000Z'),
        'כספומט לדוגמה',
        50,
        null,
        'ויזה 1639',
        new Date('2026-08-02T00:00:00.000Z'),
        'משיכת מזומן',
        'wallet-1',
        '',
      ],
      [
        new Date('2026-07-03T00:00:00.000Z'),
        'זיכוי לדוגמה',
        -10,
        null,
        'ויזה 1639',
        new Date('2026-08-02T00:00:00.000Z'),
        'רגילה',
        null,
        '',
      ],
      [
        new Date('2026-07-04T00:00:00.000Z'),
        'שורת אפס',
        0,
        null,
        'ויזה 1639',
        new Date('2026-08-02T00:00:00.000Z'),
        'רגילה',
        null,
        '',
      ],
    ];

    const result = parseCalRows(rows);

    expect(result.ownerHint).toBe('danielle');
    expect(result.candidates).toHaveLength(3);
    expect(result.rejected).toEqual([{ sourceRow: 6, reason: 'zero_amount' }]);

    const [expense, transfer, refund] = result.candidates;
    expect(expense).toMatchObject({
      amount: -12_345,
      suggestedKind: 'expense',
      suggestedContext: undefined,
      reviewReasons: ['confirm_context'],
      eligible: false,
      account: { last4: '1639' },
    });
    expect(transfer).toMatchObject({
      amount: -5_000,
      suggestedKind: 'transfer',
      reference: 'wallet-1',
      reviewReasons: ['possible_transfer', 'confirm_context'],
    });
    expect(refund).toMatchObject({
      amount: 1_000,
      suggestedKind: 'refund',
    });
  });
});

describe('FIBI transaction import profile', () => {
  it('uses the shared account and reviews income, Bit, and card settlements safely', () => {
    const rows: SpreadsheetRow[] = [
      ['תנועות בחשבון'],
      ['מספר חשבון', 123456],
      [],
      [],
      [],
      [
        null,
        'יתרה',
        'תאריך ערך',
        'זכות',
        'חובה',
        'תיאור',
        'אסמכתא',
        'סוג פעולה',
        'תאריך',
      ],
      [
        null,
        10_000,
        new Date('2026-07-01T00:00:00.000Z'),
        1_000,
        null,
        'משכורת לדוגמה',
        101,
        'זיכוי',
        new Date('2026-07-01T00:00:00.000Z'),
      ],
      [
        null,
        9_800,
        new Date('2026-07-02T00:00:00.000Z'),
        null,
        200,
        'חיוב כרטיסי אשראי',
        102,
        'ישראכרט',
        new Date('2026-07-02T00:00:00.000Z'),
      ],
      [
        null,
        9_750,
        new Date('2026-07-03T00:00:00.000Z'),
        null,
        50,
        'חנות לדוגמה',
        103,
        'רכישה',
        new Date('2026-07-03T00:00:00.000Z'),
      ],
      [
        null,
        9_250,
        new Date('2026-07-03T00:00:00.000Z'),
        null,
        500,
        'הראל פנסיה וגמל',
        106,
        'הרשאה',
        new Date('2026-07-03T00:00:00.000Z'),
      ],
      [
        null,
        10_250,
        new Date('2026-07-04T00:00:00.000Z'),
        500,
        null,
        'תשלום מלקוחה דרך ביט',
        104,
        'העברה',
        new Date('2026-07-04T00:00:00.000Z'),
      ],
      [
        null,
        10_150,
        new Date('2026-07-05T00:00:00.000Z'),
        null,
        100,
        'תשלום בביט',
        105,
        'העברה',
        new Date('2026-07-05T00:00:00.000Z'),
      ],
    ];

    const result = parseFibiRows(rows);

    expect(result.ownerHint).toBe('shared');
    expect(result.candidates).toHaveLength(6);
    expect(result.candidates[0]).toMatchObject({
      amount: 100_000,
      balanceAfter: 1_000_000,
      suggestedKind: 'income',
      suggestedContext: undefined,
      reviewReasons: ['confirm_context'],
      eligible: false,
      account: { last4: '3456', ownerHint: 'shared' },
    });
    expect(result.candidates[1]).toMatchObject({
      amount: -20_000,
      suggestedKind: 'transfer',
      reviewReasons: ['credit_card_settlement'],
      eligible: false,
      reference: '102',
    });
    expect(result.candidates[2]).toMatchObject({
      amount: -5_000,
      suggestedKind: 'expense',
      eligible: true,
    });
    expect(result.candidates[3]).toMatchObject({
      amount: -50_000,
      suggestedKind: 'transfer',
      reviewReasons: ['savings_contribution'],
      eligible: false,
    });
    expect(result.candidates[4]).toMatchObject({
      amount: 50_000,
      suggestedKind: 'income',
      suggestedContext: undefined,
      reviewReasons: ['confirm_context'],
      eligible: false,
    });
    expect(result.candidates[5]).toMatchObject({
      amount: -10_000,
      suggestedKind: 'expense',
      suggestedContext: undefined,
      reviewReasons: ['possible_transfer', 'confirm_context'],
      eligible: false,
    });
  });
});

describe('Isracard transaction import profile', () => {
  it('separates pending rows and reads rich posted columns without filename hints', () => {
    const rows: SpreadsheetRow[] = [
      ['פירוט עסקאות'],
      ['בעלת הכרטיס', 'דניאל'],
      ['כרטיס', 'ישראכרט 9928'],
      [],
      ['עסקאות שטרם נקלטו'],
      ['תאריך רכישה', 'שם בית עסק', 'סכום עסקה', 'מטבע עסקה'],
      ['01.07.26', 'עסקה ממתינה', 20, '₪'],
      [],
      ['עסקאות למועד חיוב'],
      [
        'תאריך רכישה',
        'שם בית עסק',
        'סכום עסקה',
        'מטבע עסקה',
        'סכום חיוב',
        'מטבע חיוב',
        "מס' שובר",
        'פירוט נוסף',
      ],
      ['02.07.26', 'עסקה רגילה', 30, '₪', 30, '₪', 555, 'הוראת קבע'],
      ['03.07.26', 'זיכוי', -5, '₪', -5, '₪', 556, ''],
    ];

    const result = parseIsracardRows(rows);

    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0]).toMatchObject({
      dateISO: '2026-07-01',
      amount: -2_000,
      status: 'pending',
      reviewReasons: ['pending', 'confirm_context'],
      eligible: false,
    });
    expect(result.candidates[1]).toMatchObject({
      amount: -3_000,
      status: 'cleared',
      description: 'הוראת קבע',
      reference: '555',
      account: { last4: '9928' },
    });
    expect(result.candidates[2]).toMatchObject({
      amount: 500,
      suggestedKind: 'refund',
    });
  });

  it('reads the card suffix from Isracard card headings without the word card', () => {
    const rows: SpreadsheetRow[] = [
      ['פירוט עסקאות'],
      [],
      [],
      [],
      ['WORLD ELITE MASTERCA - 9485'],
      ['על שם אורן טל'],
      [],
      [],
      [],
      [],
      [],
      ['עסקאות שטרם נקלטו'],
      ['תאריך רכישה', 'שם בית עסק', 'סכום עסקה', 'מטבע עסקה'],
      ['24.07.26', 'MYST', 220.2, '₪'],
    ];

    const result = parseIsracardRows(rows);

    expect(result.candidates[0]).toMatchObject({
      merchant: 'MYST',
      status: 'pending',
      account: { last4: '9485' },
    });
  });

  it('reads the card suffix from Hebrew Mastercard headings', () => {
    const rows: SpreadsheetRow[] = [
      ['פירוט עסקאות'],
      [],
      [],
      [],
      ['פלטינה מסטרקארד - 9928'],
      ['על שם דניאל טל'],
      [],
      [],
      [],
      [],
      ['עסקאות למועד חיוב'],
      [
        'תאריך רכישה',
        'שם בית עסק',
        'סכום עסקה',
        'מטבע עסקה',
        'סכום חיוב',
        'מטבע חיוב',
        "מס' שובר",
        'פירוט נוסף',
      ],
      ['24.07.26', 'נאייקס ישראל מכונות', 10, '₪', 10, '₪', 785365038, ''],
    ];

    const result = parseIsracardRows(rows);

    expect(result.candidates[0]).toMatchObject({
      merchant: 'נאייקס ישראל מכונות',
      account: { last4: '9928', ownerHint: 'danielle' },
    });
  });
});
