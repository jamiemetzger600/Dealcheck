/**
 * HttpOnly session cookie so login survives localStorage wipes and refresh.
 * Dual-store with the JWT in the JSON body (Bearer) for the Chrome extension.
 */

export const AUTH_COOKIE = 'vettr_token';

export function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[key] = part.slice(i + 1).trim();
    }
  }
  return out;
}

export function jwtTtlMs() {
  const raw = String(process.env.JWT_EXPIRES_IN || '30d').trim();
  const m = raw.match(/^(\d+)([smhd])$/i);
  if (!m) return 30 * 86400000;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * (mult[unit] || 86400000);
}

function requestIsHttps(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return proto === 'https' || Boolean(req.secure);
}

function isCrossSite(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const reqHost = String(req.headers.host || '').split(',')[0].trim();
    return Boolean(originHost && reqHost && originHost !== reqHost);
  } catch {
    return false;
  }
}

export function authCookieOptions(req) {
  const https = requestIsHttps(req);
  const crossSite = isCrossSite(req);
  const sameSite = crossSite ? 'None' : 'Lax';
  const secure = https || sameSite === 'None';
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite,
    maxAgeMs: jwtTtlMs()
  };
}

function serializeCookie(name, value, opts) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || '/'}`];
  if (opts.maxAgeMs != null) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeMs / 1000))}`);
  }
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}

export function setAuthCookie(res, token, req) {
  const opts = authCookieOptions(req);
  res.append('Set-Cookie', serializeCookie(AUTH_COOKIE, token, opts));
  console.log('[auth] session cookie set', {
    sameSite: opts.sameSite,
    secure: opts.secure,
    maxAgeSec: Math.floor(opts.maxAgeMs / 1000)
  });
}

export function clearAuthCookie(res) {
  const base = { path: '/', httpOnly: true, maxAgeMs: 0 };
  res.append('Set-Cookie', serializeCookie(AUTH_COOKIE, '', { ...base, sameSite: 'Lax', secure: false }));
  res.append('Set-Cookie', serializeCookie(AUTH_COOKIE, '', { ...base, sameSite: 'None', secure: true }));
  console.log('[auth] session cookie cleared');
}

export function readAuthToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const bearer = header.substring(7).trim();
    if (bearer) return { token: bearer, source: 'bearer' };
  }
  const cookies = req.cookies || parseCookieHeader(req.headers.cookie);
  const cookieTok = cookies[AUTH_COOKIE] || cookies.token;
  if (cookieTok) return { token: cookieTok, source: 'cookie' };
  return { token: null, source: null };
}
