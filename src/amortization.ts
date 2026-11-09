import { assertFinite, assertPositiveInt, type PaymentDue } from './internal';
import { ipmt, ppmt } from './payment';

/** Parameters for {@link amortizationSchedule}. */
export interface AmortizationParams {
  /** Amount borrowed (a positive number). */
  readonly principal: number;
  /** Interest rate per period (e.g. `0.06 / 12` for 6% annual, paid monthly). */
  readonly rate: number;
  /** Number of payments (a positive integer). */
  readonly nper: number;
  /** When each payment occurs. Default `'end'`. */
  readonly due?: PaymentDue;
  /** Balance still owed after the final payment (a balloon). Default `0`. */
  readonly residual?: number;
}

/** One row of an amortization schedule. All amounts are positive. */
export interface AmortizationRow {
  /** 1-based period number. */
  readonly period: number;
  /** Total payment for the period. */
  readonly payment: number;
  /** Interest portion of the payment. */
  readonly interest: number;
  /** Principal portion of the payment. */
  readonly principal: number;
  /** Remaining balance after the payment. */
  readonly balance: number;
}

/**
 * Build the full amortization schedule for a loan: for each period, the payment
 * and how it splits into interest and principal, plus the remaining balance.
 *
 * Floating-point residue is absorbed into the final period so the balance ends
 * exactly at `residual` (or `0`).
 *
 * @example
 * const schedule = amortizationSchedule({ principal: 10000, rate: 0.05 / 12, nper: 12 });
 * schedule[0];  // { period: 1, payment: 856.07, interest: 41.67, principal: 814.41, balance: 9185.59 }
 * schedule.at(-1)!.balance; // 0
 */
export function amortizationSchedule(params: AmortizationParams): AmortizationRow[] {
  const { principal, rate, nper, due } = params;
  const residual = params.residual ?? 0;
  assertFinite(principal, 'principal');
  assertFinite(rate, 'rate');
  assertPositiveInt(nper, 'nper');
  assertFinite(residual, 'residual');
  if (principal <= 0) {
    throw new RangeError(`finkit: "principal" must be positive, received ${principal}`);
  }

  const opts = { fv: -residual, due };
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let period = 1; period <= nper; period++) {
    const interest = -ipmt(rate, period, nper, principal, opts);
    let principalPaid: number;
    if (period === nper) {
      // Reconcile floating-point drift into the last payment.
      principalPaid = balance - residual;
      balance = residual;
    } else {
      principalPaid = -ppmt(rate, period, nper, principal, opts);
      balance -= principalPaid;
    }
    rows.push({
      period,
      payment: interest + principalPaid,
      interest,
      principal: principalPaid,
      balance,
    });
  }

  return rows;
}
