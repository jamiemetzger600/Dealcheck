/**
 * Vettr underwriting calculation engine (pure functions).
 * One workbook per deal; many structure paths; operating scenarios base/optimistic/downturn.
 * Monthly amort schedules are authoritative; annual tables roll up from them.
 */

export const OPERATING_SCENARIOS = ['base', 'optimistic', 'downturn'];
export const SELLER_NOTE_MODES = ['amortizing', 'interest_only', 'standby', 'balloon'];
export const DSCR_LENDABLE_THRESHOLD = 1.25;

export function num(v, fallback = 0) {
  if (v == null || v === '') return fallback;
  if (typeof v === 'object' && v !== null && 'value' in v) return num(v.value, fallback);
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,%]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function field(value, source = 'manual', verified = false) {
  return { value: num(value), source, verified: Boolean(verified) };
}

export function unwrap(f) {
  return num(f);
}

/** Monthly payment for fully amortizing loan. */
export function monthlyAmortPayment(principal, annualRateDecimal, years) {
  const P = num(principal);
  const r = num(annualRateDecimal);
  const nYears = num(years);
  if (P <= 0 || nYears <= 0) return 0;
  if (r <= 0) return P / (nYears * 12);
  const monthly = r / 12;
  const n = Math.round(nYears * 12);
  return (P * monthly * Math.pow(1 + monthly, n)) / (Math.pow(1 + monthly, n) - 1);
}

/** Annual debt service for amortizing loan (monthly payments × 12). */
export function annualAmortizingDebtService(principal, annualRateDecimal, years) {
  return monthlyAmortPayment(principal, annualRateDecimal, years) * 12;
}

export function annualInterestOnlyDebtService(principal, annualRateDecimal) {
  return num(principal) * num(annualRateDecimal);
}

/**
 * Build a correct monthly amortizing schedule that balances to ~$0.
 * @returns {{ month, payment, interest, principal, balance }[]}
 */
export function buildMonthlyAmortSchedule(principal, annualRateDecimal, years) {
  const P0 = num(principal);
  const nYears = num(years);
  const n = Math.round(nYears * 12);
  if (P0 <= 0 || n <= 0) return [];
  const monthlyRate = num(annualRateDecimal) / 12;
  const payment = monthlyAmortPayment(P0, annualRateDecimal, nYears);
  const schedule = [];
  let balance = P0;
  for (let m = 1; m <= n; m++) {
    const interest = balance * monthlyRate;
    let principalPay = payment - interest;
    if (m === n || principalPay > balance) {
      principalPay = balance;
    }
    const actualPayment = interest + principalPay;
    balance = Math.max(0, balance - principalPay);
    if (m === n) balance = 0;
    schedule.push({
      month: m,
      payment: actualPayment,
      interest,
      principal: principalPay,
      balance
    });
  }
  return schedule;
}

/**
 * Seller note monthly schedule by mode.
 * standby: months 1..standbyYears*12 → $0; then amortize remaining term.
 * balloon: IO until balloonYear, then balloon principal that month.
 * interest_only: IO for full term (balance remains).
 */
export function buildSellerMonthlySchedule(path) {
  const P = num(path.sellerAmount);
  if (P <= 0) return [];
  const rate = num(path.sellerRate) / 100;
  const term = Math.max(1, num(path.sellerTermYears, 5));
  const mode = path.sellerNoteMode || 'amortizing';
  const standbyYears = Math.max(0, Math.floor(num(path.standbyYears, 0)));
  const balloonYear = Math.max(1, Math.floor(num(path.balloonYear, term)));
  const monthlyRate = rate / 12;
  const schedule = [];

  if (mode === 'standby') {
    const standbyMonths = standbyYears * 12;
    const amortYears = Math.max(1, term - standbyYears);
    for (let m = 1; m <= standbyMonths; m++) {
      schedule.push({
        month: m,
        payment: 0,
        interest: 0,
        principal: 0,
        balance: P,
        countsForDscr: false
      });
    }
    const amort = buildMonthlyAmortSchedule(P, rate, amortYears);
    for (const row of amort) {
      schedule.push({
        ...row,
        month: standbyMonths + row.month,
        countsForDscr: true
      });
    }
    return schedule;
  }

  if (mode === 'interest_only') {
    const n = Math.round(term * 12);
    const interest = P * monthlyRate;
    for (let m = 1; m <= n; m++) {
      schedule.push({
        month: m,
        payment: interest,
        interest,
        principal: 0,
        balance: P,
        countsForDscr: true
      });
    }
    return schedule;
  }

  if (mode === 'balloon') {
    const balloonMonth = balloonYear * 12;
    const interest = P * monthlyRate;
    for (let m = 1; m <= balloonMonth; m++) {
      const isBalloon = m === balloonMonth;
      schedule.push({
        month: m,
        payment: interest + (isBalloon ? P : 0),
        interest,
        principal: isBalloon ? P : 0,
        balance: isBalloon ? 0 : P,
        countsForDscr: true
      });
    }
    return schedule;
  }

  // amortizing
  return buildMonthlyAmortSchedule(P, rate, term).map((row) => ({ ...row, countsForDscr: true }));
}

