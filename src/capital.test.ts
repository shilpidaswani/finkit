import { describe, it, expect } from 'vitest';

import { paybackPeriod, discountedPaybackPeriod, profitabilityIndex } from './capital';

describe('paybackPeriod', () => {
  it('interpolates within the recovery period', () => {
    // After 2 periods cumulative is -300; the 400 inflow in period 3 covers it at 0.75.
    expect(paybackPeriod([-1000, 300, 400, 400, 500])).toBeCloseTo(2.75, 10);
  });

  it('is a whole number when a flow lands exactly on zero', () => {
    expect(paybackPeriod([-1000, 500, 500])).toBeCloseTo(2, 10);
  });

  it('is 0 when there is no net outlay to recover', () => {
    expect(paybackPeriod([0, 100])).toBe(0);
    expect(paybackPeriod([500, 100])).toBe(0);
  });

  it('returns Infinity when never recovered', () => {
    expect(paybackPeriod([-1000, 200, 300])).toBe(Infinity);
  });

  it('throws on too few flows', () => {
    expect(() => paybackPeriod([-1000])).toThrow(RangeError);
  });
});

describe('discountedPaybackPeriod', () => {
  it('discounts each flow before recovering the outlay', () => {
    expect(discountedPaybackPeriod(0.1, [-1000, 500, 400, 300, 200])).toBeCloseTo(2.953333, 5);
  });

  it('is never shorter than the undiscounted payback', () => {
    const flows = [-1000, 400, 400, 400, 400];
    expect(discountedPaybackPeriod(0.08, flows)).toBeGreaterThanOrEqual(paybackPeriod(flows));
  });

  it('equals the undiscounted payback at a zero rate', () => {
    const flows = [-1000, 300, 400, 400, 500];
    expect(discountedPaybackPeriod(0, flows)).toBeCloseTo(paybackPeriod(flows), 10);
  });

  it('returns Infinity when discounted flows never recover the outlay', () => {
    expect(discountedPaybackPeriod(0.5, [-1000, 300, 300, 300])).toBe(Infinity);
  });

  it('throws on a rate at or below -100%', () => {
    expect(() => discountedPaybackPeriod(-1, [-1000, 500, 600])).toThrow(RangeError);
  });
});

describe('profitabilityIndex', () => {
  it('is the PV of future flows over the initial outlay', () => {
    expect(profitabilityIndex(0.1, [-1000, 500, 400, 300, 100])).toBeCloseTo(1.07882, 5);
  });

  it('equals 1 + NPV / |initial outlay|', () => {
    const flows = [-1000, 500, 400, 300, 100];
    const rate = 0.1;
    let npv0 = 0;
    for (let t = 0; t < flows.length; t++) npv0 += flows[t]! / Math.pow(1 + rate, t);
    expect(profitabilityIndex(rate, flows)).toBeCloseTo(1 + npv0 / 1000, 10);
  });

  it('is above 1 exactly when NPV is positive', () => {
    expect(profitabilityIndex(0.05, [-1000, 600, 600])).toBeGreaterThan(1);
    expect(profitabilityIndex(0.5, [-1000, 300, 300])).toBeLessThan(1);
  });

  it('throws when the initial flow is not a negative outlay', () => {
    expect(() => profitabilityIndex(0.1, [1000, -500, -400])).toThrow(RangeError);
  });
});
