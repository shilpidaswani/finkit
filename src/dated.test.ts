import { describe, it, expect } from 'vitest';

import { xnpv, xirr, type DatedCashFlow } from './dated';

const flow = (amount: number, iso: string): DatedCashFlow => ({ amount, date: new Date(iso) });

// A quick-payback series: most of the 10,000 outlay returns within three
// months, then a final 4,250 at ten months — a high annualised return. The
// cash flows have a single sign change, so the IRR is unique. The reference
// root (1.0879929703) was cross-checked by independent bisection and agrees
// with a spreadsheet's XIRR on the same flows.
const quickPayback: DatedCashFlow[] = [
  flow(-10000, '2008-01-01'),
  flow(2750, '2008-03-01'),
  flow(4250, '2008-10-30'),
  flow(3250, '2008-02-15'),
  flow(2750, '2008-04-01'),
];

describe('xnpv', () => {
  it('is exactly zero when the annual rate matches a one-year gain', () => {
    // 2024-01-01 -> 2024-12-31 is exactly 365 days, so t = 1 and 1100/1.1 = 1000.
    const flows = [flow(-1000, '2024-01-01'), flow(1100, '2024-12-31')];
    expect(xnpv(0.1, flows)).toBeCloseTo(0, 6);
  });

  it('does not discount the first flow', () => {
    const flows = [flow(-500, '2024-01-01'), flow(0, '2024-07-01')];
    expect(xnpv(0.2, flows)).toBeCloseTo(-500, 10);
  });

  it('discounts a later flow by (1 + rate)^(days/365)', () => {
    const flows = [flow(0, '2024-01-01'), flow(1000, '2024-12-31')];
    expect(xnpv(0.08, flows)).toBeCloseTo(1000 / Math.pow(1.08, 365 / 365), 9);
  });

  it('is independent of the order the later flows are listed in', () => {
    // Anchoring both lists on the same first flow (the 2008-01-01 outlay), the
    // remaining flows can be reordered without changing the result.
    const ordered = [quickPayback[0]!, quickPayback[1]!, quickPayback[2]!, quickPayback[3]!, quickPayback[4]!];
    const reordered = [quickPayback[0]!, quickPayback[3]!, quickPayback[4]!, quickPayback[1]!, quickPayback[2]!];
    expect(xnpv(0.09, reordered)).toBeCloseTo(xnpv(0.09, ordered), 9);
  });

  it('throws when the rate is at or below -100%', () => {
    expect(() => xnpv(-1, [flow(-1, '2024-01-01'), flow(1, '2025-01-01')])).toThrow(RangeError);
  });
});

describe('xirr', () => {
  it('finds the unique root of the quick-payback series', () => {
    expect(xirr(quickPayback)).toBeCloseTo(1.0879929703, 6);
  });

  it('recovers a clean 10% annual return', () => {
    const flows = [flow(-1000, '2024-01-01'), flow(1100, '2024-12-31')];
    expect(xirr(flows)).toBeCloseTo(0.1, 6);
  });

  it('is the rate at which xnpv is zero', () => {
    const r = xirr(quickPayback);
    expect(xnpv(r, quickPayback)).toBeCloseTo(0, 4);
  });

  it('handles a steep negative return', () => {
    const flows = [flow(-1000, '2024-01-01'), flow(100, '2024-12-31')];
    const r = xirr(flows);
    expect(xnpv(r, flows)).toBeCloseTo(0, 4);
    expect(r).toBeLessThan(0);
  });

  it('throws without both a positive and a negative flow', () => {
    expect(() => xirr([flow(100, '2024-01-01'), flow(200, '2025-01-01')])).toThrow(RangeError);
  });

  it('throws on fewer than two flows', () => {
    expect(() => xirr([flow(-100, '2024-01-01')])).toThrow(RangeError);
  });
});
