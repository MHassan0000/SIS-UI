import { config } from './config.js';
import { PORTAL, isResultCard, isLoginPost, validateHtml, upload } from './core.js';
import { extractStudent, saveStudent } from './student.js';

// Serialize work, including opt-out and login transitions, inside a worker lifetime.
let queue = Promise.resolve();
function enqueue(task) { queue = queue.then(task).catch(async error => { await status('error', error.message); }); return queue; }
async function status(state, message, extra = {}) {
  await chrome.storage.local.set({ status: { state, message, ...extra } });
  await chrome.action.setBadgeText({ text: state === 'error' ? '!' : '' });
}
async function enabled() { return (await chrome.storage.local.get('enabled')).enabled === true; }
async function session() {
  let { loginSession } = await chrome.storage.session.get('loginSession');
  if (!loginSession) { loginSession = { id: crypto.randomUUID(), done: false }; await chrome.storage.session.set({ loginSession }); }
  return loginSession;
}
async function capture() {
  if (!await enabled()) return;
  const current = await session();
  if (current.done) return;
  const existing = await chrome.storage.session.get('pending');
  if (existing.pending) { await flush(); return; }
  await status('capturing', 'Fetching your result card…');
  const response = await fetch(`${PORTAL}/RESULTCARD`, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Portal request failed (HTTP ${response.status}).`);
  const html = await response.text();
  validateHtml(html, response.url, response.headers.get('content-type') || '');
  if (!await enabled()) return;
  let { installId } = await chrome.storage.local.get('installId');
  if (!installId) { installId = crypto.randomUUID(); await chrome.storage.local.set({ installId }); }
  const pending = { html, path: `captures/${installId}/${current.id}.txt`, sessionId: current.id, attempts: 0 };
  // Sensitive HTML stays in extension-only memory storage, never storage.local/sync.
  await chrome.storage.session.set({ pending });
  await flush();
}
async function flush() {
  if (!await enabled()) return;
  const { pending } = await chrome.storage.session.get('pending');
  if (!pending) return;
  await status('uploading', 'Uploading your result card…');
  try {
    if (!pending.fileUploaded) {
      await upload(config, pending.path, pending.html);
      pending.fileUploaded = true;
      await chrome.storage.session.set({ pending });
    }
    if (!await enabled()) return;
    await status('uploading', 'Saving student details to ResultCard…');
    await saveStudent(config, extractStudent(pending.html));
    const current = await session();
    if (current.id === pending.sessionId) await chrome.storage.session.set({ loginSession: { ...current, done: true } });
    await chrome.storage.session.remove('pending');
    await chrome.alarms.clear('retry-upload');
    await status('uploaded', 'HTML and student details saved to Supabase.', { uploadedAt: new Date().toISOString(), path: pending.path });
  } catch (error) {
    pending.attempts++;
    if (pending.attempts < 4) {
      await chrome.storage.session.set({ pending });
      await chrome.alarms.create('retry-upload', { delayInMinutes: pending.attempts });
      await status('error', `${pending.fileUploaded ? 'HTML uploaded; student details still pending. ' : ''}${error.message} Retrying automatically.`);
    } else {
      await chrome.storage.session.remove('pending');
      await status('error', `${pending.fileUploaded ? 'HTML uploaded; student details were not saved. ' : ''}${error.message} Open RESULTCARD again to retry.`);
    }
  }
}
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});
chrome.webRequest.onBeforeRequest.addListener(details => {
  if (isLoginPost(details)) enqueue(async () => {
    await chrome.storage.session.remove('pending');
    await chrome.alarms.clear('retry-upload');
    await chrome.storage.session.set({ loginSession: { id: crypto.randomUUID(), done: false } });
  });
}, { urls: [`${PORTAL}/*`], types: ['main_frame'] });
chrome.webRequest.onCompleted.addListener(details => {
  if (details.statusCode >= 200 && details.statusCode < 300 && isResultCard(details.url)) enqueue(capture);
}, { urls: [`${PORTAL}/*`], types: ['main_frame'] });
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'retry-upload') enqueue(flush); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  if (message.type !== 'set-enabled') return;
  // Persist opt-out immediately so an in-progress fetch cannot start a later upload.
  const value = message.enabled === true;
  chrome.storage.local.set({ enabled: value, consentAt: value ? new Date().toISOString() : null }).then(() => enqueue(async () => {
    if (!value) {
      await chrome.storage.session.remove('pending');
      await chrome.alarms.clear('retry-upload');
      await status('disabled', 'Automatic uploads are disabled.');
    } else {
      await status('ready', 'Enabled. Open RESULTCARD after signing into the portal.');
      const tabs = await chrome.tabs.query({ url: `${PORTAL}/*` });
      if (tabs.some(tab => isResultCard(tab.url))) await capture();
    }
  })).then(() => respond({ ok: true })).catch(() => respond({ ok: false }));
  return true;
});
