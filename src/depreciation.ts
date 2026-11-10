import { assertFinite, assertPositiveInt } from './internal';

function assertDepreciationInputs(cost: number, salvage: number, life: number): void {
  assertFinite(cost, 'cost');
  assertFinite(salvage, 'salvage');
  assertFinite(life, 'life');
  if (cost < 0) throw new RangeError('finkit: "cost" must not be negative');
  if (salvage < 0) throw new RangeError('finkit: "salvage" must not be negative');
  if (life <= 0) throw new RangeError('finkit: "life" must be positive');
}

/**
 * Straight-line depreciation for one period (Excel `SLN`): the asset loses an
 * equal `(cost − salvage) / life` of its depreciable value every period.
 *
 * @example
 * sln(30000, 7500, 10); // 2250
 */
export function sln(cost: number, salvage: number, life: number): number {
  assertDepreciationInputs(cost, salvage, life);
  return (cost - salvage) / life;
}

/**
 * Sum-of-years'-digits depreciation for a given period (Excel `SYD`): an
 * accelerated method that weights earlier periods more heavily. `period` is
 * 1-based and runs from 1 to `life`.
 *
 * @example
 * syd(30000, 7500, 10, 1);  // 4090.9091 (first year, the largest charge)
 * syd(30000, 7500, 10, 10); // 409.0909  (last year, the smallest)
 */
export function syd(cost: number, salvage: number, life: number, period: number): number {
  assertDepreciationInputs(cost, salvage, life);
  assertPositiveInt(period, 'period');
  if (period > life) {
    throw new RangeError('finkit: "period" must not exceed "life"');
  }
  return ((cost - salvage) * (life - period + 1) * 2) / (life * (life + 1));
}

/**
 * Double-declining-balance (or any fixed factor) depreciation for one period
 * (Excel `DDB`). Each period depreciates `factor / life` of the remaining book
 * value, never dropping the book value below `salvage`. `period` is 1-based;
 * `factor` defaults to `2` (double-declining).
 *
 * @example
 * ddb(2400, 300, 10, 1); // 480
 * ddb(2400, 300, 10, 2); // 384
 */
export function ddb(
  cost: number,
  salvage: number,
  life: number,
  period: number,
  factor = 2,
): number {
  assertDepreciationInputs(cost, salvage, life);
  assertPositiveInt(period, 'period');
  assertFinite(factor, 'factor');
  if (factor <= 0) throw new RangeError('finkit: "factor" must be positive');

  const rate = factor / life;
  let accumulated = 0;
  let depreciation = 0;
  const target = Math.ceil(period);
  for (let p = 1; p <= target; p++) {
    depreciation = Math.min((cost - accumulated) * rate, cost - salvage - accumulated);
    if (depreciation < 0) depreciation = 0;
    accumulated += depreciation;
  }
  return depreciation;
}

/**
 * Fixed-declining-balance depreciation for one period (Excel `DB`). It applies a
 * constant rate — `1 − (salvage / cost)^(1/life)`, rounded to three decimals, as
 * Excel does — to the declining book value, and prorates the first and final
 * periods by `month` (the number of months the asset is held in the first
 * year, default `12`). `period` is 1-based and runs from 1 to `life` (or
 * `life + 1` when `month < 12`).
 *
 * @example
 * db(1000000, 100000, 6, 1, 7); // 186083.33 (first partial year)
 * db(1000000, 100000, 6, 2, 7); // 259639.42
 */
export function db(
  cost: number,
  salvage: number,
  life: number,
  period: number,
  month = 12,
): number {
  assertDepreciationInputs(cost, salvage, life);
  assertPositiveInt(period, 'period');
  assertFinite(month, 'month');
  if (month < 1 || month > 12) {
    throw new RangeError('finkit: "month" must be between 1 and 12');
  }
  if (cost === 0) return 0;

  // Excel rounds the rate to three decimal places.
  const rate = Math.round((1 - Math.pow(salvage / cost, 1 / life)) * 1000) / 1000;
  const lastPeriod = month === 12 ? life : life + 1;
  if (period > lastPeriod) {
    throw new RangeError('finkit: "period" is beyond the depreciation schedule');
  }

  let accumulated = 0;
  let depreciation = 0;
  for (let p = 1; p <= period; p++) {
    if (p === 1) {
      depreciation = (cost * rate * month) / 12;
    } else if (p === life + 1) {
      depreciation = ((cost - accumulated) * rate * (12 - month)) / 12;
    } else {
      depreciation = (cost - accumulated) * rate;
    }
    accumulated += depreciation;
  }
  return depreciation;
}
