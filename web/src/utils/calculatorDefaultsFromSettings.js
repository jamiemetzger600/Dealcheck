/**
 * Merges user preferences with Buy Box targets so the calculator uses one source of truth.
 * Buy Box CoC / payback / minimum buyer salary override matching keys in preferences.calculatorDefaults when set.
 */
import { normalizeBuyBoxesState } from './buyBoxes.js';

export function getCalculatorDefaultsFromSettings(settings) {
  const prefs = settings?.preferences?.calculatorDefaults || {};
  // Resolve the active slot directly. `settings.buyBox` is retained by the API
  // for legacy clients, but can briefly lag behind preferences when users edit
  // or switch among multiple buy boxes.
  const { activeCriteria } = normalizeBuyBoxesState(settings);
  const bb = activeCriteria || settings?.buyBox || {};
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
