import { analyzeDealScenario, createDefaultScenarios, isValidCalculatorPayload } from './dealCalculatorMath';
import { loadCalculatorState } from './dealCalculatorStorage';

/**
 * CoC % and deal quality score for a saved deal, using the same rules as DealCalculator
 * (merged calculator_state / localStorage + active scenario + buy-box quality targets).
 */
export function getSavedDealCalculatorSummary(deal, calculatorDefaults = {}) {
  if (!deal) {
    return { qualityScore: null, cocReturn: null };
  }

  const defaults = createDefaultScenarios(deal, calculatorDefaults);
  const n = defaults.length;

  const fromApi = deal.calculatorState;
  const fromLs = loadCalculatorState(deal.id);
  const fromListingKey =
    deal.dealId != null && deal.dealId !== deal.id ? loadCalculatorState(deal.dealId) : null;

  let stored = null;
  if (isValidCalculatorPayload(fromApi, n)) stored = fromApi;
  else if (isValidCalculatorPayload(fromLs, n)) stored = fromLs;
  else if (isValidCalculatorPayload(fromListingKey, n)) stored = fromListingKey;

  const scenarios = stored
    ? stored.scenarios.map((s, i) => ({ ...defaults[i], ...s }))
    : defaults;
  const activeIdx = stored
    ? Math.min(Number(stored.activeScenario) || 0, scenarios.length - 1)
    : 0;

  const scenario = scenarios[activeIdx] || scenarios[0];
  if (!scenario) {
    return { qualityScore: null, cocReturn: null };
  }

  const qualityPrefs = {
    targetCOC: parseFloat(calculatorDefaults.targetCOC) || 25,
    targetPayback: parseFloat(calculatorDefaults.targetPayback) || 4
  };

  const analysis = analyzeDealScenario(scenario, qualityPrefs);
  return {
    qualityScore: analysis.qualityScore,
    cocReturn: analysis.coc
  };
}
