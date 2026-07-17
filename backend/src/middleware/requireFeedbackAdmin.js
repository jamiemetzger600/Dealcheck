/**
 * Platform feedback admin allowlist (not team admin).
 * Set FEEDBACK_ADMIN_EMAILS=you@example.com,other@example.com
 */
export function getFeedbackAdminEmails() {
  const raw = process.env.FEEDBACK_ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isFeedbackAdminEmail(email) {
  if (!email) return false;
  const list = getFeedbackAdminEmails();
  if (list.length === 0) return false;
  return list.includes(String(email).trim().toLowerCase());
}

/** Requires authMiddleware first. */
export function requireFeedbackAdmin(req, res, next) {
  const email = req.user?.email;
  if (!isFeedbackAdminEmail(email)) {
    console.warn('[feedback] admin denied for', email || '(no email)');
    return res.status(403).json({ error: 'Feedback admin access required' });
  }
  next();
}
