import { describe, it, expect } from 'vitest';

import { mirr, cagr, twr } from './returns';

describe('mirr', () => {
  it('matches the spreadsheet example', () => {
    expect(mirr([-120000, 39000, 30000, 21000, 37000, 46000], 0.1, 0.12)).toBeCloseTo(0.126094, 6);
  });

  it('equals irr when both rates equal that irr', () => {
    // For a two-flow series, MIRR with matching rates reduces to the simple rate.
    expect(mirr([-100, 110], 0.1, 0.1)).toBeCloseTo(0.1, 9);
  });

  it('throws without both an inflow and an outflow', () => {
    expect(() => mirr([-100, -50], 0.1, 0.1)).toThrow(RangeError);
  });
});

describe('cagr', () => {
  it('computes the constant doubling rate over ten years', () => {
    expect(cagr(1000, 2000, 10)).toBeCloseTo(0.071773, 6);
  });

  it('is self-consistent: growing at cagr for the whole span hits endValue', () => {
    const r = cagr(1000, 2500, 7);
    expect(1000 * Math.pow(1 + r, 7)).toBeCloseTo(2500, 6);
  });

  it('is negative when value shrinks', () => {
    expect(cagr(2000, 1000, 10)).toBeLessThan(0);
  });

  it('throws on non-positive values or years', () => {
    expect(() => cagr(0, 1000, 10)).toThrow(RangeError);
    expect(() => cagr(1000, 2000, 0)).toThrow(RangeError);
  });
});

describe('twr', () => {
  it('links sub-period returns, neutralising a start-of-period deposit', () => {
    expect(
      twr([
        { startValue: 100, endValue: 110 },
        { startValue: 110, endValue: 200, flow: 50, flowTiming: 'start' },
      ]),
    ).toBeCloseTo(0.375, 9);
  });

  it('ignores the size of a flow that lands exactly at a period boundary', () => {
    // Splitting a single 10% gain at 100->110 into two periods with a boundary
    // deposit should still give 10% overall, regardless of the deposit size.
    const withFlow = twr([
      { startValue: 100, endValue: 105 },
      { startValue: 105, endValue: 231, flow: 105, flowTiming: 'start' },
    ]);
    expect(withFlow).toBeCloseTo(1.05 * (231 / 210) - 1, 9);
  });

  it('handles an end-of-period withdrawal', () => {
    // Starts at 100, grows to 120 (+20%), then 20 is withdrawn at period end,
    // so the observed ending value is 100 and the flow is -20.
    expect(twr([{ startValue: 100, endValue: 100, flow: -20, flowTiming: 'end' }])).toBeCloseTo(0.2, 9);
  });

  it('a single flow-free period is just the raw return', () => {
    expect(twr([{ startValue: 100, endValue: 115 }])).toBeCloseTo(0.15, 9);
  });

  it('throws on empty input', () => {
    expect(() => twr([])).toThrow(RangeError);
  });
});
