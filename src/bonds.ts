import { assertFinite, assertPositiveInt } from './internal';
import { yearFraction, type DayCountConvention } from './daycount';

/**
 * A fixed-coupon bond, priced on a coupon date (no accrued interest). Maturity
 * is expressed in years; with `frequency` coupons per year the bond has
 * `round(yearsToMaturity * frequency)` whole periods remaining.
 */
export interface Bond {
  /** Redemption (face/par) value. Default `100`. */
  readonly faceValue?: number;
  /** Annual coupon rate as a decimal (e.g. `0.08` for an 8% coupon). */
  readonly couponRate: number;
  /** Years until maturity. */
  readonly yearsToMaturity: number;
  /** Coupons per year (1 annual, 2 semi-annual, 4 quarterly). Default `2`. */
  readonly frequency?: number;
}

interface ResolvedBond {
  readonly face: number;
  readonly periods: number;
  readonly couponPerPeriod: number;
  readonly m: number;
}

function resolve(bond: Bond): ResolvedBond {
  const face = bond.faceValue ?? 100;
  const m = bond.frequency ?? 2;
  assertFinite(bond.couponRate, 'couponRate');
  assertFinite(bond.yearsToMaturity, 'yearsToMaturity');
  assertFinite(face, 'faceValue');
  assertPositiveInt(m, 'frequency');
  const periods = Math.round(bond.yearsToMaturity * m);
  assertPositiveInt(periods, 'yearsToMaturity * frequency');
  return { face, periods, couponPerPeriod: (bond.couponRate * face) / m, m };
}

/**
 * The present value (clean price, on a coupon date) of a bond at a given annual
 * yield. `annualYield` is a nominal rate compounded `frequency` times per year,
 * the same convention markets quote. The result is in the same units as
 * `faceValue` (so per 100 of par, if `faceValue` is 100).
 *
 * @example
 * // 8% semi-annual coupon, 10 years, priced to yield 10%:
 * bondPrice({ couponRate: 0.08, yearsToMaturity: 10 }, 0.10); // ≈ 87.5378
 *
 * // A bond priced at its coupon rate trades at par:
 * bondPrice({ couponRate: 0.06, yearsToMaturity: 2, frequency: 1 }, 0.06); // 100
 */
export function bondPrice(bond: Bond, annualYield: number): number {
  assertFinite(annualYield, 'annualYield');
  const { face, periods, couponPerPeriod, m } = resolve(bond);
  const i = annualYield / m;
  if (i <= -1) {
    throw new RangeError('finlytic: "annualYield" implies a per-period rate at or below -100%');
  }
  if (i === 0) {
    return couponPerPeriod * periods + face;
  }
  const discount = Math.pow(1 + i, -periods);
  const couponsPV = couponPerPeriod * ((1 - discount) / i);
  return couponsPV + face * discount;
}

/** Options for {@link yieldToMaturity}. */
export interface YieldOptions {
  /** Starting guess for the annual yield. Default: the coupon rate. */
  readonly guess?: number;
}

/**
 * The yield to maturity: the annual (nominal, `frequency`-compounded) yield for
 * which {@link bondPrice} equals `price`. Solved with Newton-Raphson, falling
 * back to bisection.
 *
 * @throws {RangeError} if the solver does not converge.
 *
 * @example
 * yieldToMaturity({ couponRate: 0.08, yearsToMaturity: 10 }, 87.5378); // ≈ 0.10
 */
export function yieldToMaturity(bond: Bond, price: number, opts: YieldOptions = {}): number {
  assertFinite(price, 'price');
  if (price <= 0) {
    throw new RangeError('finlytic: "price" must be positive');
  }
  const { couponRate } = bond;
  const guess = opts.guess ?? (couponRate || 0.05);
  assertFinite(guess, 'guess');

  const EPS = 1e-10;
  const MAX_ITER = 128;
  const f = (y: number): number => bondPrice(bond, y) - price;

  // Newton-Raphson with a numerical derivative.
  let y = guess;
  for (let i = 0; i < MAX_ITER; i++) {
    const fy = f(y);
    if (Math.abs(fy) < EPS) return y;
    const h = 1e-6;
    const dfy = (f(y + h) - f(y - h)) / (2 * h);
    if (dfy === 0) break;
    const next = y - fy / dfy;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - y) < EPS) return next;
    y = next;
  }

  // Bisection fallback over a wide yield bracket.
  let lo = -0.9999;
  let hi = 10;
  let flo = f(lo);
  let fhi = f(hi);
  if (flo * fhi <= 0) {
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2;
      const fmid = f(mid);
      if (Math.abs(fmid) < EPS || (hi - lo) / 2 < EPS) return mid;
      if (flo * fmid < 0) {
        hi = mid;
        fhi = fmid;
      } else {
        lo = mid;
        flo = fmid;
      }
    }
    return (lo + hi) / 2;
  }

  throw new RangeError('finlytic: "yieldToMaturity" did not converge — try a different "guess"');
}

