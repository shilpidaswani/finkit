import { describe, it, expect } from 'vitest';

import { yearFraction } from './daycount';

const d = (iso: string): Date => new Date(iso);

describe('yearFraction', () => {
  it('ACT/365 counts actual days over a 365-day year', () => {
    // 2024 is a leap year: Jan 1 -> Jul 1 is 182 days.
    expect(yearFraction(d('2024-01-01'), d('2024-07-01'), 'ACT/365')).toBeCloseTo(182 / 365, 12);
  });

  it('ACT/360 counts actual days over a 360-day year', () => {
    expect(yearFraction(d('2024-01-01'), d('2024-07-01'), 'ACT/360')).toBeCloseTo(182 / 360, 12);
  });

  it('ACT/365 of a full non-leap year is 1', () => {
    expect(yearFraction(d('2023-01-01'), d('2024-01-01'), 'ACT/365')).toBeCloseTo(1, 12);
  });

  it('30/360 treats every month as 30 days', () => {
    // Six whole months, both on the 1st: exactly half a year.
    expect(yearFraction(d('2024-01-01'), d('2024-07-01'), '30/360')).toBeCloseTo(0.5, 12);
  });

  it('30/360 US and 30E/360 differ when the end date is the 31st', () => {
    // US keeps day 31 (start day is not 30); European rolls it back to 30.
    const us = yearFraction(d('2024-02-15'), d('2024-08-31'), '30/360');
    const eu = yearFraction(d('2024-02-15'), d('2024-08-31'), '30E/360');
    expect(us).toBeCloseTo(196 / 360, 12);
    expect(eu).toBeCloseTo(195 / 360, 12);
  });

  it('ACT/ACT (ISDA) splits the span across calendar years by their own length', () => {
    // 2023 (365) and 2024 (366): 184/365 in 2023 + 182/366 in 2024.
    const expected = 184 / 365 + 182 / 366;
    expect(yearFraction(d('2023-07-01'), d('2024-07-01'), 'ACT/ACT')).toBeCloseTo(expected, 12);
  });

  it('ACT/ACT within a single leap year uses 366', () => {
    expect(yearFraction(d('2024-01-01'), d('2024-07-01'), 'ACT/ACT')).toBeCloseTo(182 / 366, 12);
  });

  it('defaults to ACT/365', () => {
    expect(yearFraction(d('2024-01-01'), d('2024-07-01'))).toBe(
      yearFraction(d('2024-01-01'), d('2024-07-01'), 'ACT/365'),
    );
  });

  it('is antisymmetric: reversing the dates negates the result', () => {
    const f = yearFraction(d('2024-01-01'), d('2024-07-01'), 'ACT/365');
    expect(yearFraction(d('2024-07-01'), d('2024-01-01'), 'ACT/365')).toBeCloseTo(-f, 12);
  });

  it('is independent of the time of day (and host time zone)', () => {
    const a = yearFraction(
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-07-01T23:59:59Z'),
      'ACT/365',
    );
    const b = yearFraction(d('2024-01-01'), d('2024-07-01'), 'ACT/365');
    expect(a).toBeCloseTo(b, 12);
  });

  it('throws on an invalid date', () => {
    expect(() => yearFraction(new Date('nonsense'), d('2024-01-01'))).toThrow(TypeError);
  });

  it('throws on an unknown convention', () => {
    // @ts-expect-error — exercising the runtime guard with a bad value.
    expect(() => yearFraction(d('2024-01-01'), d('2024-07-01'), 'ACT/999')).toThrow(RangeError);
  });
});
