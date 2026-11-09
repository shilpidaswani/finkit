import { describe, it, expect } from 'vitest';
import { amortizationSchedule } from './amortization';
import { pmt } from './annuity';

describe('amortizationSchedule', () => {
  const principal = 10000;
  const rate = 0.05 / 12;
  const nper = 12;
  const schedule = amortizationSchedule({ principal, rate, nper });

  it('has one row per period', () => {
    expect(schedule).toHaveLength(nper);
    expect(schedule[0]!.period).toBe(1);
    expect(schedule.at(-1)!.period).toBe(nper);
  });

  it('ends at a zero balance', () => {
    expect(schedule.at(-1)!.balance).toBe(0);
  });

  it("each row's interest plus principal equals its payment", () => {
    for (const row of schedule) {
      expect(row.interest + row.principal).toBeCloseTo(row.payment, 10);
    }
  });

  it('every non-final payment equals the constant pmt', () => {
    const expected = -pmt(rate, nper, principal);
    for (const row of schedule.slice(0, -1)) {
      expect(row.payment).toBeCloseTo(expected, 8);
    }
  });

  it('principal portions sum to the amount borrowed', () => {
    const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
    expect(totalPrincipal).toBeCloseTo(principal, 8);
  });

  it('the first interest charge is principal times rate', () => {
    expect(schedule[0]!.interest).toBeCloseTo(principal * rate, 8);
  });

  it('supports a balloon via residual', () => {
    const residual = 2000;
    const withBalloon = amortizationSchedule({ principal, rate, nper, residual });
    expect(withBalloon.at(-1)!.balance).toBe(residual);
  });

  it('validates its inputs', () => {
    expect(() => amortizationSchedule({ principal: -1, rate, nper })).toThrow(RangeError);
    expect(() => amortizationSchedule({ principal, rate, nper: 0 })).toThrow(RangeError);
  });
});
