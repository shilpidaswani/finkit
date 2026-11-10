import { describe, it, expect } from 'vitest';

import { sln, syd, ddb, db } from './depreciation';

describe('sln', () => {
  it('spreads the depreciable value evenly', () => {
    expect(sln(30000, 7500, 10)).toBe(2250);
  });

  it('summed over the life equals cost minus salvage', () => {
    const total = sln(30000, 7500, 10) * 10;
    expect(total).toBeCloseTo(30000 - 7500, 9);
  });

  it('throws on a non-positive life', () => {
    expect(() => sln(30000, 7500, 0)).toThrow(RangeError);
  });
});

describe('syd', () => {
  it('charges the most in the first period and the least in the last', () => {
    expect(syd(30000, 7500, 10, 1)).toBeCloseTo(4090.9091, 4);
    expect(syd(30000, 7500, 10, 10)).toBeCloseTo(409.0909, 4);
  });

  it('summed over the life equals cost minus salvage', () => {
    let total = 0;
    for (let p = 1; p <= 10; p++) total += syd(30000, 7500, 10, p);
    expect(total).toBeCloseTo(22500, 6);
  });

  it('throws when the period exceeds the life', () => {
    expect(() => syd(30000, 7500, 10, 11)).toThrow(RangeError);
  });
});

describe('ddb', () => {
  it('matches the spreadsheet double-declining schedule', () => {
    expect(ddb(2400, 300, 10, 1)).toBeCloseTo(480, 9);
    expect(ddb(2400, 300, 10, 2)).toBeCloseTo(384, 9);
    expect(ddb(2400, 300, 10, 3)).toBeCloseTo(307.2, 9);
  });

  it('never depreciates the book value below salvage', () => {
    let accumulated = 0;
    for (let p = 1; p <= 10; p++) accumulated += ddb(2400, 300, 10, p);
    expect(accumulated).toBeLessThanOrEqual(2400 - 300 + 1e-9);
    expect(2400 - accumulated).toBeGreaterThanOrEqual(300 - 1e-9);
  });

  it('honours a custom factor (150% declining balance)', () => {
    // rate = 1.5/10 = 0.15; first period = 2400 * 0.15 = 360.
    expect(ddb(2400, 300, 10, 1, 1.5)).toBeCloseTo(360, 9);
  });
});

describe('db', () => {
  it('matches the spreadsheet fixed-declining schedule with a partial first year', () => {
    expect(db(1000000, 100000, 6, 1, 7)).toBeCloseTo(186083.33, 2);
    expect(db(1000000, 100000, 6, 2, 7)).toBeCloseTo(259639.42, 2);
  });

  it('allows a final (life + 1) period when the first year is partial', () => {
    // month < 12 spreads depreciation across seven periods for a six-year life.
    expect(() => db(1000000, 100000, 6, 7, 7)).not.toThrow();
    expect(() => db(1000000, 100000, 6, 8, 7)).toThrow(RangeError);
  });

  it('throws on an out-of-range month', () => {
    expect(() => db(1000000, 100000, 6, 1, 13)).toThrow(RangeError);
  });
});
