import { suggestedTaskForStage } from './stageTaskSuggestions.js';

const PASSED = new Set(['Passed On Deal']);

/**
 * One next admin step per pipeline state.
 * completeStage: set this when the user marks the step done (only when the
 * step itself is the stage change, e.g. they requested the NDA).
 */
export function adminActionForStage(stage, industryKey = 'generic') {
  const s = String(stage || '').trim();
  if (PASSED.has(s)) return null;

  if (!s) {
    return {
      key: 'request_nda',
      title: 'Request NDA from broker',
      completeStage: 'Requested NDA',
      dueDays: null,
      ctaLabel: 'I requested it'
    };
  }

  if (s === 'Requested NDA') {
    return {
      key: 'follow_nda',
      title: 'Follow up: heard back on the NDA?',
      completeStage: null,
      dueDays: 3,
      ctaLabel: 'I followed up'
    };
  }

  if (s === 'Signed NDA') {
    return {
      key: 'request_cim',
      title: 'Request the CIM from the broker',
      completeStage: null,
      dueDays: null,
      ctaLabel: 'I requested it'
    };
  }

  if (s === 'Review CIM') {
    return {
      key: 'review_cim',
      title: 'Review the CIM',
      completeStage: null,
      dueDays: 2,
      ctaLabel: 'Done'
    };
  }

  const title = suggestedTaskForStage(s, industryKey);
  if (!title) return null;
  return {
    key: `stage:${s}`,
    title,
    completeStage: null,
    dueDays: 1,
    ctaLabel: 'Done'
  };
}

export function adminActionByKey(key) {
  if (key === 'request_nda') return adminActionForStage('');
  if (key === 'follow_nda') return adminActionForStage('Requested NDA');
  if (key === 'request_cim') return adminActionForStage('Signed NDA');
  if (key === 'review_cim') return adminActionForStage('Review CIM');
  if (key && String(key).startsWith('stage:')) {
    return adminActionForStage(String(key).slice(6));
  }
  return null;
}
