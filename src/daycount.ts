import { assertFinite } from './internal';

/**
 * Day-count conventions determine how a span between two dates is turned into a
 * fraction of a year — the basis for accrued interest, bond pricing and dated
 * discounting. Different markets use different conventions, and the choice
 * materially changes the numbers.
 *
 * - `'30/360'` — US (NASD) 30/360.
 * - `'30E/360'` — European 30/360.
 * - `'ACT/360'` — actual days over a 360-day year (money markets).
 * - `'ACT/365'` — actual days over a fixed 365-day year.
 * - `'ACT/ACT'` — actual/actual (ISDA), accounting for leap years.
 */
export type DayCountConvention = '30/360' | '30E/360' | 'ACT/360' | 'ACT/365' | 'ACT/ACT';

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** A date's calendar Y/M/D as a UTC timestamp, so differences ignore time zones. */
function calendarUTC(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Actual number of days between two calendar dates. */
function actualDays(start: Date, end: Date): number {
  return (calendarUTC(end) - calendarUTC(start)) / 86_400_000;
}

function assertValidDate(date: Date, name: string): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError(`finlytic: "${name}" must be a valid Date`);
  }
}

function thirty360(start: Date, end: Date, european: boolean): number {
  const y1 = start.getUTCFullYear();
  const y2 = end.getUTCFullYear();
  const m1 = start.getUTCMonth() + 1;
  const m2 = end.getUTCMonth() + 1;
  let d1 = start.getUTCDate();
  let d2 = end.getUTCDate();

  if (european) {
    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;
  } else {
    // US (NASD) method.
    if (d1 === 31) d1 = 30;
    if (d2 === 31 && d1 === 30) d2 = 30;
  }

  return (360 * (y2 - y1) + 30 * (m2 - m1) + (d2 - d1)) / 360;
}

function actActIsda(start: Date, end: Date): number {
  const y1 = start.getUTCFullYear();
  const y2 = end.getUTCFullYear();
  if (y1 === y2) {
    return actualDays(start, end) / daysInYear(y1);
  }
  const startStub =
    actualDays(start, new Date(Date.UTC(y1 + 1, 0, 1))) / daysInYear(y1);
  const wholeYears = y2 - y1 - 1;
  const endStub = actualDays(new Date(Date.UTC(y2, 0, 1)), end) / daysInYear(y2);
  return startStub + wholeYears + endStub;
}

/**
 * The fraction of a year between two dates under a given day-count convention.
 * The result is signed: it is negative when `end` is before `start`.
 *
 * @example
 * yearFraction(new Date('2024-01-01'), new Date('2024-07-01'), 'ACT/365'); // ≈ 0.4986
 * yearFraction(new Date('2024-01-31'), new Date('2024-02-28'), '30/360');  // ≈ 0.0778
 */
export function yearFraction(
  start: Date,
  end: Date,
  convention: DayCountConvention = 'ACT/365',
): number {
  assertValidDate(start, 'start');
  assertValidDate(end, 'end');

  // Handle reversed dates by negating, so every convention stays symmetric.
  if (calendarUTC(end) < calendarUTC(start)) {
    return -yearFraction(end, start, convention);
  }

  let result: number;
  switch (convention) {
    case '30/360':
      result = thirty360(start, end, false);
      break;
    case '30E/360':
      result = thirty360(start, end, true);
      break;
    case 'ACT/360':
      result = actualDays(start, end) / 360;
      break;
    case 'ACT/365':
      result = actualDays(start, end) / 365;
      break;
    case 'ACT/ACT':
      result = actActIsda(start, end);
      break;
    default: {
      const exhaustive: never = convention;
      throw new RangeError(`finlytic: unknown day-count convention "${String(exhaustive)}"`);
    }
  }
  assertFinite(result, 'yearFraction');
  return result;
}
