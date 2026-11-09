/**
 * Shared types and validation helpers.
 * @internal
 */

/**
 * When each payment in an annuity occurs.
 * - `'end'` — ordinary annuity, payment at the end of each period (the default,
 *   e.g. a typical mortgage).
 * - `'begin'` — annuity due, payment at the start of each period (e.g. a lease).
 */
export type PaymentDue = 'end' | 'begin';

/** Optional parameters shared by the time-value-of-money functions. */
export interface TvmOptions {
  /** Future (residual) value remaining after the last payment. Default `0`. */
  readonly fv?: number;
  /** When each payment occurs. Default `'end'`. */
  readonly due?: PaymentDue;
}

/** Map a {@link PaymentDue} to the 0/1 factor used in the annuity formulas. */
export function dueFactor(due: PaymentDue | undefined): 0 | 1 {
  return due === 'begin' ? 1 : 0;
}

/** Throw if `value` is not a finite number. */
export function assertFinite(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`finkit: "${name}" must be a finite number, received ${value}`);
  }
}

/** Throw if `value` is not a positive integer (periods, counts). */
export function assertPositiveInt(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`finkit: "${name}" must be a positive integer, received ${value}`);
  }
}
