import {
  annualAmortizingDebtService,
  buildMonthlyAmortSchedule,
  buildSellerMonthlySchedule,
  buildSourcesAndUses,
  buildYear1MonthlyDscr,
  comparePaths,
  computeWorkbook,
  defaultBaselinePath,
  defaultSharedFromDeal,
  irr,
  moic,
  normalizeHistoricals,
  projectPath,
  DSCR_LENDABLE_THRESHOLD
} from '../src/lib/underwritingEngine.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function approx(a, b, tol = 1) {
  return Math.abs(a - b) <= tol;
}

const shared = defaultSharedFromDeal({
  askingPrice: 1000000,
  ebitda: 250000,
  revenue: 800000
});
const path = defaultBaselinePath(shared);
path.investorEquityPercent = 50;
path.investorProfitShare = 10;
path.sponsorProfitShare = 90;
path.preferredReturnPercent = 9;
path.holdYears = 5;
path.exitMultiple = 4.5;
path.exitMultiple2 = 5.5;

assert(shared.purchasePrice === 1000000, 'purchase price from deal');
const su = buildSourcesAndUses(shared, path);
assert(su.equityAmount === 100000, '10% equity');
assert(su.sellerAmount === 100000, '10% seller');
assert(su.balanced, 'sources and uses balance');
assert(su.cashAtCloseToSeller === 900000, 'cash at close to seller');

const annual = annualAmortizingDebtService(800000, 0.085, 10);
assert(annual > 100000 && annual < 130000, `SBA debt service sane got ${annual}`);

const sbaSched = buildMonthlyAmortSchedule(800000, 0.085, 10);
assert(sbaSched.length === 120, '120 monthly SBA payments');
assert(approx(sbaSched[sbaSched.length - 1].balance, 0, 0.02), `SBA balances to 0 got ${sbaSched[sbaSched.length - 1].balance}`);

const base = projectPath(shared, path, 'base');
assert(base.years.length === 5, '5 year hold');
assert(base.years[0].dscr != null && base.years[0].dscr > 0, 'year1 dscr');
assert(base.years[0].sbaInterest > 0, 'SBA interest column');
assert(base.years[0].sbaPrincipal > 0, 'SBA principal column');
assert(base.years[0].sellerInterest >= 0, 'seller interest column');
assert(base.exit.exitEquityValue >= 0, 'exit equity');
assert(base.exit2.exitMultiple === 5.5, 'dual exit multiple');
assert(base.debtSchedules.sbaMonthly.length === 120, 'debt schedule exposed');
assert(base.calculated.sbaAnnualPayment > 0, 'calculated strip');

const opt = projectPath(shared, path, 'optimistic');
assert(opt.years[4].revenue >= base.years[4].revenue, 'optimistic revenue >= base');

const down = projectPath(shared, path, 'downturn');
assert(down.years[1].revenue <= base.years[1].revenue, 'downturn softer');

// Explicit scenario growth % inputs
const grown = projectPath(
  { ...shared, growthBaselinePct: 4, growthOptimisticPct: 10, growthConservativePct: -2 },
  { ...path, growthBaselinePct: 4, growthOptimisticPct: 10, growthConservativePct: -2, holdYears: 3 },
  'optimistic'
);
const baseG = projectPath(
  { ...shared, growthBaselinePct: 4, growthOptimisticPct: 10, growthConservativePct: -2 },
  { ...path, growthBaselinePct: 4, growthOptimisticPct: 10, growthConservativePct: -2, holdYears: 3 },
  'base'
);
assert(grown.years[2].revenue > baseG.years[2].revenue, 'optimistic % > baseline %');

const standby = { ...path, sellerNoteMode: 'standby', standbyYears: 2, sellerTermYears: 7 };
const st = projectPath(shared, standby, 'base');
assert(st.years[0].sellerDebtService === 0, 'standby year1 seller DS = 0');
assert(st.years[0].sellerCountsForDscr === false, 'standby excluded from DSCR flag');
assert(st.years[2].sellerDebtService > 0, 'post-standby seller DS > 0');
// Standby Y1 DSCR should only use SBA
const sbaOnly = st.years[0].sbaDebtService;
assert(approx(st.years[0].totalDebtService, sbaOnly, 0.5), 'standby Y1 DSCR excludes seller');

const sellerSched = buildSellerMonthlySchedule({
  sellerAmount: 100000,
  sellerRate: 6,
  sellerTermYears: 5,
  sellerNoteMode: 'amortizing'
});
assert(approx(sellerSched[sellerSched.length - 1].balance, 0, 0.02), 'seller amort balances to 0');

const paths = [
  { ...path, id: 1, name: 'A', isBaseline: true, isPreferred: false },
  { ...path, id: 2, name: 'B', isBaseline: false, isPreferred: true, equityPercent: 20, sbaPercent: 70, sellerPercent: 10 }
];
const cmp = comparePaths(shared, paths, 'base');
assert(cmp.length === 2, 'compare two paths');
assert(cmp[1].equityCheck > cmp[0].equityCheck, 'higher equity path');
assert(cmp[1].isPreferred === true, 'preferred path flagged');

const wb = computeWorkbook({ shared, paths, scenarioKey: 'base' });
assert(wb.comparison.length === 2, 'workbook comparison');
assert(wb.sensitivity?.rows?.length > 0, 'sensitivity grid');
assert(wb.preferredPathId === 2, 'preferred path id');

assert(irr([-100, 0, 0, 0, 150]) !== null, 'irr computes');
assert(approx(moic(100, 250), 2.5, 0.01), 'moic 2.5x');
assert(DSCR_LENDABLE_THRESHOLD === 1.25, 'dscr threshold');

const hist = normalizeHistoricals([{
  year: 2024,
  revenue: { value: 1000000 },
  cogs: { value: 400000 },
  opex: { value: 300000 },
  other: { value: 0 },
  ownerSalaryAddback: { value: 50000 },
  taxReturnRevenue: { value: 1000000 },
  taxReturnEbitda: { value: 300000 },
  addbacks: [{ amount: 20000, include: true }]
}]);
assert(hist[0].adjustedEbitda === 320000, 'addbacks into adj ebitda');
assert(hist[0].revenuePass === true, 'tax return revenue pass');

const monthly = buildYear1MonthlyDscr({
  ebitdaY1: 250000,
  sbaMonthly: sbaSched.slice(0, 12),
  sellerMonthly: sellerSched.slice(0, 12),
  includeSellerInDscr: true,
  seasonality: null
});
assert(monthly.length === 12, '12 monthly DSCR rows');
assert(monthly[0].dscr != null, 'monthly dscr');

// Waterfall cumulative pref: investor capital * pref rate accrues
assert(base.waterfall[0].prefPaid >= 0, 'pref paid year1');
assert(base.waterfall.length === 5, 'waterfall years');

console.log('✅ underwritingEngine tests passed');
