import { describe, it, expect } from 'vitest';
import { pmt } from './annuity';
import { ipmt, ppmt, cumipmt, cumprinc } from './payment';

const r = 0.06 / 12;
const n = 360;
const P = 200000;

describe('ipmt / ppmt', () => {
  it("first period's interest is the balance times the rate", () => {
    // Excel: =IPMT(0.06/12, 1, 360, 200000) -> -1000
    expect(ipmt(r, 1, n, P)).toBeCloseTo(-1000, 8);
  });

  it('interest + principal equals the constant payment in every period', () => {
    const payment = pmt(r, n, P);
    for (let per = 1; per <= n; per++) {
      expect(ipmt(r, per, n, P) + ppmt(r, per, n, P)).toBeCloseTo(payment, 8);
    }
  });

  it('interest shrinks and principal grows over the life of the loan', () => {
    expect(ipmt(r, 1, n, P)).toBeLessThan(ipmt(r, n, n, P)); // more negative early
    expect(Math.abs(ppmt(r, 1, n, P))).toBeLessThan(Math.abs(ppmt(r, n, n, P)));
  });

  it('rejects an out-of-range period', () => {
    expect(() => ipmt(r, 0, n, P)).toThrow(RangeError);
    expect(() => ipmt(r, n + 1, n, P)).toThrow(RangeError);
  });
});

describe('cumipmt / cumprinc', () => {
  it('total principal repaid over the whole term equals the amount borrowed', () => {
    expect(cumprinc(r, n, P, 1, n)).toBeCloseTo(-P, 4);
  });

  it('cumulative split matches the sum of all payments', () => {
    const payment = pmt(r, n, P);
    const totalInterest = cumipmt(r, n, P, 1, n);
    const totalPrincipal = cumprinc(r, n, P, 1, n);
    expect(totalInterest + totalPrincipal).toBeCloseTo(payment * n, 4);
  });

  it('a span equals the sum of its single periods', () => {
    const span = cumipmt(r, n, P, 1, 12);
    let manual = 0;
    for (let per = 1; per <= 12; per++) manual += ipmt(r, per, n, P);
    expect(span).toBeCloseTo(manual, 10);
  });

  it('rejects an invalid span', () => {
    expect(() => cumipmt(r, n, P, 12, 1)).toThrow(RangeError);
  });
});
