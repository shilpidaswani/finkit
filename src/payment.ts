import { assertFinite, dueFactor, type TvmOptions } from './internal';
import { pmt, fv } from './annuity';

function assertPeriodInRange(per: number, nper: number): void {
  if (!Number.isInteger(per) || per < 1 || per > nper) {
    throw new RangeError(`finkit: "per" must be an integer in 1..${nper}, received ${per}`);
  }
}

/**
 * The interest portion of the payment made in period `per` of a loan or annuity.
 * `ipmt(...) + ppmt(...)` always equals the constant `pmt(...)`.
 *
 * @example
 * // Interest in the first monthly payment of a 200,000 loan at 6% for 30y:
 * ipmt(0.06 / 12, 1, 360, 200000); // ≈ -1000.00
 */
export function ipmt(
  rate: number,
  per: number,
  nper: number,
  pv: number,
  opts: TvmOptions = {},
): number {
  assertFinite(rate, 'rate');
  assertFinite(nper, 'nper');
  assertFinite(pv, 'pv');
  assertPeriodInRange(per, nper);
  const type = dueFactor(opts.due);
  const payment = pmt(rate, nper, pv, opts);

  let balance: number;
  if (per === 1) {
    balance = type === 1 ? 0 : -pv;
  } else if (type === 1) {
    balance = fv(rate, per - 2, payment, { pv, due: 'begin' }) - payment;
  } else {
    balance = fv(rate, per - 1, payment, { pv });
  }
  return balance * rate;
}

/**
 * The principal portion of the payment made in period `per`.
 * `ipmt(...) + ppmt(...)` always equals the constant `pmt(...)`.
 */
export function ppmt(
  rate: number,
  per: number,
  nper: number,
  pv: number,
  opts: TvmOptions = {},
): number {
  return pmt(rate, nper, pv, opts) - ipmt(rate, per, nper, pv, opts);
}

function assertSpan(start: number, end: number, nper: number): void {
  assertPeriodInRange(start, nper);
  assertPeriodInRange(end, nper);
  if (end < start) {
    throw new RangeError(`finkit: "end" (${end}) must be >= "start" (${start})`);
  }
}

/** Total interest paid between periods `start` and `end` (inclusive). */
export function cumipmt(
  rate: number,
  nper: number,
  pv: number,
  start: number,
  end: number,
  opts: TvmOptions = {},
): number {
  assertSpan(start, end, nper);
  let total = 0;
  for (let per = start; per <= end; per++) {
    total += ipmt(rate, per, nper, pv, opts);
  }
  return total;
}

/** Total principal repaid between periods `start` and `end` (inclusive). */
export function cumprinc(
  rate: number,
  nper: number,
  pv: number,
  start: number,
  end: number,
  opts: TvmOptions = {},
): number {
  assertSpan(start, end, nper);
  let total = 0;
  for (let per = start; per <= end; per++) {
    total += ppmt(rate, per, nper, pv, opts);
  }
  return total;
}
