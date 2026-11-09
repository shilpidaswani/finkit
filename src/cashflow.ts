import { assertFinite } from './internal';

/**
 * Net present value of a series of cash flows, discounted at `rate` per period.
 *
 * Following the spreadsheet `NPV` convention, the first cash flow is discounted
 * by one full period (i.e. it occurs at the end of period 1). For an investment
 * whose initial outlay happens today, add that outlay separately:
 * `initial + npv(rate, futureFlows)`.
 *
 * @example
 * // flows[0] is discounted by (1+rate)^1, flows[1] by (1+rate)^2, and so on.
 * npv(0.08, [100, 200, 300]); // ≈ 502.21
 */
export function npv(rate: number, cashflows: readonly number[]): number {
  assertFinite(rate, 'rate');
  if (cashflows.length === 0) {
    throw new RangeError('finkit: "cashflows" must not be empty');
  }
  let total = 0;
  for (let i = 0; i < cashflows.length; i++) {
    const cf = cashflows[i] as number;
    assertFinite(cf, `cashflows[${i}]`);
    total += cf / Math.pow(1 + rate, i + 1);
  }
  return total;
}

/** Options for {@link irr}. */
export interface IrrOptions {
  /** Starting guess for the iterative solver. Default `0.1`. */
  readonly guess?: number;
}

/**
 * Internal rate of return of a series of cash flows: the per-period rate for
 * which the net present value is zero. The first cash flow (`cashflows[0]`) is
 * taken to occur at time 0, so a typical series starts with a negative outlay.
 *
 * Uses Newton's method.
 *
 * @throws {RangeError} if the series lacks both a positive and a negative flow,
 * or if the solver does not converge.
 *
 * @example
 * irr([-1000, 300, 420, 680]); // ≈ 0.1489 (14.89% per period)
 */
export function irr(cashflows: readonly number[], opts: IrrOptions = {}): number {
  if (cashflows.length < 2) {
    throw new RangeError('finkit: "cashflows" must have at least two entries');
  }
  let hasPos = false;
  let hasNeg = false;
  for (let i = 0; i < cashflows.length; i++) {
    const cf = cashflows[i] as number;
    assertFinite(cf, `cashflows[${i}]`);
    if (cf > 0) hasPos = true;
    if (cf < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) {
    throw new RangeError('finkit: "cashflows" must contain at least one positive and one negative value');
  }

  const guess = opts.guess ?? 0.1;
  assertFinite(guess, 'guess');

  const EPS = 1e-10;
  const MAX_ITER = 100;

  // Net present value with cashflows[0] at time 0, and its first derivative.
  const value = (r: number): number => {
    let sum = 0;
    for (let i = 0; i < cashflows.length; i++) {
      sum += (cashflows[i] as number) / Math.pow(1 + r, i);
    }
    return sum;
  };
  const derivative = (r: number): number => {
    let sum = 0;
    for (let i = 1; i < cashflows.length; i++) {
      sum -= (i * (cashflows[i] as number)) / Math.pow(1 + r, i + 1);
    }
    return sum;
  };

  let r = guess;
  for (let i = 0; i < MAX_ITER; i++) {
    const y = value(r);
    if (Math.abs(y) < EPS) {
      return r;
    }
    const dy = derivative(r);
    if (dy === 0) {
      break;
    }
    const next = r - y / dy;
    if (!Number.isFinite(next) || next <= -1) {
      break;
    }
    if (Math.abs(next - r) < EPS) {
      return next;
    }
    r = next;
  }

  throw new RangeError('finkit: "irr" did not converge — try a different "guess"');
}
