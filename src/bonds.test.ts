import { describe, it, expect } from 'vitest';

import {
  bondPrice,
  yieldToMaturity,
  macaulayDuration,
  modifiedDuration,
  convexity,
  accruedInterest,
  type Bond,
} from './bonds';

// 8% semi-annual coupon, 10 years to maturity, face 100.
const bond: Bond = { couponRate: 0.08, yearsToMaturity: 10, frequency: 2 };

describe('bondPrice', () => {
  it('prices a discount bond (yield above coupon)', () => {
    expect(bondPrice(bond, 0.1)).toBeCloseTo(87.537790, 5);
  });

  it('prices at par when yield equals the coupon rate', () => {
    expect(bondPrice({ couponRate: 0.06, yearsToMaturity: 2, frequency: 1 }, 0.06)).toBeCloseTo(100, 9);
    expect(bondPrice(bond, 0.08)).toBeCloseTo(100, 9);
  });

  it('prices at a premium when yield is below the coupon rate', () => {
    expect(bondPrice(bond, 0.06)).toBeGreaterThan(100);
  });

  it('handles a zero yield as the undiscounted sum of cash flows', () => {
    // 20 coupons of 4 plus 100 face = 180.
    expect(bondPrice(bond, 0)).toBeCloseTo(180, 9);
  });
});

describe('yieldToMaturity', () => {
  it('inverts bondPrice', () => {
    const price = bondPrice(bond, 0.1);
    expect(yieldToMaturity(bond, price)).toBeCloseTo(0.1, 8);
  });

  it('returns the coupon rate for a bond priced at par', () => {
    expect(yieldToMaturity(bond, 100)).toBeCloseTo(0.08, 8);
  });

  it('round-trips across a range of yields', () => {
    for (const y of [0.01, 0.03, 0.08, 0.12, 0.2]) {
      expect(yieldToMaturity(bond, bondPrice(bond, y))).toBeCloseTo(y, 7);
    }
  });

  it('throws on a non-positive price', () => {
    expect(() => yieldToMaturity(bond, 0)).toThrow(RangeError);
  });
});

describe('duration and convexity', () => {
  it('computes Macaulay duration for a simple par bond', () => {
    expect(macaulayDuration({ couponRate: 0.06, yearsToMaturity: 2, frequency: 1 }, 0.06)).toBeCloseTo(1.943396, 5);
  });

  it('modified duration is Macaulay divided by (1 + periodic yield)', () => {
    expect(modifiedDuration(bond, 0.1)).toBeCloseTo(6.514637, 5);
  });

  it('modified duration approximates the price sensitivity to yield', () => {
    const y = 0.1;
    const h = 1e-5;
    const p = bondPrice(bond, y);
    const fd = -(bondPrice(bond, y + h) - bondPrice(bond, y - h)) / (2 * h) / p;
    expect(modifiedDuration(bond, y)).toBeCloseTo(fd, 5);
  });

  it('convexity matches the second-order price sensitivity', () => {
    const y = 0.1;
    const h = 1e-5;
    const p = bondPrice(bond, y);
    const fd = (bondPrice(bond, y + h) - 2 * p + bondPrice(bond, y - h)) / (h * h) / p;
    expect(convexity(bond, y)).toBeCloseTo(fd, 3);
    expect(convexity(bond, y)).toBeCloseTo(56.485, 2);
  });

  it('duration-plus-convexity estimates a finite yield move well', () => {
    const y = 0.1;
    const dy = 0.01;
    const p0 = bondPrice(bond, y);
    const actual = (bondPrice(bond, y + dy) - p0) / p0;
    const md = modifiedDuration(bond, y);
    const cx = convexity(bond, y);
    const estimate = -md * dy + 0.5 * cx * dy * dy;
    // The second-order estimate should be within ~10 bp of the true move; the
    // residual is the (positive) third-order term omitted by the expansion.
    expect(estimate).toBeCloseTo(actual, 3);
  });
});

describe('accruedInterest', () => {
  it('is half the coupon three months into a semi-annual period (30/360)', () => {
    expect(
      accruedInterest({
        couponRate: 0.08,
        lastCoupon: new Date('2024-01-01'),
        settlement: new Date('2024-04-01'),
        nextCoupon: new Date('2024-07-01'),
      }),
    ).toBeCloseTo(2, 9);
  });

  it('is zero on the coupon date and the full coupon just before the next', () => {
    const base = {
      couponRate: 0.08,
      lastCoupon: new Date('2024-01-01'),
      nextCoupon: new Date('2024-07-01'),
    };
    expect(accruedInterest({ ...base, settlement: new Date('2024-01-01') })).toBeCloseTo(0, 9);
    expect(accruedInterest({ ...base, settlement: new Date('2024-07-01') })).toBeCloseTo(4, 9);
  });

  it('respects the day-count convention', () => {
    const base = {
      couponRate: 0.05,
      frequency: 2,
      lastCoupon: new Date('2024-01-01'),
      settlement: new Date('2024-03-01'),
      nextCoupon: new Date('2024-07-01'),
    } as const;
    const thirty = accruedInterest({ ...base, convention: '30/360' });
    const actual = accruedInterest({ ...base, convention: 'ACT/365' });
    // 30/360 sees 60 days of 180; ACT sees 60 of 182 — slightly less.
    expect(thirty).toBeGreaterThan(actual);
  });

  it('throws when the coupon period is not positive', () => {
    expect(() =>
      accruedInterest({
        couponRate: 0.08,
        lastCoupon: new Date('2024-07-01'),
        settlement: new Date('2024-04-01'),
        nextCoupon: new Date('2024-01-01'),
      }),
    ).toThrow(RangeError);
  });
});
