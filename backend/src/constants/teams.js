/** Soft seat cap before billing (Phase 1). */
export const TEAM_SEAT_CAP = 5;

export const TEAM_ROLES = ['admin', 'member', 'viewer'];

/** Stages that require Admin approval when changed by a non-admin on a team deal. */
export const GATED_PIPELINE_STAGES = [
  'LOI Sent',
  'LOI Signed',
  'Passed On Deal',
  'Starting Due Diligence'
];

export const INVITE_TTL_DAYS = 14;

/** Allowed expiry presets (days) for shareable invite links. */
export const INVITE_EXPIRES_DAY_OPTIONS = [1, 3, 7, 14, 30];

export function isGatedStage(stage) {
  const trimmed = (stage || '').trim();
  return GATED_PIPELINE_STAGES.includes(trimmed);
}
