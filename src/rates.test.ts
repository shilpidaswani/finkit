import { describe, it, expect } from 'vitest';
import { effectiveRate, nominalRate } from './rates';

describe('effectiveRate / nominalRate', () => {
  it('converts a nominal monthly rate to its effective annual rate', () => {
    // Excel: =EFFECT(0.06, 12) -> 0.0616778...
    expect(effectiveRate(0.06, 12)).toBeCloseTo(0.0616778, 7);
  });

  it('is a no-op when compounding once a year', () => {
    expect(effectiveRate(0.06, 1)).toBeCloseTo(0.06, 12);
  });

  it('nominalRate inverts effectiveRate', () => {
    for (const periods of [1, 2, 4, 12, 365]) {
      const eff = effectiveRate(0.09, periods);
      expect(nominalRate(eff, periods)).toBeCloseTo(0.09, 12);
    }
  });

  it('validates compounding frequency', () => {
    expect(() => effectiveRate(0.06, 0)).toThrow(RangeError);
    expect(() => effectiveRate(0.06, 2.5)).toThrow(RangeError);
  });
});
