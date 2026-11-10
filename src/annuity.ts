import {
  assertFinite,
  dueFactor,
  type PaymentDue,
  type TvmOptions,
} from './internal';

/**
 * finlytic uses the standard cash-flow sign convention (the same as a financial
 * calculator or a spreadsheet): money you **receive** is positive and money you
 * **pay out** is negative. So the payment on a loan you took out is negative,
 * and the present value of money you borrowed is positive.
 */

/** Options for {@link fv}. */
export interface FvOptions {
  /** Present value (a lump sum today). Default `0`. */
  readonly pv?: number;
  /** When each payment occurs. Default `'end'`. */
  readonly due?: PaymentDue;
}

/**
 * Future value of a series of equal periodic payments plus an optional present
 * lump sum, earning a fixed `rate` per period.
 *
 * @param rate - interest rate per period (e.g. `0.05/12` for 5% annual, monthly)
 * @param nper - total number of periods
 * @param pmt - payment made each period (constant)
 *
 * @example
 * // Save 200/month for 10 years at 6% annual, compounded monthly:
 * fv(0.06 / 12, 120, -200); // ≈ 32776.89
 */
export function fv(rate: number, nper: number, pmt: number, opts: FvOptions = {}): number {
  assertFinite(rate, 'rate');
  assertFinite(nper, 'nper');
  assertFinite(pmt, 'pmt');
  const pv = opts.pv ?? 0;
  assertFinite(pv, 'pv');
  const type = dueFactor(opts.due);
  if (rate === 0) {
    return -(pv + pmt * nper);
  }
  const growth = Math.pow(1 + rate, nper);
  return -(pv * growth + (pmt * (1 + rate * type) * (growth - 1)) / rate);
}

/**
 * Present value of a series of equal periodic payments plus an optional future
 * lump sum, discounted at a fixed `rate` per period.
 *
 * @example
 * // What is a 500/month, 20-year payment stream worth today at 4% annual?
 * pv(0.04 / 12, 240, -500); // ≈ 82508.47
 */
export function pv(rate: number, nper: number, pmt: number, opts: TvmOptions = {}): number {
  assertFinite(rate, 'rate');
  assertFinite(nper, 'nper');
  assertFinite(pmt, 'pmt');
  const fvVal = opts.fv ?? 0;
  assertFinite(fvVal, 'fv');
  const type = dueFactor(opts.due);
  if (rate === 0) {
    return -(fvVal + pmt * nper);
  }
  const growth = Math.pow(1 + rate, nper);
  return -(fvVal + (pmt * (1 + rate * type) * (growth - 1)) / rate) / growth;
}

/**
 * The constant payment per period required to pay off (or build up to) a value,
 * given a fixed `rate` per period.
 *
 * @param pv - present value: the amount borrowed (positive) or invested (negative)
 *
 * @example
 * // Monthly payment on a 200,000 loan at 6% annual for 30 years:
 * pmt(0.06 / 12, 360, 200000); // ≈ -1199.10
 */
export function pmt(rate: number, nper: number, pv: number, opts: TvmOptions = {}): number {
  assertFinite(rate, 'rate');
  assertFinite(nper, 'nper');
  assertFinite(pv, 'pv');
  const fvVal = opts.fv ?? 0;
  assertFinite(fvVal, 'fv');
  const type = dueFactor(opts.due);
  if (rate === 0) {
    return -(pv + fvVal) / nper;
  }
  const growth = Math.pow(1 + rate, nper);
  return (-(pv * growth + fvVal) * rate) / ((1 + rate * type) * (growth - 1));
}

/**
 * The number of periods needed to pay off (or build up to) a value, given a
 * fixed `rate` and constant `pmt` per period. May be fractional.
 *
 * @example
 * // How many monthly 1200 payments retire a 200,000 loan at 6% annual?
 * nper(0.06 / 12, -1200, 200000); // ≈ 358.93
 */
export function nper(rate: number, pmt: number, pv: number, opts: TvmOptions = {}): number {
  assertFinite(rate, 'rate');
  assertFinite(pmt, 'pmt');
  assertFinite(pv, 'pv');
  const fvVal = opts.fv ?? 0;
  assertFinite(fvVal, 'fv');
  const type = dueFactor(opts.due);
  if (rate === 0) {
    if (pmt === 0) {
      throw new RangeError('finlytic: "pmt" cannot be 0 when "rate" is 0');
    }
    return -(pv + fvVal) / pmt;
  }
  const z = (pmt * (1 + rate * type)) / rate;
  return Math.log((z - fvVal) / (z + pv)) / Math.log(1 + rate);
}

/** Options for {@link rate}. */
export interface RateOptions extends TvmOptions {
  /** Starting guess for the iterative solver. Default `0.1`. */
  readonly guess?: number;
}

/**
 * The interest rate per period, solved iteratively from the other annuity terms.
 * Uses the secant method (the same approach as spreadsheet `RATE`).
 *
 * @throws {RangeError} if the solver does not converge.
 *
 * @example
 * // A 200,000 loan repaid with 360 monthly payments of 1199.10 implies:
 * rate(360, -1199.10, 200000) * 12; // ≈ 0.06 (6% annual)
 */
export function rate(nper: number, pmt: number, pv: number, opts: RateOptions = {}): number {
  assertFinite(nper, 'nper');
  assertFinite(pmt, 'pmt');
  assertFinite(pv, 'pv');
  const fvVal = opts.fv ?? 0;
  assertFinite(fvVal, 'fv');
  const type = dueFactor(opts.due);
  const guess = opts.guess ?? 0.1;
  assertFinite(guess, 'guess');

  const EPS = 1e-10;
  const MAX_ITER = 128;

  const f = (r: number): number => {
    if (Math.abs(r) < EPS) {
      return pv * (1 + nper * r) + pmt * (1 + r * type) * nper + fvVal;
    }
    const growth = Math.pow(1 + r, nper);
    return pv * growth + pmt * (1 / r + type) * (growth - 1) + fvVal;
  };

  let x0 = 0;
  let x1 = guess;
  let y0 = f(x0);
  let y1 = f(x1);
  let r = guess;

  for (let i = 0; i < MAX_ITER && Math.abs(y1 - y0) > EPS; i++) {
    r = (y1 * x0 - y0 * x1) / (y1 - y0);
    x0 = x1;
    x1 = r;
    y0 = y1;
    y1 = f(r);
    if (Math.abs(y1) < EPS) {
      return r;
    }
  }

  if (!Number.isFinite(r) || Math.abs(f(r)) > 1e-6) {
    throw new RangeError('finlytic: "rate" did not converge — try a different "guess"');
  }
  return r;
}
