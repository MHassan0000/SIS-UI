import { parse } from './vendor/parse5.js';
import { headers } from './core.js';

function find(node, match) {
  if (!node) return;
  if (match(node)) return node;
  for (const child of node.childNodes || []) {
    const found = find(child, match);
    if (found) return found;
  }
}
function attr(node, name) { return node?.attrs?.find(attribute => attribute.name === name)?.value; }

export function extractStudent(html) {
  const form = find(parse(html), node => node.tagName === 'form' && attr(node, 'id') === 'synopsisForm');
  const value = name => (attr(find(form, node => node.tagName === 'input' && attr(node, 'name') === name), 'value') || '').trim();
  return { rollnumber: value('uid'), email: value('pwd') };
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
  const error = await response.json().catch(() => ({}));
  if (response.status === 409 && error.code === '23505' &&
      String(error.message).includes('unique constraint "resultcard_rollnumber_email_unique"')) return;
  throw new Error(`ResultCard save failed (HTTP ${response.status}).`);
}
