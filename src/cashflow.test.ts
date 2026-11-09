import { describe, it, expect } from 'vitest';
import { npv, irr } from './cashflow';

describe('npv', () => {
  it('discounts the first cash flow by one full period', () => {
    const rate = 0.08;
    const flows = [100, 200, 300];
    const manual = 100 / 1.08 + 200 / 1.08 ** 2 + 300 / 1.08 ** 3;
    expect(npv(rate, flows)).toBeCloseTo(manual, 10);
    expect(npv(rate, flows)).toBeCloseTo(502.21, 2);
  });

  it('equals the sum of flows at a zero discount rate', () => {
    expect(npv(0, [100, -50, 25])).toBeCloseTo(75, 10);
  });

  it('rejects an empty series', () => {
    expect(() => npv(0.1, [])).toThrow(RangeError);
  });
});

describe('irr', () => {
  it('finds the rate that zeroes the net present value', () => {
    const flows = [-1000, 300, 420, 680];
    const r = irr(flows);
    // Self-check: discounting the flows at the IRR must net to ~0.
    const netAtIrr = flows.reduce((sum, cf, i) => sum + cf / (1 + r) ** i, 0);
    expect(netAtIrr).toBeCloseTo(0, 6);
  });

  it('matches a simple two-flow doubling', () => {
    // -100 now, 200 next period -> 100% return
    expect(irr([-100, 200])).toBeCloseTo(1, 8);
  });

  it('requires both an inflow and an outflow', () => {
    expect(() => irr([100, 200, 300])).toThrow(RangeError);
    expect(() => irr([-100, -200])).toThrow(RangeError);
  });

  it('requires at least two cash flows', () => {
    expect(() => irr([-100])).toThrow(RangeError);
  });
});
