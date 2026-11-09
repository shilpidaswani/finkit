# finkit

[![npm version](https://img.shields.io/npm/v/finkit.svg)](https://www.npmjs.com/package/finkit)
[![CI](https://github.com/shilpidaswani/finkit/actions/workflows/ci.yml/badge.svg)](https://github.com/shilpidaswani/finkit/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/finkit.svg)](./LICENSE)
[![types](https://img.shields.io/npm/types/finkit.svg)](./dist/index.d.ts)

Zero-dependency, type-safe **financial math** for TypeScript and JavaScript:
the time value of money, loan amortization, and interest-rate conversions —
with the results you'd get from a spreadsheet, the ergonomics you'd want from a
modern library, and correct handling of the edge cases most implementations get
wrong.

- **Zero dependencies**, ESM + CJS, fully tree-shakeable.
- **First-class types** and JSDoc on every function.
- **Spreadsheet-compatible** results (`PMT`, `FV`, `PV`, `NPER`, `RATE`,
  `IPMT`, `PPMT`, `NPV`, `IRR`, `EFFECT`, `NOMINAL`).
- **Correct edge cases**: zero-interest loans, annuity-due (begin-of-period)
  payments, balloon residuals, and amortization schedules that end at exactly
  zero.

## Install

```sh
npm install finkit
```

## Quick start

```ts
import { pmt, amortizationSchedule, irr, effectiveRate } from 'finkit';

// Monthly payment on a 200,000 loan at 6% annual for 30 years:
pmt(0.06 / 12, 360, 200000); // -1199.10  (negative: money paid out)

// The full amortization schedule for a 1-year, 10,000 loan at 5% annual:
const schedule = amortizationSchedule({ principal: 10000, rate: 0.05 / 12, nper: 12 });
schedule[0];
// { period: 1, payment: 856.07, interest: 41.67, principal: 814.41, balance: 9185.59 }
schedule.at(-1)!.balance; // 0

// Internal rate of return of a cash-flow series:
irr([-1000, 300, 420, 680]); // ≈ 0.163 per period

// A 6% nominal rate compounded monthly is really:
effectiveRate(0.06, 12); // ≈ 0.0617 (6.17%) effective annual
```

## Sign convention

finkit uses the same cash-flow sign convention as a financial calculator or a
spreadsheet: **money you receive is positive, money you pay out is negative.**
So the payment on a loan you took out is negative, while the amount you borrowed
(its present value) is positive.

## API

Optional parameters are passed as a typed options object. `due` is `'end'`
(ordinary annuity, the default) or `'begin'` (annuity due).

### Time value of money

| Function | Returns |
| --- | --- |
| `pmt(rate, nper, pv, opts?)` | the constant payment per period |
| `fv(rate, nper, pmt, opts?)` | future value of a payment stream |
| `pv(rate, nper, pmt, opts?)` | present value of a payment stream |
| `nper(rate, pmt, pv, opts?)` | number of periods (may be fractional) |
| `rate(nper, pmt, pv, opts?)` | the per-period rate (solved iteratively) |

`opts` accepts `{ fv?, due? }` (and `{ pv?, due? }` for `fv`; `{ fv?, due?, guess? }` for `rate`).

### Interest vs principal

| Function | Returns |
| --- | --- |
| `ipmt(rate, per, nper, pv, opts?)` | interest portion of payment `per` |
| `ppmt(rate, per, nper, pv, opts?)` | principal portion of payment `per` |
| `cumipmt(rate, nper, pv, start, end, opts?)` | total interest over a span |
| `cumprinc(rate, nper, pv, start, end, opts?)` | total principal over a span |

For any period, `ipmt(...) + ppmt(...)` equals the constant `pmt(...)`.

### Cash flows

| Function | Returns |
| --- | --- |
| `npv(rate, cashflows)` | net present value (first flow discounted one period) |
| `irr(cashflows, opts?)` | internal rate of return (first flow at time 0) |

### Loans

```ts
amortizationSchedule({ principal, rate, nper, due?, residual? }): AmortizationRow[]
```

Returns one `{ period, payment, interest, principal, balance }` row per period,
with all amounts positive. Floating-point residue is absorbed into the final
payment so the balance ends at exactly `residual` (default `0`).

### Rate conversion

| Function | Returns |
| --- | --- |
| `effectiveRate(nominalRate, periodsPerYear)` | effective annual rate |
| `nominalRate(effectiveAnnualRate, periodsPerYear)` | nominal annual rate |

## A note on precision

Like a spreadsheet, finkit computes in IEEE-754 double-precision floating point.
That's correct to well beyond cent precision for ordinary use, but if you are
settling money you should round results to your currency's smallest unit at the
point of display or payment, and avoid comparing raw floats for equality.

## License

[MIT](./LICENSE)
