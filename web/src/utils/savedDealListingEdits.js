function listingDateInputValue(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (/^\d{10}$/.test(s) || /^\d{13}$/.test(s)) {
    const n = s.length === 10 ? Number(s) * 1000 : Number(s);
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return s;
}

export function listingEditsFromDeal(d) {
  if (!d) {
    return {
      name: '',
      description: '',
      url: '',
      askingPrice: '',
      ebitda: '',
      revenue: '',
      location: '',
      city: '',
      state: '',
      county: '',
      country: '',
      industry: '',
      yearsEstablished: '',
      franchise: '',
      remote: '',
      source: '',
      sourceType: '',
      discoveredAt: ''
    };
  }
  return {
    name: d.name || '',
    description: d.description || '',
    url: d.url || '',
    askingPrice: d.askingPrice != null && d.askingPrice !== '' ? String(d.askingPrice) : '',
    ebitda: d.ebitda != null && d.ebitda !== '' ? String(d.ebitda) : '',
    revenue: d.revenue != null && d.revenue !== '' ? String(d.revenue) : '',
    location: d.location || '',
    city: d.city || '',
    state: d.state || '',
    county: d.county || '',
    country: d.country || '',
    industry: d.industry || '',
    yearsEstablished: d.yearsEstablished != null && d.yearsEstablished !== '' ? String(d.yearsEstablished) : '',
    franchise: d.franchise != null && d.franchise !== '' ? String(d.franchise) : '',
    remote: d.remote != null && d.remote !== '' ? String(d.remote) : '',
    source: d.source || '',
    sourceType: d.sourceType || '',
    discoveredAt: listingDateInputValue(d.discoveredAt)
  };
}

export function buildSavedDealListingPayload(le, br, dealFb) {
  const num = (v) => {
    if (v === '' || v == null) return null;
    const n = parseFloat(String(v).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  };
  const nameTrim = (le.name || '').trim();
  return {
    name: nameTrim || dealFb.name || 'Untitled deal',
    description: le.description,
    url: (le.url || '').trim() || null,
    askingPrice: num(le.askingPrice),
    ebitda: num(le.ebitda),
    revenue: num(le.revenue),
    location: (le.location || '').trim() || null,
    city: (le.city || '').trim() || null,
    state: (le.state || '').trim() || null,
    county: (le.county || '').trim() || null,
    country: (le.country || '').trim() || null,
    industry: (le.industry || '').trim() || null,
    yearsEstablished: (le.yearsEstablished || '').trim() || null,
    franchise: (le.franchise || '').trim() || null,
    remote: (le.remote || '').trim() || null,
    source: (le.source || '').trim() || null,
    sourceType: (le.sourceType || '').trim() || null,
    discoveredAt: (le.discoveredAt || '').trim() || null,
    brokerName: br.name,
    brokerCompany: br.company,
    brokerPhone: br.phone,
    brokerEmail: br.email
  };
}

export function mergeListingEditsIntoDeal(deal, listingEdits, brokerInfo) {
  if (!deal) return deal;
  const num = (raw, fallback) => {
    const n = parseFloat(String(raw ?? '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : fallback;
  };
  const nameTrim = (listingEdits?.name || '').trim();
  const br = brokerInfo || {};
  return {
    ...deal,
    name: nameTrim || deal.name,
    description: listingEdits.description,
    url: (listingEdits.url || '').trim() || deal.url,
    askingPrice: num(listingEdits.askingPrice, deal.askingPrice),
    ebitda: num(listingEdits.ebitda, deal.ebitda),
    revenue: num(listingEdits.revenue, deal.revenue),
    location: listingEdits.location,
    city: listingEdits.city,
    state: listingEdits.state,
    county: listingEdits.county,
    country: listingEdits.country,
    industry: listingEdits.industry,
    yearsEstablished: listingEdits.yearsEstablished || deal.yearsEstablished,
    franchise: listingEdits.franchise || deal.franchise,
    remote: listingEdits.remote || deal.remote,
    source: listingEdits.source || deal.source,
    sourceType: listingEdits.sourceType || deal.sourceType,
    discoveredAt: listingEdits.discoveredAt || deal.discoveredAt,
    brokerName: br.name,
    brokerCompany: br.company,
    brokerPhone: br.phone,
    brokerEmail: br.email
  };
}
