/**
 * Tiny persistent feedback store. Writes are serialised and committed via atomic rename.
 * Intended for one Node process; replace with a transactional database for scaling.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export class FeedbackStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.items = [];
    this.queue = Promise.resolve();
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const content = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) throw new Error('Not a feedback array');
      this.items = parsed;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Cannot load feedback database: ${error.message}`);
      this.items = [];
    }
  }

  /** Mutation is serialized so simultaneous requests cannot lose data. */
  mutate(transform) {
    const next = this.queue.then(async () => {
      const working = structuredClone(this.items);
      const value = transform(working);
      const temp = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
      try {
        await writeFile(temp, JSON.stringify(working, null, 2) + '\n', { mode: 0o600 });
        await rename(temp, this.filePath);
      } catch (error) {
        const { rm } = await import('node:fs/promises');
        await rm(temp, { force: true }).catch(() => {});
        throw error;
      }
      this.items = working;
      return value;
    });
    this.queue = next.catch(() => {});
    return next;
  }

  async add(user, { category, subject, message }) {
    return this.mutate((items) => {
      const now = new Date().toISOString();
      const item = {
        id: randomUUID(),
        userId: String(user.id),
        userName: String(user.name || 'Account holder'),
        role: user.role,
        category,
        subject,
        message,
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
      };
      items.push(item);
      return structuredClone(item);
    });
  }

  listFor(user) {
    const items = user.role === 'ADMIN'
      ? this.items
      : this.items.filter((item) => item.userId === String(user.id));
    return structuredClone(items.slice().reverse());
  }

  async updateStatus(id, status) {
    return this.mutate((items) => {
      const item = items.find((row) => row.id === id);
      if (!item) return null;
      item.status = status;
      item.updatedAt = new Date().toISOString();
      return structuredClone(item);
    });
  }
}