/** Roll monthly schedule into annual { year, payment, interest, principal, balanceEnd, countsForDscr }. */
export function rollupAnnualDebt(schedule, holdYears) {
  const years = [];
  for (let y = 1; y <= holdYears; y++) {
    const start = (y - 1) * 12;
    const slice = schedule.slice(start, start + 12);
    if (!slice.length) {
      years.push({
        year: y,
        payment: 0,
        interest: 0,
        principal: 0,
        balanceEnd: years[y - 2]?.balanceEnd ?? 0,
        countsForDscr: true
      });
      continue;
    }
    const payment = slice.reduce((s, r) => s + r.payment, 0);
    const interest = slice.reduce((s, r) => s + r.interest, 0);
    const principal = slice.reduce((s, r) => s + r.principal, 0);
    const balanceEnd = slice[slice.length - 1].balance;
    const countsForDscr = slice.some((r) => r.countsForDscr !== false) && payment > 0
      ? true
      : slice.every((r) => r.countsForDscr === false)
        ? false
        : true;
    years.push({ year: y, payment, interest, principal, balanceEnd, countsForDscr });
  }
  return years;
}

/**
 * Seller debt service for a given year (1-indexed) — derived from monthly schedule.
 */
export function sellerDebtServiceForYear(path, year) {
  const P = num(path.sellerAmount);
  if (P <= 0) return { interest: 0, principal: 0, total: 0, balanceEnd: 0, countsForDscr: true };
  const hold = Math.max(year, Math.ceil(num(path.sellerTermYears, 5)));
  const annual = rollupAnnualDebt(buildSellerMonthlySchedule(path), hold);
  const row = annual[year - 1];
  if (!row) return { interest: 0, principal: 0, total: 0, balanceEnd: 0, countsForDscr: true };
  return {
    interest: row.interest,
    principal: row.principal,
    total: row.payment,
    balanceEnd: row.balanceEnd,
    countsForDscr: row.countsForDscr
  };
}

export function sbaDebtServiceAnnual(sbaAmount, sbaRatePct, sbaTermYears) {
  return annualAmortizingDebtService(sbaAmount, num(sbaRatePct) / 100, sbaTermYears);
}

/** Deal-cost breakdown → closingCosts total used in sources & uses. */
export function resolveDealCosts(shared = {}, path = {}) {
  const dc = { ...(shared.dealCosts || {}), ...(path.dealCosts || {}) };
  const qoe = num(dc.qoe ?? path.qoeCost ?? shared.qoeCost);
  const legal = num(dc.legal ?? path.legalCost ?? shared.legalCost);
  const dd = num(dc.dd ?? path.ddCost ?? shared.ddCost);
  const closing = num(dc.closing ?? path.closingCosts ?? shared.closingCosts);
  const workingCapital = num(
    path.workingCapitalInjection ?? shared.workingCapitalInjection ?? dc.workingCapital
  );
  // If granular costs set, sum them; else fall back to single closingCosts
  const granular = qoe + legal + dd + closing;
  const closingCosts = granular > 0 ? granular : num(path.closingCosts, num(shared.closingCosts));
  return { qoe, legal, dd, closing, workingCapital, closingCosts, totalUsesExtra: closingCosts + workingCapital };
}

export function buildSourcesAndUses(shared, path) {
  const purchasePrice = num(path.purchasePrice, num(shared.purchasePrice));
  const equityPct = num(path.equityPercent, 10);
  const sbaPct = num(path.sbaPercent, 80);
  const sellerPct = num(path.sellerPercent, 10);
  const costs = resolveDealCosts(shared, path);
  const closingCosts = costs.closingCosts;
  const workingCapital = costs.workingCapital;
  const sbaGuarantyFee = num(path.sbaGuarantyFee, num(shared.sbaGuarantyFee));

  const equityAmount = purchasePrice * (equityPct / 100);
  const sellerAmount = purchasePrice * (sellerPct / 100);
  const usesTotal = purchasePrice + closingCosts + workingCapital + sbaGuarantyFee;
  let sbaAmount = purchasePrice * (sbaPct / 100);
  const sourcesWithoutSba = equityAmount + sellerAmount;
  const fundingNeed = usesTotal - sourcesWithoutSba;
  if (Math.abs(sbaAmount - fundingNeed) > 1) {
    sbaAmount = Math.max(0, fundingNeed);
  }

  const sourcesTotal = equityAmount + sbaAmount + sellerAmount;
  const balanced = Math.abs(sourcesTotal - usesTotal) < 1;
  const cashAtCloseToSeller = purchasePrice - sellerAmount;

  return {
    purchasePrice,
    equityPercent: equityPct,
    sbaPercent: sbaPct,
    sellerPercent: sellerPct,
    equityAmount,
    sbaAmount,
    sellerAmount,
    closingCosts,
    workingCapital,
    sbaGuarantyFee,
    dealCosts: costs,
    cashAtCloseToSeller,
    sourcesTotal,
    usesTotal,
    balanced,
    fundingGap: usesTotal - sourcesTotal
  };
}

