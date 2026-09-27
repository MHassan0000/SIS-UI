import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { loadConfig } from './env.mjs';
import { validateHtml, upload, PORTAL } from '../extension/core.js';
import { extractStudent, saveStudent } from '../extension/student.js';

// Diagnostic only: a caller must explicitly provide the HTML file to test.
// The extension itself fetches HTML in background.js and never reads local files.
try {
  const config = loadConfig();
  if (!process.argv[2]) throw new Error('Usage: node scripts/test-response.mjs <html-file>');
  const html = readFileSync(process.argv[2], 'utf8');
  validateHtml(html, `${PORTAL}/RESULTCARD`, 'text/html');
  const student = extractStudent(html);
  const path = `captures/${randomUUID()}/${randomUUID()}.txt`;
  await upload(config, path, html);
  console.log('HTML accepted by Supabase Storage.');
  await saveStudent(config, student);
  console.log('Extracted rollnumber/email accepted by ResultCard. Values withheld.');
  await saveStudent(config, student);
  console.log('Duplicate-safe replay accepted by ResultCard.');
  const receipt = { bucket: config.bucket, path, bytes: Buffer.byteLength(html), table: 'ResultCard', uploadedAt: new Date().toISOString() };
  mkdirSync(new URL('../.local/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../.local/RESULTCARD.test-upload.json', import.meta.url), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} catch (error) { console.error(error.message); process.exitCode = 1; }
