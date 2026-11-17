import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApiProxy } from '../src/proxy.js';

async function listening(fn) {
  const server = http.createServer(fn);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
const close = (server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

test('streams HTTP status codes, bearer headers, request bodies and binary responses', async () => {
  const spring = await listening((req, res) => {
    if (req.url === '/api/billing/invoice/5/pdf') {
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="invoice.pdf"' });
      return res.end(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]));
    }
    const parts = [];
    req.on('data', (chunk) => parts.push(chunk));
    req.on('end', () => {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authorization: req.headers.authorization, forwarded: req.headers['x-forwarded-for'],
        payload: Buffer.concat(parts).toString('utf8'), url: req.url }));
    });
  });
  const proxy = createApiProxy(spring.base);
  const expressMock = await listening((req, res) => {
    req.originalUrl = req.url;
    req.get = (name) => req.headers[name.toLowerCase()];
    req.protocol = 'http';
    res.status = (status) => { res.statusCode = status; return res; };
    res.json = (item) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(item)); };
    proxy(req, res);
  });
  try {
    const r = await fetch(`${expressMock.base}/api/appointments?date=1`, {
      method: 'POST', headers: { authorization: 'Bearer original-token', 'content-type': 'application/json', 'x-forwarded-for': 'forged-ip' },
      body: JSON.stringify({ patient: 23 }),
    });
    assert.equal(r.status, 201);
    const json = await r.json();
    assert.equal(json.authorization, 'Bearer original-token');
    assert.equal(json.payload, '{"patient":23}');
    assert.equal(json.url, '/api/appointments?date=1');
    assert.notEqual(json.forwarded, 'forged-ip');
    const pdf = await fetch(`${expressMock.base}/api/billing/invoice/5/pdf`);
    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    assert.match(pdf.headers.get('content-disposition'), /invoice.pdf/);
    assert.deepEqual(Buffer.from(await pdf.arrayBuffer()), Buffer.from([0x25, 0x50, 0x44, 0x46, 0, 255]));
  } finally { await Promise.all([close(expressMock.server), close(spring.server)]); }
});