export function normalizeHistoricals(historicals = []) {
  return (historicals || []).map((h) => {
    const revenue = unwrap(h.revenue);
    const cogs = unwrap(h.cogs);
    const opex = unwrap(h.opex);
    const other = unwrap(h.other);
    const addbacks = (h.addbacks || []).filter((a) => a.include !== false);
    const addbackTotal = addbacks.reduce((s, a) => s + num(a.amount), 0);
    const ebitda = revenue - cogs - opex - other;
    const adjustedEbitda = ebitda + addbackTotal;
    const sde = adjustedEbitda + unwrap(h.ownerSalaryAddback);
    const taxReturnRevenue = unwrap(h.taxReturnRevenue);
    const taxReturnEbitda = unwrap(h.taxReturnEbitda);
    const revenueVariance = taxReturnRevenue ? revenue - taxReturnRevenue : null;
    const ebitdaVariance = taxReturnEbitda ? adjustedEbitda - taxReturnEbitda : null;
    const revenuePass =
      taxReturnRevenue === 0 && !h.taxReturnRevenue
        ? null
        : taxReturnRevenue
          ? Math.abs(revenueVariance) / Math.max(Math.abs(taxReturnRevenue), 1) <= 0.02
          : null;
    const ebitdaPass =
      taxReturnEbitda === 0 && !h.taxReturnEbitda
        ? null
        : taxReturnEbitda
          ? Math.abs(ebitdaVariance) / Math.max(Math.abs(taxReturnEbitda), 1) <= 0.05
          : null;
    return {
      year: h.year,
      revenue,
      cogs,
      opex,
      other,
      ebitda,
      addbackTotal,
      adjustedEbitda,
      sde,
      addbacks: h.addbacks || [],
      taxReturnRevenue,
      taxReturnEbitda,
      revenueVariance,
      ebitdaVariance,
      revenuePass,
      ebitdaPass
    };
  });
}

/** Resolve scenario growth as decimal from explicit % fields (preferred) or legacy curves. */
function growthPctForScenario(shared, path, scenarioKey) {
  const pick = (primary, legacyFlat) => {
    if (primary != null && primary !== '') return num(primary);
    if (legacyFlat != null && legacyFlat !== '') return num(legacyFlat);
    return null;
  };

  if (scenarioKey === 'optimistic') {
    return pick(
      path.growthOptimisticPct ?? shared.growthOptimisticPct,
      null
    );
  }
  if (scenarioKey === 'downturn') {
    return pick(
      path.growthConservativePct ?? shared.growthConservativePct,
      null
    );
  }
  // baseline / base
  return pick(
    path.growthBaselinePct ?? shared.growthBaselinePct,
    path.revenueGrowthRate ?? shared.revenueGrowthRate
  );
}

function scenarioGrowth(shared, path, scenarioKey, yearIndex) {
  const explicit = growthPctForScenario(shared, path, scenarioKey);
  if (explicit != null) {
    // Stored as percent points (4 = 4%/yr)
    return num(explicit) / 100;
  }

  // Legacy: single flat rate + lifts
  const flatPct = path.revenueGrowthRate ?? shared.revenueGrowthRate;
  if (flatPct != null && flatPct !== '') {
    const flat = num(flatPct) / 100;
    if (scenarioKey === 'base') return flat;
    if (scenarioKey === 'optimistic') return flat + num(shared.optimisticGrowthLift, 0.025);
    if (scenarioKey === 'downturn') return Math.min(0, flat) - num(shared.downturnGrowthDrop, 0.05);
  }

  const curves = {
    base: path.growthCurve || shared.growthCurve || [0.05, 0.04, 0.03],
    optimistic: path.optimisticGrowthCurve || shared.optimisticGrowthCurve || [0.075, 0.06, 0.05],
    downturn: path.downturnGrowthCurve || shared.downturnGrowthCurve || [0.0, -0.05, 0.02]
  };
  const curve = curves[scenarioKey] || curves.base;
  if (!curve.length) return 0.03;
  return num(curve[Math.min(yearIndex, curve.length - 1)], 0.03);
}

