import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateWithSpring } from '../src/upstream.js';
const BASE = 'http://localhost:8080';

test('validates bearer tokens against Spring identity and does not trust supplied roles', async () => {
  assert.equal((await authenticateWithSpring('', BASE)).status, 401);
  const result = await authenticateWithSpring('Bearer example.jwt.token', BASE, async (url, opts) => {
    assert.equal(new URL(url).pathname, '/api/auth/me');
    assert.equal(opts.headers.authorization, 'Bearer example.jwt.token');
    return { ok: true, json: async () => ({ success: true, data: { id: 5, role: 'PATIENT', name: 'Test' } }) };
  });
  assert.equal(result.user.role, 'PATIENT');
  assert.equal((await authenticateWithSpring('Bearer example.jwt.token', BASE, async () => ({ ok: false, status: 401 }))).status, 401);
  assert.equal((await authenticateWithSpring('Bearer example.jwt.token', BASE, async () => { throw new Error('offline'); })).status, 502);
});
