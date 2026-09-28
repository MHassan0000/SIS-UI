export const PORTAL = 'https://lhr-sis.comsats.edu.pk';
export const MAX_BYTES = 2 * 1024 * 1024;
export function isResultCard(url) {
  try { const u = new URL(url); return u.origin === PORTAL && /^\/RESULTCARD\/?$/i.test(u.pathname); } catch { return false; }
}
export function isLoginPost(details) {
  const u = new URL(details.url);
  return details.type === 'main_frame' && details.method === 'POST' && u.origin === PORTAL && u.pathname === '/';
}
export function validateHtml(html, finalUrl, contentType) {
  if (!isResultCard(finalUrl)) throw new Error('Portal redirected away from RESULTCARD. Log in again.');
  if (!/text\/html/i.test(contentType) || !/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) throw new Error('Portal did not return a complete HTML document.');
  if (new TextEncoder().encode(html).length > MAX_BYTES) throw new Error('Result card exceeds the 2 MB upload limit.');
}
export function headers(key) {
  return { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'text/plain', 'x-upsert': 'false' };
}
export async function upload(config, path, html, fetcher = fetch) {
  const endpoint = `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetcher(endpoint, { method: 'POST', headers: headers(config.key), body: html, credentials: 'omit', signal: AbortSignal.timeout(20000) });
  if (response.ok) return;
  // A retry of the same immutable object can follow an upload whose acknowledgement was lost.
  let code;
  try { code = (await response.json()).error; } catch {}
  if ([400, 409].includes(response.status) && code === 'Duplicate') return;
  const reason = typeof code === 'string' ? ` ${code.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 80)}.` : '';
  throw new Error(`Storage upload failed (HTTP ${response.status}).${reason} Check bucket permissions and configuration.`);
}