function scenarioMargin(shared, path, scenarioKey) {
  let base = num(path.ebitdaMargin, num(shared.ebitdaMargin, 0.25));
  if (base > 1) base /= 100;
  if (scenarioKey === 'optimistic') return base + num(shared.optimisticMarginLift, 0.02);
  if (scenarioKey === 'downturn') return Math.max(0.01, base - num(shared.downturnMarginDrop, 0.03));
  return base;
}

/**
 * Project holdYears of operations for a path × operating scenario.
 * Debt Int/Prin/Bal come from correct monthly amort rollups.
 */
export function projectPath(shared, path, scenarioKey = 'base') {
  const su = buildSourcesAndUses(shared, path);
  const pathWithAmounts = {
    ...path,
    sellerAmount: su.sellerAmount,
    sbaRate: path.sbaRate ?? shared.sbaRate ?? 8.5,
    sbaTermYears: path.sbaTermYears ?? shared.sbaTermYears ?? 10
  };
  const holdYears = Math.max(1, Math.floor(num(path.holdYears, num(shared.holdYears, 10))));
  const hist = normalizeHistoricals(shared.historicals);
  const last = hist[hist.length - 1];
  let revenue = num(path.startingRevenue, last?.revenue || shared.startingRevenue || 0);
  const margin = scenarioMargin(shared, path, scenarioKey);
  let ebitda = num(path.startingEbitda, last?.adjustedEbitda || revenue * margin);
  const ownerSalary = num(path.ownerSalary, num(shared.ownerSalary));
  const capexPct = num(path.capexPercent, num(shared.capexPercent, 0.02));
  const exitMultiple = num(path.exitMultiple, num(shared.exitMultiple, 4.5));
  const exitMultiple2 = num(path.exitMultiple2, num(shared.exitMultiple2, exitMultiple + 0.5));
  const exitCostPct = num(path.exitCostPercent, num(shared.exitCostPercent, 0.02));
  const includeSellerInDscr = path.includeSellerInDscr !== false;

  const sbaRate = num(pathWithAmounts.sbaRate) / 100;
  const sbaTerm = num(pathWithAmounts.sbaTermYears, 10);
  const sbaMonthly = buildMonthlyAmortSchedule(su.sbaAmount, sbaRate, sbaTerm);
  const sbaAnnual = rollupAnnualDebt(sbaMonthly, holdYears);
  const sellerMonthly = buildSellerMonthlySchedule(pathWithAmounts);
  const sellerAnnual = rollupAnnualDebt(sellerMonthly, holdYears);
  const startYear = Math.floor(num(path.startYear, num(shared.startYear, new Date().getFullYear() + 1)));

  const years = [];
  for (let y = 1; y <= holdYears; y++) {
    if (y > 1) {
      const g = scenarioGrowth(shared, path, scenarioKey, y - 2);
      revenue *= 1 + g;
      ebitda = revenue * margin;
    } else if (!path.startingEbitda && !last?.adjustedEbitda) {
      ebitda = revenue * margin;
    }

    const sba = sbaAnnual[y - 1] || {
      payment: 0, interest: 0, principal: 0, balanceEnd: 0
    };
    const seller = sellerAnnual[y - 1] || {
      payment: 0, interest: 0, principal: 0, balanceEnd: 0, countsForDscr: true
    };

    const sellerForDscr = includeSellerInDscr && seller.countsForDscr !== false ? seller.payment : 0;
    const totalDebtService = sba.payment + sellerForDscr;
    const dscr = totalDebtService > 0 ? ebitda / totalDebtService : null;
    const capex = revenue * capexPct;
    const fcf = ebitda - totalDebtService - capex - ownerSalary;
    const cashToEquity = Math.max(0, fcf);

    years.push({
      year: y,
      calendarYear: startYear + y - 1,
      revenue,
      ownerSalary,
      ebitda,
      sbaDebtService: sba.payment,
      sbaInterest: sba.interest,
      sbaPrincipal: sba.principal,
      sbaBalance: sba.balanceEnd,
      sellerDebtService: seller.payment,
      sellerInterest: seller.interest,
      sellerPrincipal: seller.principal,
      sellerBalance: seller.balanceEnd,
      sellerCountsForDscr: seller.countsForDscr !== false,
      totalDebtService,
      totalDebtBalance: sba.balanceEnd + seller.balanceEnd,
      dscr,
      capex,
      fcf,
      cashToEquity
    });
  }

  const lastYear = years[years.length - 1];
  const buildExit = (mult) => {
    const exitEv = (lastYear?.ebitda || 0) * mult;
    const residualDebt = (lastYear?.sbaBalance || 0) + (lastYear?.sellerBalance || 0);
    const exitCosts = exitEv * exitCostPct;
    const exitEquityValue = Math.max(0, exitEv - residualDebt - exitCosts);
    return { exitEv, residualDebt, exitCosts, exitEquityValue, exitMultiple: mult };
  };
  const exit = buildExit(exitMultiple);
  const exit2 = buildExit(exitMultiple2);

  const equityInvested = su.equityAmount;
  const investorPctOfEquity = num(path.investorEquityPercent, 0) / 100;
  const investorCapital = equityInvested * (investorPctOfEquity || (num(path.investorProfitShare, 0) > 0 ? 0.5 : 0));
  const invCap = num(path.investorCapital, investorCapital);
  const sponsorCap = equityInvested - invCap;

  const waterfallOpts = {
    investorCapital: invCap,
    sponsorCapital: sponsorCap,
    prefRate: num(path.preferredReturnPercent, 9) / 100,
    investorProfitShare: num(path.investorProfitShare, 10) / 100,
    sponsorProfitShare: num(path.sponsorProfitShare, 90) / 100
  };

  const waterfall = buildWaterfall(years, { ...waterfallOpts, exitEquityValue: exit.exitEquityValue });
  const waterfall2 = buildWaterfall(years, { ...waterfallOpts, exitEquityValue: exit2.exitEquityValue });

  const attachExit = (wf, exitEq) => {
    const exitSplit = splitExit(exitEq, invCap, sponsorCap, wf, waterfallOpts);
    if (wf.length) {
      const lastW = wf[wf.length - 1];
      lastW.investorTotal += exitSplit.investor;
      lastW.sponsorTotal += exitSplit.sponsor;
      lastW.exitInvestor = exitSplit.investor;
      lastW.sponsorExit = exitSplit.sponsor;
      lastW.exitSponsor = exitSplit.sponsor;
    }
    return exitSplit;
  };
  attachExit(waterfall, exit.exitEquityValue);
  attachExit(waterfall2, exit2.exitEquityValue);

  const investorCashflows = [-invCap, ...waterfall.map((w) => w.investorTotal)];
  const sponsorCashflows = [-sponsorCap, ...waterfall.map((w) => w.sponsorTotal)];
  const investorCashflows2 = [-invCap, ...waterfall2.map((w) => w.investorTotal)];
  const sponsorCashflows2 = [-sponsorCap, ...waterfall2.map((w) => w.sponsorTotal)];

  const sbaAnnualPmt = sbaAnnual[0]?.payment || 0;
  const sellerAnnualPmt = sellerAnnual[0]?.payment || 0;

  const monthlyDscr = buildYear1MonthlyDscr({
    ebitdaY1: years[0]?.ebitda || 0,
    sbaMonthly,
    sellerMonthly,
    includeSellerInDscr,
    seasonality: shared.seasonalityWeights || path.seasonalityWeights
  });

  return {
    scenario: scenarioKey,
    sourcesAndUses: su,
    years,
    debtSchedules: {
      sbaMonthly,
      sellerMonthly,
      sbaAnnual,
      sellerAnnual
    },
    calculated: {
      sbaAnnualPayment: sbaAnnualPmt,
      sellerAnnualPayment: sellerAnnualPmt,
      totalDebtServiceY1: years[0]?.totalDebtService || 0,
      fcfY1: years[0]?.fcf || 0,
      dscrY1: years[0]?.dscr ?? null,
      lendable: years[0]?.dscr != null && years[0].dscr >= DSCR_LENDABLE_THRESHOLD
    },
    exit,
    exit2,
    equity: { equityInvested, investorCapital: invCap, sponsorCapital: sponsorCap },
    waterfall,
    waterfall2,
    monthlyDscr,
    returns: {
      investor: {
        irr: irr(investorCashflows),
        moic: moic(invCap, waterfall.reduce((s, w) => s + w.investorTotal, 0)),
        cashflows: investorCashflows,
        irrExit2: irr(investorCashflows2),
        moicExit2: moic(invCap, waterfall2.reduce((s, w) => s + w.investorTotal, 0))
      },
      sponsor: {
        irr: irr(sponsorCashflows),
        moic: moic(sponsorCap, waterfall.reduce((s, w) => s + w.sponsorTotal, 0)),
        cashflows: sponsorCashflows,
        irrExit2: irr(sponsorCashflows2),
        moicExit2: moic(sponsorCap, waterfall2.reduce((s, w) => s + w.sponsorTotal, 0))
      },
      year1Dscr: years[0]?.dscr ?? null,
      year1Coc: equityInvested > 0 ? (years[0]?.cashToEquity || 0) / equityInvested : null,
      year1Fcf: years[0]?.fcf ?? null,
      paybackYears: payback(equityInvested, years.map((y) => y.cashToEquity))
    },
    warnings: buildWarnings(su, years)
  };
}

