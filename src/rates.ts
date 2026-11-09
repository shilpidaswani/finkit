import { assertFinite, assertPositiveInt } from './internal';

/**
 * Convert a nominal annual rate (compounded `periodsPerYear` times a year) into
 * the effective annual rate — the rate that, compounded once a year, yields the
 * same return. Mirrors a spreadsheet's `EFFECT`.
 *
 * @example
 * effectiveRate(0.06, 12); // ≈ 0.061678 — 6% nominal, monthly, ≈ 6.17% effective
 */
export function effectiveRate(nominalRate: number, periodsPerYear: number): number {
  assertFinite(nominalRate, 'nominalRate');
  assertPositiveInt(periodsPerYear, 'periodsPerYear');
  return Math.pow(1 + nominalRate / periodsPerYear, periodsPerYear) - 1;
}

/**
 * Convert an effective annual rate into the nominal annual rate compounded
 * `periodsPerYear` times a year. The inverse of {@link effectiveRate}; mirrors a
 * spreadsheet's `NOMINAL`.
 *
 * @example
 * nominalRate(0.061678, 12); // ≈ 0.06
 */
export function nominalRate(effectiveAnnualRate: number, periodsPerYear: number): number {
  assertFinite(effectiveAnnualRate, 'effectiveAnnualRate');
  assertPositiveInt(periodsPerYear, 'periodsPerYear');
  return periodsPerYear * (Math.pow(1 + effectiveAnnualRate, 1 / periodsPerYear) - 1);
}