/**
 * Macaulay duration in years: the cash-flow-weighted average time to receive
 * the bond's payments, each weighted by its present value.
 *
 * @example
 * macaulayDuration({ couponRate: 0.06, yearsToMaturity: 2, frequency: 1 }, 0.06); // ≈ 1.9434
 */
export function macaulayDuration(bond: Bond, annualYield: number): number {
  assertFinite(annualYield, 'annualYield');
  const { face, periods, couponPerPeriod, m } = resolve(bond);
  const i = annualYield / m;
  if (i <= -1) {
    throw new RangeError('finlytic: "annualYield" implies a per-period rate at or below -100%');
  }

  let weightedPeriods = 0;
  let price = 0;
  for (let t = 1; t <= periods; t++) {
    const cf = t === periods ? couponPerPeriod + face : couponPerPeriod;
    const pv = cf / Math.pow(1 + i, t);
    price += pv;
    weightedPeriods += t * pv;
  }
  // Convert the weighted average from periods to years.
  return weightedPeriods / price / m;
}

/**
 * Modified duration in years: the approximate percentage change in price for a
 * one-unit (100%) change in yield, equal to Macaulay duration divided by
 * `(1 + yield / frequency)`. For a 1 basis-point move, scale by 0.0001.
 *
 * @example
 * modifiedDuration({ couponRate: 0.08, yearsToMaturity: 10 }, 0.10); // ≈ 6.5146
 */
export function modifiedDuration(bond: Bond, annualYield: number): number {
  const m = bond.frequency ?? 2;
  const i = annualYield / m;
  return macaulayDuration(bond, annualYield) / (1 + i);
}

/**
 * Convexity in years²: the second-order sensitivity of price to yield. Together
 * with modified duration it gives a closer estimate of the price change for a
 * yield move Δy: ΔP/P ≈ −modifiedDuration·Δy + ½·convexity·Δy².
 *
 * @example
 * convexity({ couponRate: 0.08, yearsToMaturity: 10 }, 0.10); // ≈ 56.49
 */
export function convexity(bond: Bond, annualYield: number): number {
  assertFinite(annualYield, 'annualYield');
  const { face, periods, couponPerPeriod, m } = resolve(bond);
  const i = annualYield / m;
  if (i <= -1) {
    throw new RangeError('finlytic: "annualYield" implies a per-period rate at or below -100%');
  }

  let weighted = 0;
  let price = 0;
  for (let t = 1; t <= periods; t++) {
    const cf = t === periods ? couponPerPeriod + face : couponPerPeriod;
    const pv = cf / Math.pow(1 + i, t);
    price += pv;
    weighted += cf * t * (t + 1) / Math.pow(1 + i, t + 2);
  }
  // Annualise: divide the period-based measure by frequency².
  return weighted / price / (m * m);
}

/** Inputs for {@link accruedInterest}. */
export interface AccruedInterestParams {
  /** Redemption (face/par) value. Default `100`. */
  readonly faceValue?: number;
  /** Annual coupon rate as a decimal. */
  readonly couponRate: number;
  /** Coupons per year. Default `2`. */
  readonly frequency?: number;
  /** The most recent coupon date on or before settlement. */
  readonly lastCoupon: Date;
  /** The settlement date interest is accrued to. */
  readonly settlement: Date;
  /** The next coupon date after settlement. */
  readonly nextCoupon: Date;
  /** Day-count convention. Default `'30/360'`. */
  readonly convention?: DayCountConvention;
}

/**
 * Interest accrued on a bond between its last coupon and a settlement date — the
 * difference between the dirty (invoice) price and the clean price. Computed as
 * the period's coupon scaled by the fraction of the coupon period that has
 * elapsed, under the chosen day-count convention.
 *
 * @example
 * // Three months into a semi-annual 8% period, on 30/360: half the coupon.
 * accruedInterest({
 *   couponRate: 0.08,
 *   lastCoupon: new Date('2024-01-01'),
 *   settlement: new Date('2024-04-01'),
 *   nextCoupon: new Date('2024-07-01'),
 * }); // 2
 */
export function accruedInterest(params: AccruedInterestParams): number {
  const face = params.faceValue ?? 100;
  const m = params.frequency ?? 2;
  assertFinite(params.couponRate, 'couponRate');
  assertPositiveInt(m, 'frequency');

  const convention = params.convention ?? '30/360';
  const periodFraction = yearFraction(params.lastCoupon, params.settlement, convention);
  const fullPeriod = yearFraction(params.lastCoupon, params.nextCoupon, convention);
  if (fullPeriod <= 0) {
    throw new RangeError('finlytic: "nextCoupon" must be after "lastCoupon"');
  }

  const couponPerPeriod = (params.couponRate * face) / m;
  return couponPerPeriod * (periodFraction / fullPeriod);
}