/** Optional Y1 monthly DSCR with seasonality weights (length 12, sum ≈ 1). */
export function buildYear1MonthlyDscr({
  ebitdaY1,
  sbaMonthly,
  sellerMonthly,
  includeSellerInDscr,
  seasonality
}) {
  const weights = Array.isArray(seasonality) && seasonality.length === 12
    ? seasonality.map((w) => num(w, 1 / 12))
    : Array(12).fill(1 / 12);
  const weightSum = weights.reduce((s, w) => s + w, 0) || 1;
  const norm = weights.map((w) => w / weightSum);
  const months = [];
  for (let m = 0; m < 12; m++) {
    const sba = sbaMonthly[m] || { payment: 0 };
    const seller = sellerMonthly[m] || { payment: 0, countsForDscr: true };
    const sellerPmt = includeSellerInDscr && seller.countsForDscr !== false ? seller.payment : 0;
    const debt = sba.payment + sellerPmt;
    const ebitda = ebitdaY1 * norm[m];
    months.push({
      month: m + 1,
      ebitda,
      sbaPayment: sba.payment,
      sellerPayment: seller.payment,
      totalDebtService: debt,
      dscr: debt > 0 ? ebitda / debt : null
    });
  }
  return months;
}

function splitExit(exitEquity, invCap, sponsorCap, waterfallSoFar, opts = {}) {
  const totalCap = invCap + sponsorCap;
  if (totalCap <= 0) return { investor: exitEquity, sponsor: 0 };
  let rem = exitEquity;
  let investor = 0;
  let sponsor = 0;
  const invReturned = waterfallSoFar.reduce((s, w) => s + (w.investorRoc || 0), 0);
  const spReturned = waterfallSoFar.reduce((s, w) => s + (w.sponsorRoc || 0), 0);
  const invNeed = Math.max(0, invCap - invReturned);
  const spNeed = Math.max(0, sponsorCap - spReturned);
  const rocInv = Math.min(rem, invNeed);
  investor += rocInv;
  rem -= rocInv;
  const rocSp = Math.min(rem, spNeed);
  sponsor += rocSp;
  rem -= rocSp;
  const invShare = num(opts.investorProfitShare, invCap / totalCap);
  const spShare = num(opts.sponsorProfitShare, sponsorCap / totalCap);
  const shareSum = invShare + spShare || 1;
  investor += rem * (invShare / shareSum);
  sponsor += rem * (spShare / shareSum);
  return { investor, sponsor };
}

