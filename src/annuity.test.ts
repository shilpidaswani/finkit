import { describe, it, expect } from 'vitest';
import { fv, pv, pmt, nper, rate } from './annuity';

describe('pmt', () => {
  it('matches a known 30-year mortgage payment', () => {
    // Excel: =PMT(0.06/12, 360, 200000) -> -1199.10
    expect(pmt(0.06 / 12, 360, 200000)).toBeCloseTo(-1199.1, 2);
  });

  it('handles a zero interest rate', () => {
    expect(pmt(0, 10, 1000)).toBe(-100);
  });

  it('an annuity-due payment is smaller in magnitude than an ordinary one', () => {
    const ordinary = Math.abs(pmt(0.06 / 12, 360, 200000));
    const due = Math.abs(pmt(0.06 / 12, 360, 200000, { due: 'begin' }));
    expect(due).toBeLessThan(ordinary);
  });
});

describe('zero-rate cases', () => {
  it('fv is just the sum of payments', () => {
    expect(fv(0, 10, -100)).toBe(1000);
  });
  it('pv is just the sum of payments', () => {
    expect(pv(0, 10, -100)).toBe(1000);
  });
  it('nper divides out', () => {
    expect(nper(0, -100, 1000)).toBe(10);
  });
});

describe('round-trip consistency', () => {
  const r = 0.05 / 12;
  const n = 120;
  const P = 25000;

  it('pv inverts pmt', () => {
    const payment = pmt(r, n, P);
    expect(Math.abs(pv(r, n, payment))).toBeCloseTo(P, 4);
  });

  it('nper inverts pmt', () => {
    const payment = pmt(r, n, P);
    expect(nper(r, payment, P)).toBeCloseTo(n, 6);
  });

  it('rate inverts pmt', () => {
    const payment = pmt(r, n, P);
    expect(rate(n, payment, P)).toBeCloseTo(r, 10);
  });

  it('fv and pv are consistent through a payment stream', () => {
    const payment = -300;
    const future = fv(r, n, payment);
    expect(pmt(r, n, 0, { fv: future })).toBeCloseTo(payment, 8);
  });
});

describe('annuity due', () => {
  it('rate still inverts pmt with begin-of-period payments', () => {
    const r = 0.04 / 12;
    const n = 48;
    const P = 15000;
    const payment = pmt(r, n, P, { due: 'begin' });
    expect(rate(n, payment, P, { due: 'begin' })).toBeCloseTo(r, 10);
  });
});

describe('validation', () => {
  it('throws on a non-finite input', () => {
    expect(() => pmt(Number.NaN, 10, 1000)).toThrow(RangeError);
    expect(() => fv(0.01, Infinity, -100)).toThrow(RangeError);
  });
  it('throws when it cannot converge', () => {
    // An impossible ask: no rate makes these cash flows balance.
    expect(() => rate(12, 100, 100)).toThrow(RangeError);
  });
});
