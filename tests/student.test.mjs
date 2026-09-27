import test from 'node:test';
import assert from 'node:assert/strict';
import { extractStudent, saveStudent } from '../extension/student.js';
const form = (roll = ' FA24-BCS-001 ', email = 'student&#64;example.test') => `<form id="synopsisForm"><input value="${roll}" name="rollno"><input type="email" name="email" value="${email}"></form>`;
test('extracts only synopsisForm fields, trims whitespace and decodes entities', () => {
  const html = `<input name="rollno" value="wrong"><script>"${form('fake')}"</script><!-- ${form('comment')} -->${form()}`;
  assert.deepEqual(extractStudent(html), {rollnumber:'FA24-BCS-001',email:'student@example.test'});
});
test('rejects missing, ambiguous or invalid student values', () => {
  for (const html of ['', form()+form(), form('', 'x@example.test'), form('FA24-001','invalid'), '<form id="synopsisForm"><input name="rollno" value="A"></form>']) assert.throws(() => extractStudent(html));
});
test('sends exactly two fields using an idempotent insert with no read access', async () => {
  await saveStudent({url:'https://example.supabase.co',key:'sb_publishable_test'}, {rollnumber:'TEST-001',email:'test@example.test',ignored:'not sent'}, async (url, options) => {
    assert.equal(url,'https://example.supabase.co/rest/v1/ResultCard');
    assert.deepEqual(JSON.parse(options.body),{rollnumber:'TEST-001',email:'test@example.test'});
    assert.equal(options.headers.Prefer,'return=minimal');
    assert.equal(options.headers['x-upsert'],undefined);
    assert.equal(options.credentials,'omit');
    return new Response(null,{status:201});
  });
});
test('database errors omit row values', async () => {
  await assert.rejects(saveStudent({url:'https://example.supabase.co',key:'sb_publishable_test'}, {}, async () => new Response(JSON.stringify({code:'42501',details:'private student values'}),{status:403})), error => error.message.includes('42501') && !error.message.includes('private student'));
});
test('accepts only the named pair-index conflict as a successful replay', async () => {
  const config = {url:'https://example.supabase.co',key:'sb_publishable_test'};
  const conflict = name => async () => new Response(JSON.stringify({code:'23505',message:`duplicate key value violates unique constraint "${name}"`,details:'private values'}), {status:409});
  await saveStudent(config, {}, conflict('resultcard_rollnumber_email_unique'));
  await assert.rejects(saveStudent(config, {}, conflict('unrelated_primary_key')), /23505/);
});
