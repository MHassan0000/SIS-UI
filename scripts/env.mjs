import { readFileSync } from 'node:fs';
export function loadConfig() {
  const env = {};
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  const url = new URL(env.PUBLIC_SUPABASE_URL);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) throw new Error('Expected hosted HTTPS Supabase URL');
  const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key?.startsWith('sb_publishable_')) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role; } catch {}
    if (role !== 'anon') throw new Error('Only a publishable or legacy anon key may be bundled');
  }
  const bucket = env.SUPABASE_BUCKET_NAME;
  if (!/^[a-zA-Z0-9_-]+$/.test(bucket || '')) throw new Error('Invalid bucket name');
  return { url: url.origin, key, bucket };
}
