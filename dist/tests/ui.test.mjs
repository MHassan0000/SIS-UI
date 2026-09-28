import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../cui-interface/', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
function load() {
  const context = vm.createContext({});
  for (const file of ['adapter', 'parsers', 'preferences']) vm.runInContext(read(`ui/${file}.js`), context);
  return context.__sisStudioUI;
}

test('attendance parser accepts only complete, finite percentages in range', () => {
  const { percentage } = load().parsers;
  for (const [input, expected] of [['0%', 0], ['100%', 100], [' 83.25 % ', 83.25], ['101%', null], ['-1%', null], ['', null], ['83', null], ['83% absent', null], ['NaN%', null], ['Infinity%', null]]) assert.equal(percentage(input), expected, input);
});
test('credit parser does not turn missing or malformed values into zero', () => {
  const { number } = load().parsers;
  for (const [input, expected] of [['0', 0], ['3', 3], ['2.5', 2.5], ['', null], ['-', null], ['3 credits', null], ['1e3', null], [null, null]]) assert.equal(number(input), expected);
  assert.equal(number('9'.repeat(400)), null);
});
test('preferences validate their schema and default safely', () => {
  const { normalize } = load().preferences;
  assert.equal(normalize(null).theme, 'system');
  assert.equal(normalize({ enabled: 'false' }).enabled, true);
  assert.equal(normalize({ theme: 'sepia', compact: 'yes' }).compact, false);
  assert.equal(normalize({ theme: 'dark', enabled: false, compact: true }).theme, 'dark');
  assert.equal(normalize({ enabled: false }).enabled, false);
});
test('manifest keeps branding and scopes the UI to the Lahore portal', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.name, 'SIS Studio');
  assert.equal(manifest.description, 'Customize COMSATS Lahore SIS with refined layouts, light and dark themes, clearer tables, and a more useful student dashboard.');
  assert.deepEqual(manifest.permissions, ['storage', 'webRequest', 'alarms']);
  assert.equal(manifest.background.service_worker, 'companion-worker.js');
  assert.match(read('companion-worker.js'), /import '\.\/background\.js'/);
  assert.deepEqual(manifest.host_permissions, ['https://lhr-sis.comsats.edu.pk/*', 'https://uuqpvolvuwaisqriemeq.supabase.co/*', 'https://sfs.cuilahore.edu.pk/*']);
  assert.equal(manifest.action.default_popup, undefined);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://lhr-sis.comsats.edu.pk/*']);
  for (const file of [...manifest.content_scripts[0].js, ...manifest.content_scripts[0].css, ...Object.values(manifest.icons)]) assert.ok(existsSync(new URL(file, root)), file);
});
test('UI scripts contain no network, academic storage, or credential APIs', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const scripts = manifest.content_scripts[0].js.map(read).join('\n');
  assert.doesNotMatch(scripts, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|document\.cookie|localStorage|sessionStorage/);
  const oldUI = ['adapter', 'parsers', 'preferences', 'controls', 'features', 'main'].map(f => read(`ui/${f}.js`)).join('\n');
  assert.doesNotMatch(oldUI, /chrome\.runtime\.sendMessage/);
  assert.doesNotMatch(scripts, /input\[type=["']?password|#Password|synopsisForm/);
  assert.match(read('ui/preferences.js'), /storage\.local\.set\(\{ \[key\]: normalize\(value\) \}\)/);
  for (const script of manifest.content_scripts[0].js) assert.doesNotThrow(() => new vm.Script(read(script)), script);
});
