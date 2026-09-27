import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { loadConfig } from './env.mjs';
import { headers } from '../extension/core.js';

const receiptFile = new URL('../RESULTCARD.upload.json', import.meta.url);
const config = loadConfig();
const file = readFileSync(new URL('../RESULTCARD.html', import.meta.url));
const receipt = existsSync(receiptFile)
  ? JSON.parse(readFileSync(receiptFile, 'utf8'))
  : { bucket: config.bucket, path: `captures/${randomUUID()}/${randomUUID()}.txt` };
if (receipt.bucket !== config.bucket) throw new Error('Bucket changed since the previous attempt.');
writeFileSync(receiptFile, JSON.stringify(receipt, null, 2));
try {
  const response = await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${receipt.path}`, {
    method: 'POST', headers: headers(config.key), body: file,
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) {
    let error = {};
    try { error = await response.json(); } catch {}
    console.error(JSON.stringify({ status: response.status, error: error.error, message: error.message }));
    process.exitCode = 1;
  } else {
    Object.assign(receipt, { bytes: file.length, uploadedAt: new Date().toISOString(), status: response.status });
    writeFileSync(receiptFile, JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
