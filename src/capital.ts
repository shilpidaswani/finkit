import { assertFinite } from './internal';

/**
 * Capital-budgeting measures work on a project's cash-flow series where
 * `cashflows[0]` occurs at time 0 (typically the negative initial outlay) and
 * each later flow is one period apart — the same convention as {@link irr} and
 * {@link mirr}.
 */
function assertSeries(cashflows: readonly number[]): void {
  if (cashflows.length < 2) {
    throw new RangeError('finlytic: "cashflows" must have at least two entries');
  }
  for (let i = 0; i < cashflows.length; i++) {
    assertFinite(cashflows[i] as number, `cashflows[${i}]`);
  }
}

function assertRate(rate: number): void {
  assertFinite(rate, 'rate');
  if (rate <= -1) {
    throw new RangeError('finlytic: "rate" must be greater than -1');
  }
}

/**
 * Payback period: the time, in periods, to recover the initial investment from
 * undiscounted cash flows. `cashflows[0]` is the time-0 outlay (usually
 * negative). The result is fractional — it interpolates linearly within the
 * period in which cumulative cash flow first reaches zero. Returns `Infinity`
 * if the investment is never recovered.
 *
 * @example
 * paybackPeriod([-1000, 300, 400, 400, 500]); // 2.75
 */
export function paybackPeriod(cashflows: readonly number[]): number {
  assertSeries(cashflows);
  let cumulative = cashflows[0] as number;
  if (cumulative >= 0) return 0;
  for (let t = 1; t < cashflows.length; t++) {
    const flow = cashflows[t] as number;
    const next = cumulative + flow;
    if (next >= 0) {
      const fraction = flow === 0 ? 0 : -cumulative / flow;
      return t - 1 + fraction;
    }
    cumulative = next;
  }
  return Infinity;
}

/**
 * Discounted payback period: like {@link paybackPeriod}, but each flow is first
 * discounted to present value at `rate` per period before recovering the
 * outlay. Always at least as long as the undiscounted payback. Returns
 * `Infinity` if the discounted flows never recover the investment.
 *
 * @example
 * discountedPaybackPeriod(0.1, [-1000, 500, 400, 300, 200]); // ≈ 2.95
 */
export function discountedPaybackPeriod(rate: number, cashflows: readonly number[]): number {
  assertRate(rate);
  assertSeries(cashflows);
  let cumulative = cashflows[0] as number; // time 0, undiscounted
  if (cumulative >= 0) return 0;
  for (let t = 1; t < cashflows.length; t++) {
    const pv = (cashflows[t] as number) / Math.pow(1 + rate, t);
    const next = cumulative + pv;
    if (next >= 0) {
      const fraction = pv === 0 ? 0 : -cumulative / pv;
      return t - 1 + fraction;
    }
    cumulative = next;
  }
  return Infinity;
}

/**
 * Profitability index (PI, or benefit–cost ratio): the present value of the
 * future cash flows divided by the initial investment. PI > 1 corresponds to a
 * positive net present value and vice versa, so it ranks projects by value
 * created per unit invested. `cashflows[0]` must be a negative outlay.
 *
 * @example
 * profitabilityIndex(0.1, [-1000, 500, 400, 300, 100]); // ≈ 1.079
 */
export function profitabilityIndex(rate: number, cashflows: readonly number[]): number {
  assertRate(rate);
  assertSeries(cashflows);
  const initial = cashflows[0] as number;
  if (initial >= 0) {
    throw new RangeError('finlytic: "cashflows[0]" must be a negative initial outlay');
  }
  let pvFuture = 0;
  for (let t = 1; t < cashflows.length; t++) {
    pvFuture += (cashflows[t] as number) / Math.pow(1 + rate, t);
  }
  return pvFuture / -initial;
}
