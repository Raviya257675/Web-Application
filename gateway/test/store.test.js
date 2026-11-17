import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FeedbackStore } from '../src/store.js';

const me = { id: 7, name: 'Test User', role: 'PATIENT' };
const admin = { id: 1, name: 'Admin', role: 'ADMIN' };

test('creates persistent feedback file, serialises concurrent writes and reloads data', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meridian-feedback-'));
  try {
    const path = join(dir, 'feedback.json');
    const db = new FeedbackStore(path);
    await db.init();
    const entries = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      db.add(me, { category: 'GENERAL', subject: `Issue ${i}`, message: 'Help please' })));
    assert.equal(new Set(entries.map((x) => x.id)).size, 12);
    assert.equal(db.listFor(me).length, 12);
    assert.equal(JSON.parse(await readFile(path, 'utf8')).length, 12);
    const fromDisk = new FeedbackStore(path);
    await fromDisk.init();
    assert.equal(fromDisk.listFor(admin).length, 12);
    const changed = await fromDisk.updateStatus(entries[0].id, 'RESOLVED');
    assert.equal(changed.status, 'RESOLVED');
    const restarted = new FeedbackStore(path);
    await restarted.init();
    assert.equal(restarted.listFor(admin).find((x) => x.id === entries[0].id).status, 'RESOLVED');
    assert.equal(restarted.listFor({ id: 33, role: 'PATIENT' }).length, 0);
    assert.equal(await restarted.updateStatus('no-such-id', 'OPEN'), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
