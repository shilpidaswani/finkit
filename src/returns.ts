import { assertFinite } from './internal';

/**
 * Modified internal rate of return (Excel `MIRR`). Unlike {@link irr}, MIRR
 * discounts outflows at a `financeRate` and compounds reinvested inflows at a
 * separate `reinvestRate`, which removes IRR's unrealistic assumption that every
 * interim cash flow earns the IRR itself — and always has a single answer.
 *
 * `cashflows[0]` is at time 0; the series needs at least one inflow and one
 * outflow.
 *
 * @example
 * mirr([-120000, 39000, 30000, 21000, 37000, 46000], 0.10, 0.12); // ≈ 0.1261
 */
export function mirr(
  cashflows: readonly number[],
  financeRate: number,
  reinvestRate: number,
): number {
  assertFinite(financeRate, 'financeRate');
  assertFinite(reinvestRate, 'reinvestRate');
  if (cashflows.length < 2) {
    throw new RangeError('finkit: "cashflows" must have at least two entries');
  }
  if (financeRate <= -1 || reinvestRate <= -1) {
    throw new RangeError('finkit: rates must be greater than -1');
  }

  const n = cashflows.length - 1;
  let pvOutflows = 0;
  let fvInflows = 0;
  let hasPos = false;
  let hasNeg = false;
  for (let i = 0; i < cashflows.length; i++) {
    const cf = cashflows[i] as number;
    assertFinite(cf, `cashflows[${i}]`);
    if (cf < 0) {
      pvOutflows += cf / Math.pow(1 + financeRate, i);
      hasNeg = true;
    } else if (cf > 0) {
      fvInflows += cf * Math.pow(1 + reinvestRate, n - i);
      hasPos = true;
    }
  }
  if (!hasPos || !hasNeg) {
    throw new RangeError('finkit: "cashflows" must contain at least one positive and one negative value');
  }

  return Math.pow(-fvInflows / pvOutflows, 1 / n) - 1;
}

/**
 * Compound annual growth rate: the constant yearly rate that takes `beginValue`
 * to `endValue` over `years`. `years` may be fractional, and the values must be
 * positive.
 *
 * @example
 * cagr(1000, 2000, 10); // ≈ 0.0718 (7.18% a year doubles in 10 years)
 */
export function cagr(beginValue: number, endValue: number, years: number): number {
  assertFinite(beginValue, 'beginValue');
  assertFinite(endValue, 'endValue');
  assertFinite(years, 'years');
  if (beginValue <= 0 || endValue <= 0) {
    throw new RangeError('finkit: "beginValue" and "endValue" must be positive');
  }
  if (years <= 0) {
    throw new RangeError('finkit: "years" must be positive');
  }
  return Math.pow(endValue / beginValue, 1 / years) - 1;
}

/** One sub-period of a {@link twr} calculation. */
export interface ValuationPeriod {
  /** Portfolio value at the start of the sub-period. */
  readonly startValue: number;
  /** Portfolio value at the end of the sub-period. */
  readonly endValue: number;
  /** Net external cash flow (deposit positive, withdrawal negative). Default `0`. */
  readonly flow?: number;
  /** Whether the flow lands at the `'start'` (default) or `'end'` of the period. */
  readonly flowTiming?: 'start' | 'end';
}

/**
 * Time-weighted return: the compounded return of the sub-period returns, with
 * the distorting effect of external cash flows removed. This is the return a
 * manager is measured on, because it does not reward or penalise the timing of
 * deposits and withdrawals the manager did not control.
 *
 * Each period's return neutralises its flow by timing: a start-of-period flow is
 * added to the capital at risk, an end-of-period flow is backed out of the
 * ending value. The periods are then linked geometrically.
 *
 * @example
 * // +10% on 100, then a 50 deposit, then the 160 base grows to 200:
 * twr([
 *   { startValue: 100, endValue: 110 },
 *   { startValue: 110, endValue: 200, flow: 50, flowTiming: 'start' },
 * ]); // ≈ 0.375 (37.5%)
 */
export function twr(periods: readonly ValuationPeriod[]): number {
  if (periods.length === 0) {
    throw new RangeError('finkit: "periods" must not be empty');
  }

  let product = 1;
  for (let k = 0; k < periods.length; k++) {
    const { startValue, endValue, flow = 0, flowTiming = 'start' } = periods[k] as ValuationPeriod;
    assertFinite(startValue, `periods[${k}].startValue`);
    assertFinite(endValue, `periods[${k}].endValue`);
    assertFinite(flow, `periods[${k}].flow`);

    let growth: number;
    if (flowTiming === 'start') {
      const base = startValue + flow;
      if (base === 0) {
        throw new RangeError(`finkit: periods[${k}] has zero capital at risk`);
      }
      growth = endValue / base;
    } else {
      if (startValue === 0) {
        throw new RangeError(`finkit: periods[${k}] has zero starting value`);
      }
      growth = (endValue - flow) / startValue;
    }
    product *= growth;
  }
  return product - 1;
}
