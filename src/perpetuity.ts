import { assertFinite, assertPositiveInt, dueFactor, type PaymentDue } from './internal';

/**
 * Present value of a level perpetuity — a constant `payment` every period,
 * forever — discounted at `rate` per period.
 *
 * These growth/perpetuity helpers use the natural textbook sign convention: a
 * positive payment stream has a positive present value. `due` is `'end'`
 * (ordinary, the default) or `'begin'` (the first payment occurs today).
 *
 * @example
 * pvPerpetuity(100, 0.05); // 2000  (100 / 0.05)
 */
export function pvPerpetuity(payment: number, rate: number, due: PaymentDue = 'end'): number {
  assertFinite(payment, 'payment');
  assertFinite(rate, 'rate');
  if (rate <= 0) {
    throw new RangeError('finlytic: "rate" must be positive for a perpetuity to converge');
  }
  const base = payment / rate;
  return base * (1 + rate * dueFactor(due));
}

/**
 * Present value of a growing perpetuity (the Gordon growth model): a stream
 * whose first payment is `payment` (one period from now) and which then grows
 * at `growth` per period forever. Converges only when `rate > growth`.
 *
 * @example
 * pvGrowingPerpetuity(100, 0.08, 0.03); // 2000  (100 / (0.08 - 0.03))
 */
export function pvGrowingPerpetuity(payment: number, rate: number, growth: number): number {
  assertFinite(payment, 'payment');
  assertFinite(rate, 'rate');
  assertFinite(growth, 'growth');
  if (rate <= growth) {
    throw new RangeError('finlytic: a growing perpetuity requires "rate" > "growth"');
  }
  return payment / (rate - growth);
}

/**
 * Present value of a growing annuity: `nper` payments, the first of them
 * `payment` (one period from now), each later one larger by a factor of
 * `(1 + growth)`, discounted at `rate` per period. Handles the `rate === growth`
 * limit exactly.
 *
 * @example
 * pvGrowingAnnuity(100, 0.08, 0.03, 10); // ≈ 755.01
 */
export function pvGrowingAnnuity(
  payment: number,
  rate: number,
  growth: number,
  nper: number,
): number {
  assertFinite(payment, 'payment');
  assertFinite(rate, 'rate');
  assertFinite(growth, 'growth');
  assertPositiveInt(nper, 'nper');
  if (rate <= -1 || growth <= -1) {
    throw new RangeError('finlytic: "rate" and "growth" must be greater than -1');
  }

  if (rate === growth) {
    return (payment * nper) / (1 + rate);
  }
  const ratio = Math.pow((1 + growth) / (1 + rate), nper);
  return (payment / (rate - growth)) * (1 - ratio);
}

/**
 * Future value (at the end of the last period) of a growing annuity: `nper`
 * payments, the first `payment` one period from now and each later one larger by
 * a factor of `(1 + growth)`, compounded at `rate` per period. Handles the
 * `rate === growth` limit exactly.
 *
 * @example
 * fvGrowingAnnuity(100, 0.08, 0.03, 10); // ≈ 1630.02
 */
export function fvGrowingAnnuity(
  payment: number,
  rate: number,
  growth: number,
  nper: number,
): number {
  assertFinite(payment, 'payment');
  assertFinite(rate, 'rate');
  assertFinite(growth, 'growth');
  assertPositiveInt(nper, 'nper');
  if (rate <= -1 || growth <= -1) {
    throw new RangeError('finlytic: "rate" and "growth" must be greater than -1');
  }

  if (rate === growth) {
    return payment * nper * Math.pow(1 + rate, nper - 1);
  }
  return (payment * (Math.pow(1 + rate, nper) - Math.pow(1 + growth, nper))) / (rate - growth);
}
