/**
 * Build Vettr API payloads for syncing extension saved deals + calculator state
 * to the same backend as the web app (saved_deals.calculator_state).
 * Loaded before content.js / via importScripts in background.
 */
(function (global) {
  'use strict';

  var DEFAULT_CALC_UI = {
    financingOpen: true,
    sbaOpen: true,
    equityOpen: false,
    sellerOpen: true,
    maxOpen: false,
    roiOpen: true,
    targetOfferOpen: true,
    actualOpen: false
  };

  function normalizeListingUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var u = url.trim();
    var withoutHash = u.split('#')[0];
    return withoutHash.toLowerCase();
  }

  function extensionDealIdFromUrl(url) {
    var n = normalizeListingUrl(url);
    var h = 0;
    for (var i = 0; i < n.length; i++) {
      h = ((h << 5) - h + n.charCodeAt(i)) | 0;
    }
    return 'ext_' + (h >>> 0).toString(16);
  }

  function normalizeApiBaseUrl(input) {
    var u = (input || '').trim().replace(/\/+$/, '');
    if (!u) return '';
    if (!/\/api$/i.test(u)) u += '/api';
    return u;
  }

  function digitsOnly(val) {
    if (val == null || val === '') return '';
    return String(val).replace(/[^0-9]/g, '');
  }

  function parseMoneyNumber(val) {
    if (val == null || val === '') return null;
    if (typeof val === 'number' && !isNaN(val)) return Math.round(val);
    var n = parseFloat(String(val).replace(/[$,]/g, ''));
    return isNaN(n) ? null : Math.round(n);
  }

  function buildScenarioFromExtension(inputs, overrides) {
    var o = overrides || {};
    var useOverride = Boolean(o.actualPrice);
    return {
      ebitda: digitsOnly(inputs.ebitda),
      askingPrice: digitsOnly(inputs.asking),
      dscr: String(inputs.dscr != null && inputs.dscr !== '' ? inputs.dscr : '1.25'),
      sbaPercent: String(inputs.sbaPercent != null && inputs.sbaPercent !== '' ? inputs.sbaPercent : '80'),
      sbaRate: String(inputs.bankRate != null && inputs.bankRate !== '' ? inputs.bankRate : '9.25'),
      sbaTerm: String(inputs.bankTerm != null && inputs.bankTerm !== '' ? inputs.bankTerm : '10'),
      equityPercent: String(inputs.downPercent != null && inputs.downPercent !== '' ? inputs.downPercent : '10'),
      salary: digitsOnly(inputs.targetSalary),
      sellerEnabled: Boolean(inputs.sellerNoteEnabled),
      sellerPercent: String(inputs.sellerPercent != null && inputs.sellerPercent !== '' ? inputs.sellerPercent : '10'),
      sellerRate: String(inputs.sellerRate != null && inputs.sellerRate !== '' ? inputs.sellerRate : '6'),
      sellerStandby: inputs.sellerStandby === 'yes' ? 'yes' : 'no',
      sellerPaymentType: inputs.sellerPaymentType === 'interest-only' ? 'interest-only' : 'amortizing',
      usePurchaseOverride: useOverride,
      purchasePrice: useOverride ? digitsOnly(inputs.actualPrice) : '',
      dismissDealOpportunity: false
    };
  }

  function cloneScenario(s) {
    return JSON.parse(JSON.stringify(s));
  }

  function buildCalculatorState(inputs, overrides, userPreferences) {
    var prefs = userPreferences || {};
    var s0 = buildScenarioFromExtension(inputs, overrides);
    var scenarios = [cloneScenario(s0), cloneScenario(s0), cloneScenario(s0)];
    return {
      scenarios: scenarios,
      activeScenario: 0,
      targetCOC: String(prefs.targetCOC != null ? prefs.targetCOC : 25),
      ui: JSON.parse(JSON.stringify(DEFAULT_CALC_UI))
    };
  }

  function buildSaveDealRequest(dealData, ctx) {
    var pageUrl = (ctx && ctx.pageUrl) || (dealData && dealData.url) || '';
    var lastScrape = (ctx && ctx.lastScrapeData) || {};
    var prefs = (ctx && ctx.userPreferences) || {};
    var overrides = (ctx && ctx.overrides) || {};

    var inputs = (dealData && dealData.inputs) || {};
    var broker = (dealData && dealData.brokerInfo) || {};

    var asking = parseMoneyNumber(inputs.asking) != null ? parseMoneyNumber(inputs.asking) : (lastScrape.askingPrice || null);
    var ebitda = parseMoneyNumber(inputs.ebitda) != null ? parseMoneyNumber(inputs.ebitda) : (lastScrape.ebitda || null);

    var brokerLine = null;
    if (broker.name && broker.company) brokerLine = broker.name + ' (' + broker.company + ')';
    else brokerLine = broker.name || broker.company || null;

    var discoveredAt = dealData.savedAt ? Date.parse(dealData.savedAt) : Date.now();
    if (isNaN(discoveredAt)) discoveredAt = Date.now();

    return {
      dealId: extensionDealIdFromUrl(pageUrl),
      name: (dealData && dealData.name) || 'Saved deal',
      url: pageUrl || null,
      description: null,
      broker: brokerLine || null,
      brokerName: broker.name || null,
      brokerCompany: broker.company || null,
      brokerEmail: broker.email || null,
      brokerPhone: broker.phone || null,
      source: lastScrape.platform ? String(lastScrape.platform) : 'chrome_extension',
      sourceType: 'chrome_extension',
      discoveredAt: discoveredAt,
      askingPrice: asking,
      ebitda: ebitda,
      revenue: null,
      location: null,
      city: null,
      state: null,
      county: null,
      country: null,
      industry: null,
      yearsEstablished: null,
      franchise: null,
      remote: null,
      listingId: null,
      notes: (dealData && dealData.notes) || '',
      status: 'none',
      progressStage: null,
      calculatorState: buildCalculatorState(inputs, overrides, prefs)
    };
  }

  global.VettrCloudSync = {
    normalizeApiBaseUrl: normalizeApiBaseUrl,
    extensionDealIdFromUrl: extensionDealIdFromUrl,
    buildSaveDealRequest: buildSaveDealRequest
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window);
