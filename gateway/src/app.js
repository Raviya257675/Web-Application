import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { authenticateWithSpring } from './upstream.js';
import { createApiProxy } from './proxy.js';

const CATEGORIES = new Set(['GENERAL', 'APPOINTMENT', 'BILLING', 'TECHNICAL', 'SUGGESTION']);
const STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED']);
const apiError = (res, status, message) => res.status(status).json({ success: false, error: { message } });

export function createApp({ backendOrigin, staticDir, publicDir, store }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false); // Never trust unverified client IP forwarding headers.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        frameSrc: ["https://www.google.com"],
        objectSrc: ["'none'"],
      },
    },
  }));

  const generalLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 400, standardHeaders: 'draft-7', legacyHeaders: false });
  const engageLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

  app.get('/health', async (_req, res) => {
    try {
      const response = await fetch(new URL('/api/public/stats', backendOrigin), { signal: AbortSignal.timeout(3000) });
      res.status(response.ok ? 200 : 503).json({ gateway: 'UP', springBoot: response.ok ? 'UP' : 'DOWN' });
    } catch {
      res.status(503).json({ gateway: 'UP', springBoot: 'DOWN' });
    }
  });

  // All existing hospital APIs are passed to Spring unchanged (Authorization, PDF, status codes).
  app.use('/api', generalLimit, createApiProxy(backendOrigin));

  // Only the engagement routes parse JSON; API proxy bodies remain raw/streaming.
  app.use('/engage', engageLimit, express.json({ limit: '16kb', type: 'application/json' }));
  async function requireIdentity(req, res, next) {
    const result = await authenticateWithSpring(req.get('authorization'), backendOrigin);
    if (!result.user) return apiError(res, result.status, result.error);
    req.identity = result.user;
    next();
  }
  const requireAdmin = (req, res, next) => req.identity.role === 'ADMIN'
    ? next() : apiError(res, 403, 'Administrator access required');

  app.post('/engage/feedback', requireIdentity, async (req, res, next) => {
    const { category, subject, message } = req.body || {};
    if (!CATEGORIES.has(category) || typeof subject !== 'string' || typeof message !== 'string' ||
        !subject.trim() || subject.trim().length > 120 || !message.trim() || message.trim().length > 2000) {
      return apiError(res, 400, 'Category, subject (1–120 chars), and message (1–2000 chars) are required');
    }
    try {
      const item = await store.add(req.identity, {
        category, subject: subject.trim(), message: message.trim(),
      });
      return res.status(201).json({ success: true, data: item });
    } catch (error) { return next(error); }
  });

  app.get('/engage/feedback/mine', requireIdentity, (req, res) =>
    res.json({ success: true, data: store.listFor({ ...req.identity, role: 'PATIENT' }) }));
  app.get('/engage/feedback', requireIdentity, requireAdmin, (req, res) =>
    res.json({ success: true, data: store.listFor(req.identity) }));
  app.patch('/engage/feedback/:id', requireIdentity, requireAdmin, async (req, res, next) => {
    if (!STATUSES.has(req.body?.status) || !/^[0-9a-f-]{36}$/i.test(req.params.id)) {
      return apiError(res, 400, 'Valid feedback ID and status required');
    }
    try {
      const item = await store.updateStatus(req.params.id, req.body.status);
      return item ? res.json({ success: true, data: item }) : apiError(res, 404, 'Feedback not found');
    } catch (error) { return next(error); }
  });

  // Gateway-owned support interface, using the SAME logged-in Spring session as React.
  app.get('/support', (_req, res) => res.sendFile(join(publicDir, 'support.html')));
  app.use('/gateway', express.static(publicDir, { fallthrough: false, index: false }));

  // A separate support link is injected into the compiled React shell; no existing React code is edited.
  const spaIndex = join(staticDir, 'index.html');
  app.use(express.static(staticDir, { index: false, fallthrough: true, maxAge: '1h' }));
  app.get('*', async (req, res, next) => {
    if (req.path.includes('.') || req.path.startsWith('/engage/') || req.path.startsWith('/api/')) {
      return apiError(res, 404, 'Not found');
    }
    try {
      const html = await readFile(spaIndex, 'utf8');
      res.type('html').send(html.replace('</head>', '<script defer src="/gateway/support-link.js"></script>\n</head>'));
    } catch (error) { next(error); }
  });

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.too.large') return apiError(res, 413, 'Feedback request too large');
    if (error instanceof SyntaxError && 'body' in error) return apiError(res, 400, 'Invalid JSON');
    console.error('[gateway]', error.message);
    return apiError(res, 500, 'Gateway operation failed');
  });
  return app;
}
