import http from 'node:http';
import https from 'node:https';

const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'proxy-connection']);

/** Stream the original API request and response (including binary PDFs) without JSON parsing. */
export function createApiProxy(origin) {
  const upstream = new URL(origin);
  if (!['http:', 'https:'].includes(upstream.protocol)) throw new Error('Unsupported backend protocol');
  const client = upstream.protocol === 'https:' ? https : http;

  return (req, res) => {
    const target = new URL(req.originalUrl || req.url, upstream);
    if (target.origin !== upstream.origin || !target.pathname.startsWith('/api/')) {
      res.status(400).json({ success: false, error: { message: 'Invalid API path' } });
      return;
    }
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP.has(k.toLowerCase()) && k.toLowerCase() !== 'host' &&
          !k.toLowerCase().startsWith('x-forwarded-')) headers[k] = v;
    }
    headers.host = upstream.host;
    // A same-origin browser request remains same-origin across this reverse proxy.
    // Preserve foreign origins so Spring can continue rejecting them.
    if (req.get('origin') === `${req.protocol}://${req.get('host')}`) {
      headers.origin = upstream.origin;
    }
    headers['x-forwarded-proto'] = req.protocol;
    headers['x-forwarded-host'] = req.get('host');
    headers['x-forwarded-for'] = req.socket.remoteAddress || '';

    const targetRequest = client.request(target, {
      method: req.method,
      headers,
      timeout: 30000,
    }, (targetResponse) => {
      // Preserve backend HTTP codes, headers and body, but remove hop-by-hop headers.
      const outgoing = {};
      for (const [key, value] of Object.entries(targetResponse.headers)) {
        if (!HOP.has(key.toLowerCase())) outgoing[key] = value;
      }
      res.writeHead(targetResponse.statusCode || 502, outgoing);
      targetResponse.pipe(res);
    });
    targetRequest.on('timeout', () => targetRequest.destroy(new Error('Backend timed out')));
    targetRequest.on('error', () => {
      if (!res.headersSent) res.status(502).json({ success: false, error: { code: 'BAD_GATEWAY', message: 'Hospital API is unavailable' } });
      else res.destroy();
    });
    req.on('aborted', () => targetRequest.destroy());
    req.pipe(targetRequest);
  };
}
