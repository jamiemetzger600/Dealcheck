/**
 * Industry DD packs: Generic base + researched vertical overlays.
 * Wave 2 ships: generic, restaurant, healthcare, saas, services.
 * Other keys are matched but fall back to generic until their packs land.
 */
import { BUSINESS_ACQUISITION_DD_TEMPLATE } from './ddBusinessTemplate.js';

/** @typedef {{ title: string, requestsDocument?: boolean, description?: string }} DdItemDef */
/** @typedef {{ name: string, items: DdItemDef[] }} DdGroupDef */
/** @typedef {{ industryKey: string, name: string, assetType?: string, groups: DdGroupDef[] }} DdTemplateDef */

/** Append-only overlays: same group name merges items; new names add groups. */
const OVERLAYS = {
  restaurant: {
    industryKey: 'restaurant',
    name: 'Restaurant / Food Service DD',
    groups: [
      {
        name: 'Financial & QoE',
        items: [
          { title: 'Food cost % and COGS by period (12–24 months)', requestsDocument: true },
          { title: 'Sales by daypart / category (POS reports)', requestsDocument: true },
          { title: 'Tip pooling / payroll tax compliance summary', requestsDocument: false }
        ]
      },
      {
        name: 'Licenses & Permits',
        items: [
          { title: 'Health department permit and latest inspection', requestsDocument: true },
          { title: 'Liquor license status and transferability', requestsDocument: true },
          { title: 'Business / occupancy / fire permits', requestsDocument: true }
        ]
      },
      {
        name: 'Operations',
        items: [
          { title: 'POS system and transfer/export plan', requestsDocument: false },
          { title: 'Food distributor / supplier contracts', requestsDocument: true },
          { title: 'Hood / grease trap / pest control contracts', requestsDocument: true }
        ]
      },
      {
        name: 'Real Estate & Facilities',
        items: [
          { title: 'Lease assignment / landlord consent requirements', requestsDocument: true },
          { title: 'Kitchen equipment owned vs leased schedule', requestsDocument: true }
        ]
      }
    ]
  },
  healthcare: {
    industryKey: 'healthcare',
    name: 'Healthcare / Dental / MedSpa DD',
    groups: [
      {
        name: 'Financial & QoE',
        items: [
          { title: 'Payer mix and top payer contracts', requestsDocument: true },
          { title: 'Collections / AR by payer aging', requestsDocument: true },
          { title: 'Provider production reports (if applicable)', requestsDocument: true }
        ]
      },
      {
        name: 'Regulatory & Compliance',
        items: [
          { title: 'State / board licenses for practice and providers', requestsDocument: true },
          { title: 'HIPAA policies and BAA inventory', requestsDocument: true },
          { title: 'DEA / controlled substance licenses (if Rx)', requestsDocument: true },
          { title: 'Credentialing / payer enrollment status', requestsDocument: true }
        ]
      },
      {
        name: 'Insurance',
        items: [
          { title: 'Malpractice / professional liability and claims history', requestsDocument: true }
        ]
      },
      {
        name: 'Operations',
        items: [
          { title: 'EHR / practice management system and data export plan', requestsDocument: true },
          { title: 'Patient records transfer protocol', requestsDocument: false }
        ]
      },
      {
        name: 'HR & Benefits',
        items: [
          { title: 'Associate / provider employment and non-compete agreements', requestsDocument: true }
        ]
      }
    ]
  },
  saas: {
    industryKey: 'saas',
    name: 'SaaS / Software DD',
    groups: [
      {
        name: 'Financial & QoE',
        items: [
          { title: 'ARR / MRR bridge and cohort retention', requestsDocument: true },
          { title: 'Churn, NRR, and logo vs revenue retention', requestsDocument: true },
          { title: 'Deferred revenue / contract liability schedule', requestsDocument: true }
        ]
      },
      {
        name: 'Customer & Revenue',
        items: [
          { title: 'Top customers, concentration, and renewal calendar', requestsDocument: true },
          { title: 'Sample MSA / SLA / order forms', requestsDocument: true }
        ]
      },
      {
        name: 'Legal & Corporate',
        items: [
          { title: 'IP assignments (employees and contractors)', requestsDocument: true },
          { title: 'Open-source / license compliance summary', requestsDocument: false }
        ]
      },
      {
        name: 'IT & Systems',
        items: [
          { title: 'SOC 2 / security questionnaire and pen test summary', requestsDocument: true },
          { title: 'Source code access / escrow / repo ownership', requestsDocument: true },
          { title: 'Infrastructure / cloud spend and vendor lock-in', requestsDocument: true },
          { title: 'Key-person / bus-factor engineering risk', requestsDocument: false }
        ]
      }
    ]
  },
  services: {
    industryKey: 'services',
    name: 'Professional / Field Services DD',
    groups: [
      {
        name: 'Financial & QoE',
        items: [
          { title: 'Recurring maintenance / contract backlog schedule', requestsDocument: true },
          { title: 'WIP / unbilled jobs and retainage', requestsDocument: true },
          { title: 'Technician utilization / capacity metrics', requestsDocument: false }
        ]
      },
      {
        name: 'Operations',
        items: [
          { title: 'Vehicle and equipment fleet list with liens', requestsDocument: true },
          { title: 'Dispatch / FSM software and data export', requestsDocument: false }
        ]
      },
      {
        name: 'Legal & Corporate',
        items: [
          { title: 'Trade licenses, bonding, and certificates of insurance', requestsDocument: true },
          { title: 'Customer contract terms and termination rights', requestsDocument: true }
        ]
      },
      {
        name: 'Customer & Revenue',
        items: [
          { title: 'Customer concentration and top account retention', requestsDocument: true }
        ]
      },
      {
        name: 'HR & Benefits',
        items: [
          { title: 'Technician / crew non-solicit and hiring pipeline', requestsDocument: false }
        ]
      }
    ]
  }
};

