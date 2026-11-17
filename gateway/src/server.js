import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { FeedbackStore } from './store.js';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const project = resolve(root, '..');
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || '127.0.0.1';
const backendOrigin = process.env.SPRING_URL || 'http://127.0.0.1:8080';
const staticDir = resolve(project, 'backend/src/main/resources/static');
const publicDir = join(root, 'public');
const filePath = resolve(process.env.FEEDBACK_FILE || join(root, 'data/feedback.json'));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');

const store = new FeedbackStore(filePath);
await store.init();
const app = createApp({ backendOrigin, staticDir, publicDir, store });
app.listen(port, host, () => {
  console.log(`Meridian Express gateway: http://${host}:${port}`);
  console.log(`React SPA + Spring Boot API: ${backendOrigin}`);
  console.log(`Feedback database: ${filePath}`);
});
