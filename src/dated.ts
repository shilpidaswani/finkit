import { assertFinite } from './internal';

/** A single cash flow that occurs on a specific calendar date. */
export interface DatedCashFlow {
  /** The amount: positive for money received, negative for money paid out. */
  readonly amount: number;
  /** The date the cash flow occurs. */
  readonly date: Date;
}

/** Options for {@link xirr}. */
export interface XirrOptions {
  /** Starting guess for the iterative solver. Default `0.1`. */
  readonly guess?: number;
}

const MS_PER_DAY = 86_400_000;

/** A date's calendar day as a UTC timestamp, so differences ignore time zones. */
function calendarUTC(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function normalize(flows: readonly DatedCashFlow[]): { amounts: number[]; years: number[] } {
  if (flows.length < 2) {
    throw new RangeError('finlytic: dated cash flows must have at least two entries');
  }

  const amounts: number[] = [];
  const days: number[] = [];
  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i] as DatedCashFlow;
    if (!(flow.date instanceof Date) || Number.isNaN(flow.date.getTime())) {
      throw new TypeError(`finlytic: cash flow ${i} has an invalid "date"`);
    }
    assertFinite(flow.amount, `cashflows[${i}].amount`);
    amounts.push(flow.amount);
    days.push(calendarUTC(flow.date));
  }

  // Excel discounts from the first date in the series using a fixed 365-day
  // year. Later flows get a positive exponent; an earlier flow (if the series
  // is not sorted) gets a negative one, exactly as Excel's XNPV does.
  const base = days[0] as number;
  const years = days.map((d) => (d - base) / MS_PER_DAY / 365);
  return { amounts, years };
}

/**
 * Net present value of cash flows that occur on arbitrary dates (Excel `XNPV`).
 *
 * Each flow is discounted by `(1 + rate)^(days / 365)`, where `days` is the
 * number of days from the earliest date in the series. `rate` is the annual
 * discount rate. Unlike {@link npv}, the dates need not be evenly spaced.
 *
 * @example
 * // One year later, a 10% annual rate exactly offsets a 10% gain:
 * xnpv(0.1, [
 *   { amount: -1000, date: new Date('2024-01-01') },
 *   { amount: 1100,  date: new Date('2024-12-31') }, // 365 days
 * ]); // ≈ 0
 */
export function xnpv(rate: number, cashflows: readonly DatedCashFlow[]): number {
  assertFinite(rate, 'rate');
  if (rate <= -1) {
    throw new RangeError('finlytic: "rate" must be greater than -1');
  }
  const { amounts, years } = normalize(cashflows);
  let total = 0;
  for (let i = 0; i < amounts.length; i++) {
    total += (amounts[i] as number) / Math.pow(1 + rate, years[i] as number);
  }
  return total;
}

/**
 * Internal rate of return for cash flows on arbitrary dates (Excel `XIRR`): the
 * annual rate for which {@link xnpv} is zero. The series must contain at least
 * one positive and one negative flow.
 *
 * Uses Newton-Raphson, falling back to bisection if a derivative step escapes
 * the valid range, so it converges even for irregular series.
 *
 * @throws {RangeError} if the series lacks both signs, or does not converge.
 *
 * @example
 * // A series that returns most of its capital within three months:
 * xirr([
 *   { amount: -10000, date: new Date('2008-01-01') },
 *   { amount: 3250,  date: new Date('2008-02-15') },
 *   { amount: 2750,  date: new Date('2008-03-01') },
 *   { amount: 2750,  date: new Date('2008-04-01') },
 *   { amount: 4250,  date: new Date('2008-10-30') },
 * ]); // ≈ 1.088 (a high annualised return)
 */
export function xirr(cashflows: readonly DatedCashFlow[], opts: XirrOptions = {}): number {
  const { amounts, years } = normalize(cashflows);

  let hasPos = false;
  let hasNeg = false;
  for (const a of amounts) {
    if (a > 0) hasPos = true;
    if (a < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) {
    throw new RangeError('finlytic: dated cash flows must contain at least one positive and one negative value');
  }

  const guess = opts.guess ?? 0.1;
  assertFinite(guess, 'guess');

  const EPS = 1e-9;
  const MAX_ITER = 128;

  const value = (r: number): number => {
    let sum = 0;
    for (let i = 0; i < amounts.length; i++) {
      sum += (amounts[i] as number) / Math.pow(1 + r, years[i] as number);
    }
    return sum;
  };
  const derivative = (r: number): number => {
    let sum = 0;
    for (let i = 0; i < amounts.length; i++) {
      const t = years[i] as number;
      sum -= (t * (amounts[i] as number)) / Math.pow(1 + r, t + 1);
    }
    return sum;
  };

  // Newton-Raphson from the guess.
  let r = guess;
  for (let i = 0; i < MAX_ITER; i++) {
    const y = value(r);
    if (Math.abs(y) < EPS) return r;
    const dy = derivative(r);
    if (dy === 0) break;
    const next = r - y / dy;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - r) < EPS) return next;
    r = next;
  }

  // Fall back to bisection over a wide bracket if Newton did not settle.
  let lo = -0.9999999;
  let hi = 1e7;
  let flo = value(lo);
  let fhi = value(hi);
  if (flo * fhi <= 0) {
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const fmid = value(mid);
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

  throw new RangeError('finlytic: "xirr" did not converge — try a different "guess"');
}
