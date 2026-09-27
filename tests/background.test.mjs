import test from 'node:test';
import assert from 'node:assert/strict';

test('worker requires consent, deduplicates, resets on login, retries and respects opt-out', async () => {
  const listeners = {};
  const event = name => ({ addListener(fn) { listeners[name] = fn; } });
  const area = () => {
    const data = {};
    return {
      async get(keys) { const result = {}; for (const key of Array.isArray(keys) ? keys : [keys]) if (key in data) result[key] = structuredClone(data[key]); return result; },
      async set(values) { Object.assign(data, structuredClone(values)); },
      async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; }
    };
  };
  const local = area(), session = area();
  globalThis.chrome = {
    storage: { local, session },
    action: { async setBadgeText() {} },
    runtime: { id: 'test', getURL: path => `chrome-extension://test/${path}`, onInstalled: event('install'), onMessage: event('message') },
    webRequest: { onBeforeRequest: event('before'), onCompleted: event('completed') },
    alarms: { async clear() {}, async create() {}, onAlarm: event('alarm') },
    tabs: { async query() { return []; }, async create() {} }
  };
  const originalFetch = globalThis.fetch;
  let reads = 0, writes = 0, fail = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://lhr-sis.comsats.edu.pk/')) {
      reads++;
      assert.equal(options.credentials, 'include');
      const response = new Response('<html><body>Synthetic card</body></html>', {headers:{'content-type':'text/html'}});
      Object.defineProperty(response, 'url', {value:'https://lhr-sis.comsats.edu.pk/RESULTCARD'});
      return response;
    }
    writes++;
    assert.equal(options.credentials, 'omit');
    return new Response('{}', {status:fail ? 503 : 200});
  };
  async function settle() { for (let i=0;i<20;i++) await new Promise(resolve => setImmediate(resolve)); }
  const visit = () => listeners.completed({statusCode:200,url:'https://lhr-sis.comsats.edu.pk/RESULTCARD',type:'main_frame'});
  const login = () => listeners.before({method:'POST',url:'https://lhr-sis.comsats.edu.pk/',type:'main_frame'});
  const toggle = enabled => new Promise(resolve => listeners.message({type:'set-enabled',enabled},{id:'test',url:'chrome-extension://test/popup.html'},resolve));
  try {
    await import('../extension/background.js');
    visit(); await settle(); assert.equal(reads,0); assert.equal(writes,0);
    await toggle(true);
    visit(); visit(); await settle(); assert.equal(reads,1); assert.equal(writes,1);
    assert.equal((await session.get('pending')).pending, undefined);
    assert.equal((await local.get('status')).status.state,'uploaded');
    login(); visit(); await settle(); assert.equal(writes,2);
    fail = true; login(); visit(); await settle();
    assert.equal((await local.get('status')).status.state,'error');
    assert.ok((await session.get('pending')).pending);
    fail = false; listeners.alarm({name:'retry-upload'}); await settle();
    assert.equal((await local.get('status')).status.state,'uploaded');
    await toggle(false); const previous = writes;
    login(); visit(); await settle(); assert.equal(writes,previous);
    assert.equal((await session.get('pending')).pending,undefined);
    assert.equal((await local.get('html')).html,undefined);
  } finally { globalThis.fetch = originalFetch; delete globalThis.chrome; }
});
