import { mkdirSync, writeFileSync } from 'node:fs';
import { loadConfig } from './env.mjs';
const config = loadConfig();
mkdirSync(new URL('../extension/', import.meta.url), { recursive: true });
mkdirSync(new URL('../supabase/', import.meta.url), { recursive: true });
writeFileSync(new URL('../extension/config.js', import.meta.url), `export const config = ${JSON.stringify(config)};\n`);
const manifest = {
  manifest_version: 3, name: 'Result Card Cloud Backup', version: '1.0.0',
  description: 'With your permission, back up your COMSATS Lahore result-card HTML to private cloud storage after portal login.',
  minimum_chrome_version: '120',
  permissions: ['storage', 'webRequest', 'alarms'],
  host_permissions: ['https://lhr-sis.comsats.edu.pk/*', `${config.url}/*`],
  background: { service_worker: 'background.js', type: 'module' },
  action: { default_popup: 'popup.html', default_title: 'Result Card Cloud Backup' },
  options_page: 'popup.html',
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'" }
};
writeFileSync(new URL('../extension/manifest.json', import.meta.url), JSON.stringify(manifest, null, 2));
const sql = `-- Review and run in the Supabase SQL editor. No public read/list/update/delete is granted.\n-- Anonymous insert is a public upload surface: use quotas and monitoring before public release.\ninsert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)\nvalues ('${config.bucket}', '${config.bucket}', false, 2097152, array['text/plain'])\non conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['text/plain'];\n\ndrop policy if exists resultcard_insert_only on storage.objects;\ncreate policy resultcard_insert_only on storage.objects for insert to anon\nwith check (bucket_id = '${config.bucket}' and name ~ '^captures/[0-9a-f-]{36}/[0-9a-f-]{36}\\.txt$');\n\n-- Inspect other policies too: permissive policies are combined with OR.\nselect policyname, roles, cmd, qual, with_check from pg_policies where schemaname = 'storage' and tablename = 'objects';\n`;
writeFileSync(new URL('../supabase/setup.generated.sql', import.meta.url), sql);
console.log('Built extension/ and supabase/setup.generated.sql. No secret keys bundled.');
