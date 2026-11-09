/**
 * finkit — zero-dependency, type-safe financial math for TypeScript.
 *
 * Sign convention: money received is positive, money paid out is negative
 * (the same convention as a financial calculator or spreadsheet).
 */

export type { PaymentDue, TvmOptions } from './internal';

export { fv, pv, pmt, nper, rate } from './annuity';
export type { FvOptions, RateOptions } from './annuity';

export { ipmt, ppmt, cumipmt, cumprinc } from './payment';

export { npv, irr } from './cashflow';
export type { IrrOptions } from './cashflow';

export { amortizationSchedule } from './amortization';
export type { AmortizationParams, AmortizationRow } from './amortization';

export { effectiveRate, nominalRate } from './rates';
