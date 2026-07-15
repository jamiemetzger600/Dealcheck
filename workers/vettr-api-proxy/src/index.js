/**
 * Stable public proxy for Vettr local API.
 * Pages / extension call this workers.dev URL (never changes).
 * TUNNEL_ORIGIN env points at the current Cloudflare quick-tunnel URL
 * and can be updated without redeploying Pages.
 */
export default {
  async fetch(request, env) {
    const origin = (env.TUNNEL_ORIGIN || '').replace(/\/+$/, '');
    if (!origin) {
      return new Response(
        JSON.stringify({
          error: 'TUNNEL_ORIGIN not configured',
          hint: 'Local tunnel sync has not set the Mac tunnel URL yet',
        }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }

    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, origin);

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('host', target.host);
    // Cloudflare / proxy hop-by-hop cleanup
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('true-client-ip');

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
      // @ts-ignore – required for streaming bodies in Workers
      init.duplex = 'half';
    }

    try {
      return await fetch(target.toString(), init);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Upstream tunnel unreachable',
          detail: String(err && err.message ? err.message : err),
          origin,
        }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }
  },
};
