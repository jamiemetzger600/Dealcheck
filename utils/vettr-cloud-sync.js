/**
 * Vettr cloud sync — map extension deals ↔ backend saved_deals API.
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

  var STATUS_MAP = {
    new: 'none',
    reviewing: 'warm',
    contacted: 'warm',
    'due-diligence': 'hot',
    offer: 'hot',
    passed: 'pass'
  };

  function normalizeListingUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var u = url.trim();
    return u.split('#')[0].toLowerCase();
  }

  function extensionDealIdFromUrl(url) {
    var n = normalizeListingUrl(url);
    if (!n) return '';
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

  function parseTs(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number' && !isNaN(val)) return val;
    var t = Date.parse(val);
    return isNaN(t) ? 0 : t;
  }

  function normalizeStatus(status) {
    if (!status) return 'none';
    return STATUS_MAP[status] || status;
  }

  function parseProgressHistory(ph) {
    if (!ph) return [];
    if (Array.isArray(ph)) return ph;
    if (typeof ph === 'string') {
      try {
        var parsed = JSON.parse(ph);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function parseCalculatorState(cs) {
    if (!cs) return null;
    if (typeof cs === 'object') return cs;
    if (typeof cs === 'string') {
      try {
        return JSON.parse(cs);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function resolveDealId(localDeal) {
    if (!localDeal) return 'manual_' + Date.now();
    if (localDeal.dealId) return String(localDeal.dealId);
    if (localDeal.id && String(localDeal.id).match(/^(manual_|ext_|quick_)/)) return String(localDeal.id);
    if (localDeal.url) {
      var fromUrl = extensionDealIdFromUrl(localDeal.url);
      if (fromUrl) return fromUrl;
    }
    return 'manual_' + (localDeal.savedAt || Date.now());
  }

  function buildScenarioFromExtension(inputs, overrides) {
    var o = overrides || {};
    var useOverride = Boolean(o.actualPrice);
    return {
      ebitda: digitsOnly(inputs.ebitda || inputs.ebitdaSDE),
      askingPrice: digitsOnly(inputs.asking || inputs.askingPrice),
      dscr: String(inputs.dscr != null && inputs.dscr !== '' ? inputs.dscr : (inputs.targetDSCR != null ? inputs.targetDSCR : '1.25')),
      sbaPercent: String(inputs.sbaPercent != null && inputs.sbaPercent !== '' ? inputs.sbaPercent : '80'),
      sbaRate: String(inputs.bankRate != null && inputs.bankRate !== '' ? inputs.bankRate : '9.25'),
      sbaTerm: String(inputs.bankTerm != null && inputs.bankTerm !== '' ? inputs.bankTerm : '10'),
      equityPercent: String(inputs.downPercent != null && inputs.downPercent !== '' ? inputs.downPercent : '10'),
      salary: digitsOnly(inputs.targetSalary || inputs.targetOwnerSalary),
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

  function buildCalculatorState(inputs, overrides, userPreferences, existing) {
    if (existing && existing.scenarios) return existing;
    var prefs = userPreferences || {};
    var s0 = buildScenarioFromExtension(inputs || {}, overrides);
    return {
      scenarios: [cloneScenario(s0), cloneScenario(s0), cloneScenario(s0)],
      activeScenario: 0,
      targetCOC: String(prefs.targetCOC != null ? prefs.targetCOC : 25),
      ui: JSON.parse(JSON.stringify(DEFAULT_CALC_UI))
    };
  }

  function brokerFromLocal(localDeal) {
    var b = localDeal.brokerInfo || localDeal.broker || {};
    var line = null;
    if (b.name && b.company) line = b.name + ' (' + b.company + ')';
    else line = b.name || b.company || localDeal.broker || null;
    return {
      broker: line,
      brokerName: b.name || null,
      brokerCompany: b.company || null,
      brokerEmail: b.email || null,
      brokerPhone: b.phone || null
    };
  }

  function buildManualDealRequest(manualDeal) {
    var broker = brokerFromLocal(manualDeal);
    var dealId = manualDeal.id && String(manualDeal.id).startsWith('manual_')
      ? manualDeal.id
      : (manualDeal.dealId || ('manual_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)));
    var city = manualDeal.city || '';
    var state = manualDeal.state || '';
    var location = manualDeal.location || (city && state ? city + ', ' + state : city || state || null);
    return {
      dealId: dealId,
      name: manualDeal.name || 'Manual deal',
      url: manualDeal.url || null,
      description: manualDeal.description || null,
      broker: broker.broker,
      brokerName: manualDeal.contactName || broker.brokerName,
      brokerCompany: broker.brokerCompany,
      brokerEmail: manualDeal.contactEmail || broker.brokerEmail,
      brokerPhone: manualDeal.contactPhone || broker.brokerPhone,
      source: manualDeal.source || 'Manual deal',
      sourceType: 'manual',
      discoveredAt: manualDeal.discoveredAt || Date.now(),
      askingPrice: parseMoneyNumber(manualDeal.askingPrice),
      ebitda: parseMoneyNumber(manualDeal.ebitda),
      revenue: parseMoneyNumber(manualDeal.revenue),
      location: location,
      city: city || null,
      state: state || null,
      county: null,
      country: null,
      industry: manualDeal.industry || null,
      yearsEstablished: null,
      franchise: null,
      remote: null,
      listingId: null,
      notes: manualDeal.notes || manualDeal.sourceNotes || '',
      status: manualDeal.status || 'none',
      progressStage: manualDeal.progressStage || null,
      calculatorState: manualDeal.calculatorState || null
    };
  }

  function buildAggregatorSavedDealRequest(deal) {
    var broker = brokerFromLocal(deal);
    var url = deal.url || '';
    return {
      dealId: deal.id || (url ? extensionDealIdFromUrl(url) : resolveDealId(deal)),
      name: deal.name || 'Unnamed Deal',
      url: url || null,
      description: deal.description || null,
      broker: broker.broker,
      brokerName: broker.brokerName,
      brokerCompany: broker.brokerCompany,
      brokerEmail: broker.brokerEmail,
      brokerPhone: broker.brokerPhone,
      source: deal.source || 'Deal Aggregator',
      sourceType: deal.sourceType || 'aggregator',
      discoveredAt: deal.discoveredAt || Date.now(),
      askingPrice: parseMoneyNumber(deal.askingPrice),
      ebitda: parseMoneyNumber(deal.ebitda),
      revenue: parseMoneyNumber(deal.revenue),
      location: deal.location || null,
      city: deal.city || null,
      state: deal.state || null,
      county: deal.county || null,
      country: deal.country || null,
      industry: deal.industry || null,
      yearsEstablished: deal.yearsEstablished || null,
      franchise: deal.franchise || null,
      remote: deal.remote || null,
      listingId: deal.listingId || null,
      notes: deal.notes || '',
      status: deal.status || 'none',
      progressStage: deal.progressStage || null,
      calculatorState: deal.calculatorState || null
    };
  }

  function buildDashboardSavedDealRequest(savedDeal, ctx) {
    var inputs = (savedDeal && savedDeal.inputs) || {};
    var broker = brokerFromLocal(savedDeal);
    var url = (savedDeal && savedDeal.url) || '';
    var asking = parseMoneyNumber(inputs.asking || inputs.askingPrice) != null
      ? parseMoneyNumber(inputs.asking || inputs.askingPrice)
      : parseMoneyNumber(savedDeal.askingPrice);
    var ebitda = parseMoneyNumber(inputs.ebitda || inputs.ebitdaSDE) != null
      ? parseMoneyNumber(inputs.ebitda || inputs.ebitdaSDE)
      : parseMoneyNumber(savedDeal.ebitda);
    var discoveredAt = parseTs(savedDeal.savedAt) || Date.now();
    var calc = buildCalculatorState(inputs, (ctx && ctx.overrides) || {}, (ctx && ctx.userPreferences) || {}, savedDeal.calculatorState);

    if (savedDeal.sourceType === 'manual' || (savedDeal.dealId && String(savedDeal.dealId).startsWith('manual_'))) {
      return buildManualDealRequest(Object.assign({}, savedDeal, {
        askingPrice: asking,
        ebitda: ebitda,
        calculatorState: calc
      }));
    }

    return {
      dealId: resolveDealId(savedDeal),
      name: savedDeal.name || 'Saved deal',
      url: url || null,
      description: savedDeal.description || null,
      broker: broker.broker,
      brokerName: broker.brokerName,
      brokerCompany: broker.brokerCompany,
      brokerEmail: broker.brokerEmail,
      brokerPhone: broker.brokerPhone,
      source: savedDeal.source || 'chrome_extension',
      sourceType: savedDeal.sourceType || 'chrome_extension',
      discoveredAt: discoveredAt,
      askingPrice: asking,
      ebitda: ebitda,
      revenue: parseMoneyNumber(savedDeal.revenue),
      location: savedDeal.location || null,
      city: savedDeal.city || null,
      state: savedDeal.state || null,
      county: savedDeal.county || null,
      country: savedDeal.country || null,
      industry: savedDeal.industry || null,
      yearsEstablished: savedDeal.yearsEstablished || null,
      franchise: savedDeal.franchise || null,
      remote: savedDeal.remote || null,
      listingId: savedDeal.listingId || null,
      notes: savedDeal.notes || '',
      status: savedDeal.status || 'none',
      progressStage: savedDeal.progressStage || null,
      calculatorState: calc
    };
  }

  function buildSaveDealRequest(dealData, ctx) {
    if (dealData && dealData.manualEntry) return buildManualDealRequest(dealData);
    if (dealData && dealData.sourceType === 'manual') return buildManualDealRequest(dealData);
    if (dealData && dealData.inputs && (dealData.inputs.businessName || dealData.inputs.ebitdaSDE != null)) {
      return buildDashboardSavedDealRequest(dealData, ctx);
    }

    var pageUrl = (ctx && ctx.pageUrl) || (dealData && dealData.url) || '';
    var lastScrape = (ctx && ctx.lastScrapeData) || {};
    var prefs = (ctx && ctx.userPreferences) || {};
    var overrides = (ctx && ctx.overrides) || {};
    var inputs = (dealData && dealData.inputs) || {};
    var broker = brokerFromLocal(dealData);

    var asking = parseMoneyNumber(inputs.asking) != null ? parseMoneyNumber(inputs.asking) : (lastScrape.askingPrice || null);
    var ebitda = parseMoneyNumber(inputs.ebitda) != null ? parseMoneyNumber(inputs.ebitda) : (lastScrape.ebitda || null);
    var discoveredAt = dealData.savedAt ? Date.parse(dealData.savedAt) : Date.now();
    if (isNaN(discoveredAt)) discoveredAt = Date.now();

    return {
      dealId: extensionDealIdFromUrl(pageUrl) || resolveDealId(dealData),
      name: (dealData && dealData.name) || 'Saved deal',
      url: pageUrl || null,
      description: (dealData && dealData.description) || lastScrape.description || null,
      broker: broker.broker,
      brokerName: broker.brokerName,
      brokerCompany: broker.brokerCompany,
      brokerEmail: broker.brokerEmail,
      brokerPhone: broker.brokerPhone,
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
      status: (dealData && dealData.status) || 'none',
      progressStage: null,
      calculatorState: buildCalculatorState(inputs, overrides, prefs, dealData && dealData.calculatorState)
    };
  }

  function buildUpdateRequest(localDeal) {
    return {
      notes: localDeal.notes != null ? localDeal.notes : '',
      status: localDeal.status || 'none',
      progressStage: localDeal.progressStage || null,
      progressHistory: localDeal.progressHistory || [],
      calculatorState: localDeal.calculatorState || undefined,
      name: localDeal.name,
      askingPrice: parseMoneyNumber(localDeal.inputs && (localDeal.inputs.askingPrice || localDeal.inputs.asking)),
      ebitda: parseMoneyNumber(localDeal.inputs && (localDeal.inputs.ebitdaSDE || localDeal.inputs.ebitda))
    };
  }

  function cloudDealToExtensionDeal(row) {
    if (!row) return null;
    var calc = parseCalculatorState(row.calculator_state || row.calculatorState);
    var inputs = {};
    if (calc && calc.scenarios && calc.scenarios.length) {
      var s = calc.scenarios[calc.activeScenario || 0] || calc.scenarios[0];
      inputs = {
        ebitda: s.ebitda || '',
        asking: s.askingPrice || '',
        askingPrice: parseMoneyNumber(s.askingPrice),
        ebitdaSDE: parseMoneyNumber(s.ebitda),
        sbaPercent: s.sbaPercent,
        bankRate: s.sbaRate,
        bankTerm: s.sbaTerm,
        downPercent: s.equityPercent,
        targetSalary: s.salary,
        sellerNoteEnabled: s.sellerEnabled,
        sellerPercent: s.sellerPercent,
        sellerRate: s.sellerRate,
        sellerStandby: s.sellerStandby,
        sellerPaymentType: s.sellerPaymentType,
        dscr: s.dscr,
        businessName: row.name
      };
    } else {
      inputs = {
        businessName: row.name,
        askingPrice: row.asking_price != null ? row.asking_price : null,
        ebitdaSDE: row.ebitda != null ? row.ebitda : null,
        targetOwnerSalary: 0,
        targetDSCR: 1.25
      };
    }

    var brokerObj = null;
    if (row.broker_name || row.broker_email || row.broker_phone) {
      brokerObj = {
        name: row.broker_name || '',
        company: row.broker_company || '',
        email: row.broker_email || '',
        phone: row.broker_phone || ''
      };
    }

    return {
      name: row.name,
      url: row.url || '',
      savedAt: parseTs(row.saved_at) || Date.now(),
      dealId: row.deal_id,
      vettrId: row.id,
      vettrUpdatedAt: row.updated_at,
      cloudSyncedAt: Date.now(),
      status: normalizeStatus(row.status),
      notes: row.notes || '',
      inputs: inputs,
      results: {},
      location: row.location || row.city || '',
      city: row.city,
      state: row.state,
      industry: row.industry || '',
      source: row.source || '',
      sourceType: row.source_type || row.sourceType,
      description: row.description,
      askingPrice: row.asking_price,
      ebitda: row.ebitda,
      revenue: row.revenue,
      broker: brokerObj,
      brokerInfo: brokerObj,
      progressHistory: parseProgressHistory(row.progress_history || row.progressHistory),
      progressStage: row.progress_stage || row.progressStage,
      calculatorState: calc
    };
  }

  function findCloudMatch(localDeal, cloudRows) {
    if (!localDeal || !cloudRows || !cloudRows.length) return null;
    var did = resolveDealId(localDeal);
    for (var i = 0; i < cloudRows.length; i++) {
      var c = cloudRows[i];
      if (c.deal_id === did) return c;
      if (localDeal.vettrId && c.id === localDeal.vettrId) return c;
    }
    var url = normalizeListingUrl(localDeal.url);
    if (url) {
      for (var j = 0; j < cloudRows.length; j++) {
        if (normalizeListingUrl(cloudRows[j].url) === url) return cloudRows[j];
      }
    }
    return null;
  }

  function findLocalForCloud(cloudRow, localDeals) {
    if (!cloudRow || !localDeals || !localDeals.length) return null;
    for (var i = 0; i < localDeals.length; i++) {
      var local = localDeals[i];
      if (local.vettrId && cloudRow.id && local.vettrId === cloudRow.id) return local;
      if (cloudRow.deal_id && local.dealId === cloudRow.deal_id) return local;
    }
    var curl = normalizeListingUrl(cloudRow.url);
    if (curl) {
      for (var j = 0; j < localDeals.length; j++) {
        if (normalizeListingUrl(localDeals[j].url) === curl) return localDeals[j];
      }
    }
    return null;
  }

  function wasPreviouslySyncedToCloud(localDeal) {
    return Boolean(localDeal && (localDeal.vettrId || localDeal.cloudSyncedAt));
  }

  /** Local deal not on server — drop if it was ever cloud-backed (incl. legacy rows without vettrId). */
  function shouldDropOrphanLocal(localDeal, cloudRows) {
    if (findCloudMatch(localDeal, cloudRows)) return false;
    if (wasPreviouslySyncedToCloud(localDeal)) return true;
    if (localDeal.url && normalizeListingUrl(localDeal.url)) return true;
    if (localDeal.dealId && String(localDeal.dealId).startsWith('ext_')) return true;
    return false;
  }

  function mergeDealsForFullSync(localDeals, cloudRows) {
    localDeals = localDeals || [];
    cloudRows = cloudRows || [];
    var uploads = [];
    var cloudUpdates = [];
    var merged = [];

    for (var c = 0; c < cloudRows.length; c++) {
      var cloud = cloudRows[c];
      var local = findLocalForCloud(cloud, localDeals);
      var fromCloud = cloudDealToExtensionDeal(cloud);
      if (local) {
        var localTs = parseTs(local.vettrUpdatedAt);
        var cloudTs = parseTs(cloud.updated_at);
        if (localTs > cloudTs && local.vettrId) {
          cloudUpdates.push({ local: Object.assign({}, local, fromCloud), vettrId: cloud.id });
          merged.push(Object.assign({}, fromCloud, local));
        } else {
          merged.push(Object.assign({}, local, fromCloud));
        }
      } else {
        merged.push(fromCloud);
      }
    }

    for (var i = 0; i < localDeals.length; i++) {
      var loc = localDeals[i];
      if (findCloudMatch(loc, cloudRows)) continue;

      if (wasPreviouslySyncedToCloud(loc)) {
        console.log('☁️ Sync: removing local deal deleted on server:', loc.name || loc.dealId);
        continue;
      }

      if (shouldDropOrphanLocal(loc, cloudRows)) {
        console.log('☁️ Sync: removing orphan local deal not on server:', loc.name || loc.dealId);
        continue;
      }

      if (!loc.dealId) loc.dealId = resolveDealId(loc);
      uploads.push(loc);
      merged.push(loc);
    }

    return { merged: merged, uploads: uploads, cloudUpdates: cloudUpdates };
  }

  function applySaveResponse(localDeal, apiResponse) {
    if (!localDeal || !apiResponse) return localDeal;
    if (apiResponse.vettrId) localDeal.vettrId = apiResponse.vettrId;
    else if (apiResponse.id) localDeal.vettrId = apiResponse.id;
    else if (apiResponse.dealId) localDeal.vettrId = apiResponse.dealId;
    if (apiResponse.updatedAt) localDeal.vettrUpdatedAt = apiResponse.updatedAt;
    else if (apiResponse.savedAt) localDeal.vettrUpdatedAt = apiResponse.savedAt;
    localDeal.cloudSyncedAt = Date.now();
    if (!localDeal.dealId && apiResponse.deal_id) localDeal.dealId = apiResponse.deal_id;
    return localDeal;
  }

  global.VettrCloudSync = {
    normalizeApiBaseUrl: normalizeApiBaseUrl,
    normalizeListingUrl: normalizeListingUrl,
    extensionDealIdFromUrl: extensionDealIdFromUrl,
    resolveDealId: resolveDealId,
    buildSaveDealRequest: buildSaveDealRequest,
    buildManualDealRequest: buildManualDealRequest,
    buildAggregatorSavedDealRequest: buildAggregatorSavedDealRequest,
    buildDashboardSavedDealRequest: buildDashboardSavedDealRequest,
    buildUpdateRequest: buildUpdateRequest,
    cloudDealToExtensionDeal: cloudDealToExtensionDeal,
    findCloudMatch: findCloudMatch,
    mergeDealsForFullSync: mergeDealsForFullSync,
    applySaveResponse: applySaveResponse,
    parseTs: parseTs
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window);
