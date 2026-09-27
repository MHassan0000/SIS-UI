import { loadConfig } from './env.mjs';
import { upload } from '../extension/core.js';
import { randomUUID } from 'node:crypto';
const path = `captures/${randomUUID()}/${randomUUID()}.txt`;
try {
  await upload(loadConfig(), path, '<!doctype html><html><body>Synthetic extension connectivity test. No student records.</body></html>');
  console.log(`Synthetic upload succeeded: ${path}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
