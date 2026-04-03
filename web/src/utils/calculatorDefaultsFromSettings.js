/**
 * Merges user preferences with Buy Box targets so the Deal Analyzer uses one source of truth.
 * Buy Box CoC / payback / minimum buyer salary override matching keys in preferences.calculatorDefaults when set.
 */
export function getCalculatorDefaultsFromSettings(settings) {
  const prefs = settings?.preferences?.calculatorDefaults || {};
  const bb = settings?.buyBox || {};
  const next = { ...prefs };
  if (bb.targetCOC != null && bb.targetCOC !== '') {
    const n = Number(bb.targetCOC);
    if (!Number.isNaN(n)) next.targetCOC = n;
  }
  if (bb.targetPayback != null && bb.targetPayback !== '') {
    const n = Number(bb.targetPayback);
    if (!Number.isNaN(n)) next.targetPayback = n;
  }
  if (bb.minBuyerSalary != null && bb.minBuyerSalary !== '') {
    const n = Number(bb.minBuyerSalary);
    if (!Number.isNaN(n)) next.salary = String(Math.round(n));
  }
  return next;
}