/** Wave 2 industry keys with full packs (plus generic). */
export const WAVE2_INDUSTRY_KEYS = ['generic', 'restaurant', 'healthcare', 'saas', 'services'];

/**
 * Merge base groups with overlay: append items into matching group names, else add groups.
 * @param {DdGroupDef[]} baseGroups
 * @param {DdGroupDef[]} overlayGroups
 */
export function mergeTemplateGroups(baseGroups, overlayGroups = []) {
  const merged = baseGroups.map((g) => ({
    name: g.name,
    items: [...(g.items || [])]
  }));

  for (const og of overlayGroups) {
    const existing = merged.find(
      (g) => g.name.toLowerCase() === String(og.name || '').toLowerCase()
    );
    if (existing) {
      for (const item of og.items || []) {
        const dup = existing.items.some(
          (i) => i.title.toLowerCase() === String(item.title || '').toLowerCase()
        );
        if (!dup) existing.items.push({ ...item });
      }
    } else {
      merged.push({
        name: og.name,
        items: (og.items || []).map((i) => ({ ...i }))
      });
    }
  }
  return merged;
}

/**
 * @param {string} industryKey
 * @returns {DdTemplateDef}
 */
export function buildDdTemplateForIndustry(industryKey) {
  const key = WAVE2_INDUSTRY_KEYS.includes(industryKey) ? industryKey : 'generic';
  const base = BUSINESS_ACQUISITION_DD_TEMPLATE;

  if (key === 'generic') {
    return {
      industryKey: 'generic',
      name: base.name,
      assetType: base.assetType || 'business',
      groups: base.groups.map((g) => ({
        name: g.name,
        items: g.items.map((i) => ({ ...i }))
      }))
    };
  }

  const overlay = OVERLAYS[key];
  return {
    industryKey: key,
    name: overlay.name,
    assetType: 'business',
    groups: mergeTemplateGroups(base.groups, overlay.groups)
  };
}

export function listWave2TemplateDefs() {
  return WAVE2_INDUSTRY_KEYS.map((key) => buildDdTemplateForIndustry(key));
}
