import { parse } from './vendor/parse5.js';
import { headers } from './core.js';

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}
function attr(node, name) { return node.attrs?.find(attribute => attribute.name === name)?.value; }

export function extractStudent(html) {
  const forms = [];
  walk(parse(html), node => {
    if (node.tagName === 'form' && attr(node, 'id') === 'synopsisForm') forms.push(node);
  });
  if (forms.length !== 1) throw new Error('Expected one synopsisForm in RESULTCARD. Student details were not saved.');
  const values = { rollno: [], email: [] };
  walk(forms[0], node => {
    const name = attr(node, 'name');
    if (node.tagName === 'input' && Object.hasOwn(values, name)) values[name].push((attr(node, 'value') || '').trim());
  });
  if (values.rollno.length !== 1 || values.email.length !== 1) throw new Error('Missing or ambiguous rollno/email inputs in synopsisForm.');
  const rollnumber = values.rollno[0];
  const email = values.email[0];
  if (!rollnumber || rollnumber.length > 255 || /[\s\x00-\x1f\x7f]/.test(rollnumber)) throw new Error('Invalid roll number in synopsisForm.');
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('Invalid email in synopsisForm.');
  return { rollnumber, email };
}

export async function saveStudent(config, student, fetcher = fetch) {
  const auth = headers(config.key);
  delete auth['x-upsert'];
  const response = await fetcher(`${config.url}/rest/v1/ResultCard`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ rollnumber: student.rollnumber, email: student.email }),
    credentials: 'omit', signal: AbortSignal.timeout(20000)
  });
  if (response.ok) return;
  let code = '', hint = '';
  try {
    const payload = await response.json();
    // ON CONFLICT with an explicit index invokes SELECT policies. A plain insert
    // preserves insert-only access; accept only this exact pair-index conflict.
    if (response.status === 409 && payload.code === '23505' &&
        /unique constraint "resultcard_rollnumber_email_unique"/.test(String(payload.message))) return;
    if (/^[A-Z0-9]+$/.test(payload.code)) code = `, ${payload.code}`;
    const message = String(payload.message || '');
    if (/permission denied for sequence/i.test(message)) hint = ' The table ID sequence needs USAGE permission.';
    else if (/permission denied for table/i.test(message)) hint = ' The table operation needs an additional grant.';
    else if (/row.level security/i.test(message)) hint = ' The row was rejected by its insert policy.';
  } catch {}
  // Do not surface database error details: they can include the student's values.
  throw new Error(`ResultCard save failed (HTTP ${response.status}${code}).${hint} Check table columns, insert policy, and unique index.`);
}
