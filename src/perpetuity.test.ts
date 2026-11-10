import { describe, it, expect } from 'vitest';

import {
  pvPerpetuity,
  pvGrowingPerpetuity,
  pvGrowingAnnuity,
  fvGrowingAnnuity,
} from './perpetuity';

describe('pvPerpetuity', () => {
  it('is payment divided by rate', () => {
    expect(pvPerpetuity(100, 0.05)).toBeCloseTo(2000, 9);
  });

  it('an annuity-due perpetuity is one payment larger', () => {
    expect(pvPerpetuity(100, 0.05, 'begin')).toBeCloseTo(2000 + 100, 9);
  });

  it('throws on a non-positive rate', () => {
    expect(() => pvPerpetuity(100, 0)).toThrow(RangeError);
  });
});

describe('pvGrowingPerpetuity', () => {
  it('is the Gordon growth value', () => {
    expect(pvGrowingPerpetuity(100, 0.08, 0.03)).toBeCloseTo(2000, 9);
  });

  it('is the limit of a growing annuity as the term grows', () => {
    const long = pvGrowingAnnuity(100, 0.08, 0.03, 2000);
    expect(pvGrowingPerpetuity(100, 0.08, 0.03)).toBeCloseTo(long, 4);
  });

  it('throws when growth is not below rate', () => {
    expect(() => pvGrowingPerpetuity(100, 0.03, 0.03)).toThrow(RangeError);
    expect(() => pvGrowingPerpetuity(100, 0.03, 0.05)).toThrow(RangeError);
  });
});

describe('pvGrowingAnnuity', () => {
  it('matches a direct discounting of the growing payments', () => {
    expect(pvGrowingAnnuity(100, 0.08, 0.03, 10)).toBeCloseTo(755.013369, 5);
  });

  it('handles the rate === growth limit', () => {
    // When rate equals growth, every discounted payment is payment/(1+rate).
    expect(pvGrowingAnnuity(100, 0.08, 0.08, 10)).toBeCloseTo((100 * 10) / 1.08, 6);
  });

  it('reduces to an ordinary annuity when growth is zero', () => {
    // pv of a level 100 for 5 periods at 6%: 100 * (1 - 1.06^-5) / 0.06.
    const level = (100 * (1 - Math.pow(1.06, -5))) / 0.06;
    expect(pvGrowingAnnuity(100, 0.06, 0, 5)).toBeCloseTo(level, 9);
  });
});

describe('fvGrowingAnnuity', () => {
  it('is the present value compounded to the end of the term', () => {
    const pv = pvGrowingAnnuity(100, 0.08, 0.03, 10);
    expect(fvGrowingAnnuity(100, 0.08, 0.03, 10)).toBeCloseTo(pv * Math.pow(1.08, 10), 5);
  });

  it('matches the closed-form value', () => {
    expect(fvGrowingAnnuity(100, 0.08, 0.03, 10)).toBeCloseTo(1630.017236, 5);
  });

  it('handles the rate === growth limit', () => {
    expect(fvGrowingAnnuity(100, 0.08, 0.08, 10)).toBeCloseTo(100 * 10 * Math.pow(1.08, 9), 6);
  });
});
