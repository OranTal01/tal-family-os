/**
 * Money is always integer agorot (1₪ = 100 agorot). Never floating point.
 * The brand prevents accidentally mixing plain numbers into money math.
 */
export type Agorot = number & { readonly __brand: 'Agorot' };

/** Construct Agorot from an integer agorot value. Throws on non-integers. */
export function agorot(value: number): Agorot {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Money must be integer agorot, got ${value}`);
  }
  return value as Agorot;
}

/** Convenience for mock data: whole shekels → agorot. */
export function ils(shekels: number): Agorot {
  if (!Number.isSafeInteger(shekels * 100)) {
    throw new Error(`Money must resolve to integer agorot, got ₪${shekels}`);
  }
  return (shekels * 100) as Agorot;
}

export const ZERO: Agorot = 0 as Agorot;

export function addMoney(...values: Agorot[]): Agorot {
  return values.reduce<number>((sum, v) => sum + v, 0) as Agorot;
}

export function subtractMoney(a: Agorot, b: Agorot): Agorot {
  return (a - b) as Agorot;
}

export function negate(a: Agorot): Agorot {
  return -a as Agorot;
}

export function absMoney(a: Agorot): Agorot {
  return Math.abs(a) as Agorot;
}

/** Integer multiply (e.g. installment count). */
export function multiplyMoney(a: Agorot, by: number): Agorot {
  return agorot(Math.round(a * by));
}
