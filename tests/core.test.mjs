import test from 'node:test';
import assert from 'node:assert/strict';
import { isResultCard, isLoginPost, validateHtml, headers, upload, MAX_BYTES } from '../extension/core.js';
test('only the exact portal RESULTCARD endpoint matches', () => {
  assert.ok(isResultCard('https://lhr-sis.comsats.edu.pk/RESULTCARD'));
  for (const url of ['https://evil.test/RESULTCARD', 'https://lhr-sis.comsats.edu.pk/RESULTCARD/other', 'http://lhr-sis.comsats.edu.pk/RESULTCARD']) assert.equal(isResultCard(url), false);
});
test('only portal login document POST resets capture', () => {
  assert.ok(isLoginPost({url:'https://lhr-sis.comsats.edu.pk/',type:'main_frame',method:'POST'}));
  assert.equal(isLoginPost({url:'https://lhr-sis.comsats.edu.pk/',type:'xmlhttprequest',method:'POST'}), false);
});
test('login pages, incomplete documents and large responses are rejected', () => {
  const url = 'https://lhr-sis.comsats.edu.pk/RESULTCARD';
  validateHtml('<html><body>synthetic</body></html>', url, 'text/html');
  for (const html of ['<html>', '<html><input type="password"></html>', `<html>${'x'.repeat(MAX_BYTES)}</html>`]) assert.throws(() => validateHtml(html, url, 'text/html'));
  assert.throws(() => validateHtml('<html></html>', 'https://lhr-sis.comsats.edu.pk/', 'text/html'));
});
test('publishable key is not used as a bearer JWT', () => {
  assert.equal(headers('sb_publishable_test').Authorization, undefined);
  assert.equal(headers('eyJtest').Authorization, 'Bearer eyJtest');
});
test('upload transmits raw HTML without portal credentials and reports denial', async () => {
  const config = {url:'https://example.supabase.co',key:'sb_publishable_test',bucket:'cards'};
  await upload(config, 'captures/a/b.txt', '<html></html>', async (url, opts) => {
    assert.equal(url, 'https://example.supabase.co/storage/v1/object/cards/captures/a/b.txt');
    assert.equal(opts.body, '<html></html>'); assert.equal(opts.credentials, 'omit'); assert.equal(opts.headers['x-upsert'], 'false');
    return new Response('{}', {status:200});
  });
  await assert.rejects(upload(config, 'a.txt', 'html', async () => new Response('{}', {status:403})), /HTTP 403/);
});