/**
 * Cumulative preferred return waterfall per year on cashToEquity, then exit handled separately.
 */
export function buildWaterfall(years, opts) {
  let prefAccrued = 0;
  let invRemaining = opts.investorCapital;
  let spRemaining = opts.sponsorCapital;
  const prefRate = opts.prefRate;
  const invShare = opts.investorProfitShare;
  const spShare = opts.sponsorProfitShare;

  return years.map((y) => {
    prefAccrued += opts.investorCapital * prefRate;
    let cash = y.cashToEquity;
    let prefPaid = 0;
    let investorRoc = 0;
    let sponsorRoc = 0;
    let investorProfit = 0;
    let sponsorProfit = 0;

    if (cash > 0 && prefAccrued > 0) {
      prefPaid = Math.min(cash, prefAccrued);
      prefAccrued -= prefPaid;
      cash -= prefPaid;
    }
    if (cash > 0 && invRemaining > 0) {
      investorRoc = Math.min(cash, invRemaining);
      invRemaining -= investorRoc;
      cash -= investorRoc;
    }
    if (cash > 0 && spRemaining > 0) {
      sponsorRoc = Math.min(cash, spRemaining);
      spRemaining -= sponsorRoc;
      cash -= sponsorRoc;
    }
    if (cash > 0) {
      investorProfit = cash * invShare;
      sponsorProfit = cash * spShare;
      cash = 0;
    }

    return {
      year: y.year,
      fcfAvail: y.cashToEquity,
      prefPaid,
      prefAccruedEnd: prefAccrued,
      investorRoc,
      sponsorRoc,
      investorProfit,
      sponsorProfit,
      investorTotal: prefPaid + investorRoc + investorProfit,
      sponsorTotal: sponsorRoc + sponsorProfit,
      ownerCfProfit: sponsorRoc + sponsorProfit,
      invCapRemaining: invRemaining,
      sponsorCapRemaining: spRemaining
    };
  });
}

