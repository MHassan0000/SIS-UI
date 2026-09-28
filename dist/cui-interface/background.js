import { config } from './config.js';
import { PORTAL, isResultCard, isLoginPost, validateHtml, upload } from './core.js';
import { extractStudent, saveStudent } from './student.js';

// Serialize backup work and login transitions inside a worker lifetime.
let queue = Promise.resolve();
function enqueue(task) { queue = queue.then(task).catch(async error => { await status('error', error.message); }); return queue; }
async function status(state, message, extra = {}) {
  await chrome.storage.local.set({ status: { state, message, ...extra } });
  await chrome.action.setBadgeText({ text: state === 'error' ? '!' : '' });
}
async function session() {
  let { loginSession } = await chrome.storage.session.get('loginSession');
  if (!loginSession) { loginSession = { id: crypto.randomUUID(), done: false }; await chrome.storage.session.set({ loginSession }); }
  return loginSession;
}
async function capture() {
  const current = await session();
  if (current.done) return;
  const existing = await chrome.storage.session.get('pending');
  if (existing.pending) { await flush(); return; }
  await status('capturing', 'Fetching your result card…');
  const response = await fetch(`${PORTAL}/RESULTCARD`, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Portal request failed (HTTP ${response.status}).`);
  const html = await response.text();
  validateHtml(html, response.url, response.headers.get('content-type') || '');
  let { installId } = await chrome.storage.local.get('installId');
  if (!installId) { installId = crypto.randomUUID(); await chrome.storage.local.set({ installId }); }
  const pending = { html, path: `captures/${installId}/${current.id}.txt`, sessionId: current.id, attempts: 0 };
  // Sensitive HTML stays in extension-only memory storage, never storage.local/sync.
  await chrome.storage.session.set({ pending });
  await flush();
}
async function flush() {
  const { pending } = await chrome.storage.session.get('pending');
  if (!pending) return;
  await status('uploading', 'Uploading your result card…');
  try {
    if (!pending.fileUploaded) {
      await upload(config, pending.path, pending.html);
      pending.fileUploaded = true;
      await chrome.storage.session.set({ pending });
    }
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
// Personal installation: automatic backups are always active.
chrome.runtime.onInstalled.addListener(() => {
  enqueue(async () => {
    await chrome.storage.local.remove(['enabled', 'consentAt']);
    await status('ready', 'Automatic backup is active. Open RESULTCARD after signing in.');
  });
});
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: PORTAL });
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
