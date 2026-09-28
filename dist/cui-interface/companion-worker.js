// Keep Level 1 intact; the new provider handles only public timetable GETs.
import './background.js';
const source = 'https://sfs.cuilahore.edu.pk/schedule/Public/Timetable';
const cache = new Map();
const active = new Map();
async function publicTimetable(kind, who) {
  const url = new URL(source);
  url.searchParams.set('Kind', kind);
  if (who) url.searchParams.set('Who', who);
  const key = url.href, saved = cache.get(key);
  if (saved && Date.now() - saved.time < 30 * 60 * 1000) return saved;
  if (active.has(key)) return active.get(key);
  if (active.size >= 4) throw new Error('Another timetable search is running. Please wait.');
  const task = (async () => {
    const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('The official timetable is temporarily unavailable.');
    const html = await response.text();
    if (html.length > 1000000) throw new Error('Timetable response is too large.');
    if (cache.size >= 150) cache.delete(cache.keys().next().value);
    const value = { html, time: Date.now() };
    cache.set(key, value);
    return value;
  })();
  active.set(key, task);
  try { return await task; } finally { active.delete(key); }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== 'sis-studio-public-timetable') return;
  if (sender.id !== chrome.runtime.id || !sender.tab || !sender.url?.startsWith('https://lhr-sis.comsats.edu.pk/')) return;
  const { kind, who } = message;
  if (!['room', 'class'].includes(kind) || typeof who !== 'string' || who.length > 150 || /[\x00-\x1f<>]/.test(who)) { reply({ ok: false, error: 'Invalid public timetable selection.' }); return; }
  publicTimetable(kind, who).then(value => reply({ ok: true, html: value.html, fetchedAt: value.time }), () => reply({ ok: false, error: 'Could not load the official timetable. Check your connection and try again. No availability has been assumed.' }));
  return true;
});