export function irr(cashflows, guess = 0.1) {
  const cf = cashflows.filter((c) => c != null);
  if (cf.length < 2) return null;
  const hasPos = cf.some((c) => c > 0);
  const hasNeg = cf.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;
  let rate = guess;
  for (let i = 0; i < 80; i++) {
    let npv = 0;
    let d = 0;
    for (let t = 0; t < cf.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cf[t] / denom;
      if (t > 0) d -= (t * cf[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(d) < 1e-12) break;
    const next = rate - npv / d;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }
  return Number.isFinite(rate) ? rate : null;
}

export function moic(invested, returned) {
  if (invested <= 0) return null;
  return returned / invested;
}

export function payback(invested, annualCash) {
  if (invested <= 0) return null;
  let cum = 0;
  for (let i = 0; i < annualCash.length; i++) {
    cum += annualCash[i];
    if (cum >= invested) {
      const prev = cum - annualCash[i];
      const frac = annualCash[i] > 0 ? (invested - prev) / annualCash[i] : 0;
      return i + frac;
    }
  }
  return null;
}

function buildWarnings(su, years) {
  const warnings = [];
  if (!su.balanced) {
    warnings.push({ code: 'sources_uses_unbalanced', message: `Sources/uses gap: ${su.fundingGap.toFixed(0)}` });
  }
  const y1 = years[0];
  if (y1?.dscr != null && y1.dscr < DSCR_LENDABLE_THRESHOLD) {
    warnings.push({
      code: 'dscr_below_threshold',
      message: `Year-1 DSCR ${y1.dscr.toFixed(2)}x is below ${DSCR_LENDABLE_THRESHOLD}x`
    });
  }
  return warnings;
}

export function sensitivityGrid(shared, path, scenarioKey = 'base') {
  const growths = [0.0, 0.03, 0.05, 0.08, 0.12];
  const multiples = [3.5, 4.0, 4.5, 5.0, 5.5];
  const rows = [];
  for (const g of growths) {
    const cols = [];
    for (const m of multiples) {
      const pathVar = {
        ...path,
        growthCurve: [g, g, g],
        optimisticGrowthCurve: [g, g, g],
        downturnGrowthCurve: [g, g, g],
        exitMultiple: m
      };
      const result = projectPath(shared, pathVar, scenarioKey);
      cols.push({
        growth: g,
        exitMultiple: m,
        irr: result.returns.sponsor.irr ?? result.returns.investor.irr,
        moic: result.returns.sponsor.moic ?? result.returns.investor.moic,
        year1Dscr: result.returns.year1Dscr
      });
    }
    rows.push(cols);
  }
  return { growths, multiples, rows };
}

export function comparePaths(shared, paths, scenarioKey = 'base') {
  return (paths || []).map((p) => {
    const result = projectPath(shared, p, scenarioKey);
    return {
      id: p.id,
      name: p.name,
      isBaseline: Boolean(p.isBaseline),
      isPreferred: Boolean(p.isPreferred),
      purchasePrice: result.sourcesAndUses.purchasePrice,
      equityCheck: result.sourcesAndUses.equityAmount,
      cashAtClose: result.sourcesAndUses.cashAtCloseToSeller,
      sbaAmount: result.sourcesAndUses.sbaAmount,
      sellerAmount: result.sourcesAndUses.sellerAmount,
      sbaRate: num(p.sbaRate),
      sellerRate: num(p.sellerRate),
      sellerNoteMode: p.sellerNoteMode || 'amortizing',
      year1Dscr: result.returns.year1Dscr,
      year1Coc: result.returns.year1Coc,
      year1Fcf: result.returns.year1Fcf,
      investorIrr: result.returns.investor.irr,
      investorMoic: result.returns.investor.moic,
      sponsorIrr: result.returns.sponsor.irr,
      sponsorMoic: result.returns.sponsor.moic,
      exitEquityValue: result.exit.exitEquityValue,
      exitEquityValue2: result.exit2.exitEquityValue,
      warnings: result.warnings,
      dscrSeries: result.years.map((y) => y.dscr),
      cumulativeEquityCash: result.years.reduce((acc, y, i) => {
        const prev = i ? acc[i - 1] : 0;
        acc.push(prev + y.cashToEquity);
        return acc;
      }, [])
    };
  });
}

export function computeWorkbook({ shared = {}, paths = [], scenarioKey = 'base', sensitivityPathId = null } = {}) {
  const normalizedHist = normalizeHistoricals(shared.historicals);
  const pathResults = {};
  for (const p of paths) {
    pathResults[p.id || p.name] = {};
    for (const sc of OPERATING_SCENARIOS) {
      pathResults[p.id || p.name][sc] = projectPath(shared, p, sc);
    }
  }
  const comparison = comparePaths(shared, paths, scenarioKey);
  const baseline = paths.find((p) => p.isBaseline) || paths[0];
  const preferred = paths.find((p) => p.isPreferred) || baseline;
  const sensPath = paths.find((p) => p.id === sensitivityPathId) || baseline;
  const sensitivity = sensPath ? sensitivityGrid(shared, sensPath, scenarioKey) : null;

  return {
    computedAt: new Date().toISOString(),
    scenarioKey,
    historicals: normalizedHist,
    pathResults,
    comparison,
    sensitivity,
    baselinePathId: baseline?.id || null,
    preferredPathId: preferred?.id || null
  };
}

export function defaultSharedFromDeal(deal = {}) {
  const price = num(deal.asking_price ?? deal.askingPrice);
  const ebitda = num(deal.ebitda);
  const revenue = num(deal.revenue);
  const y = new Date().getFullYear() - 1;
  return {
    purchasePrice: price,
    startingRevenue: revenue,
    startingEbitda: ebitda,
    ebitdaMargin: revenue > 0 ? ebitda / revenue : 0.25,
    growthBaselinePct: 4,
    growthOptimisticPct: 7.5,
    growthConservativePct: 0,
    revenueGrowthRate: 4,
    growthCurve: [0.05, 0.04, 0.03],
    optimisticGrowthCurve: [0.075, 0.06, 0.05],
    downturnGrowthCurve: [0, -0.05, 0.02],
    optimisticMarginLift: 0.02,
    downturnMarginDrop: 0.03,
    dealCosts: { qoe: 0, legal: 0, dd: 0, closing: 0 },
    closingCosts: 0,
    workingCapitalInjection: 0,
    sbaGuarantyFee: 0,
    sbaRate: 8.5,
    sbaTermYears: 10,
    ownerSalary: 0,
    capexPercent: 0.02,
    holdYears: 10,
    exitMultiple: 4.5,
    exitMultiple2: 5.0,
    exitCostPercent: 0.02,
    seasonalityWeights: null,
    historicals: revenue || ebitda
      ? [{
          year: y,
          revenue: field(revenue, 'listing', false),
          cogs: field(0, 'manual', false),
          opex: field(0, 'manual', false),
          other: field(0, 'manual', false),
          ownerSalaryAddback: field(0, 'manual', false),
          taxReturnRevenue: field(0, 'manual', false),
          taxReturnEbitda: field(0, 'manual', false),
          addbacks: []
        }]
      : []
  };
}

export function defaultBaselinePath(shared = {}, name = 'Baseline') {
  const price = num(shared.purchasePrice);
  return {
    name,
    isBaseline: true,
    isPreferred: true,
    purchasePrice: price,
    equityPercent: 10,
    sbaPercent: 80,
    sellerPercent: 10,
    sbaRate: num(shared.sbaRate, 8.5),
    sbaTermYears: num(shared.sbaTermYears, 10),
    sellerRate: 6,
    sellerTermYears: 5,
    sellerNoteMode: 'amortizing',
    standbyYears: 0,
    balloonYear: 5,
    preferredReturnPercent: 9,
    investorProfitShare: 10,
    sponsorProfitShare: 90,
    investorEquityPercent: 50,
    investorCapital: null,
    holdYears: num(shared.holdYears, 10),
    exitMultiple: num(shared.exitMultiple, 4.5),
    exitMultiple2: num(shared.exitMultiple2, 5.0),
    exitCostPercent: num(shared.exitCostPercent, 0.02),
    includeSellerInDscr: true,
    dealCosts: shared.dealCosts || { qoe: 0, legal: 0, dd: 0, closing: 0 },
    closingCosts: num(shared.closingCosts),
    workingCapitalInjection: num(shared.workingCapitalInjection),
    sbaGuarantyFee: num(shared.sbaGuarantyFee),
    startingRevenue: num(shared.startingRevenue),
    startingEbitda: num(shared.startingEbitda),
    ebitdaMargin: num(shared.ebitdaMargin, 0.25),
    growthBaselinePct: num(shared.growthBaselinePct, num(shared.revenueGrowthRate, 4)),
    growthOptimisticPct: num(shared.growthOptimisticPct, 7.5),
    growthConservativePct: num(shared.growthConservativePct, 0),
    revenueGrowthRate: num(shared.revenueGrowthRate, num(shared.growthBaselinePct, 4))
  };
}

/** Resolve custom sheet mappings into shared/path patches (whitelisted keys only). */
export const MAPPABLE_KEYS = new Set([
  'startingRevenue',
  'startingEbitda',
  'ebitdaMargin',
  'ownerSalary',
  'closingCosts',
  'workingCapitalInjection',
  'capexPercent',
  'purchasePrice',
  'sbaRate',
  'exitMultiple',
  'exitMultiple2',
  'equityPercent',
  'sbaPercent',
  'sellerPercent',
  'sellerRate',
  'sellerTermYears',
  'preferredReturnPercent'
]);

export function applyCustomSheetMappings(shared, customSheets = []) {
  const next = { ...shared };
  for (const sheet of customSheets) {
    for (const row of sheet.rows || []) {
      if (!row.mapsTo || !MAPPABLE_KEYS.has(row.mapsTo)) continue;
      next[row.mapsTo] = num(row.value);
    }
  }
  return next;
}
