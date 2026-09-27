# Result Card Cloud Backup

Chrome Manifest V3 extension for COMSATS Lahore. After one-time opt-in, it observes the first successful RESULTCARD document navigation in each detected portal login and fetches a fresh authenticated copy. It uploads the complete HTML as `text/plain` to Supabase Storage and saves `synopsisForm` inputs `rollno` and `email` to `public."ResultCard"` columns `rollnumber` and `email`. No debugger, portal password access, separate Supabase login screen, or report generation.

## Setup

1. Copy `.env.example` to `.env.local` and set `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_BUCKET_NAME`. Local credentials, captured report cards, upload receipts, and generated configuration are excluded from Git.
2. Run `npm ci`, `npm run build`, and `npm test`. The build bundles the HTML parser locally; no remotely hosted code is used.
3. Review and execute `supabase/setup.generated.sql` in your Supabase SQL editor if storage is not already configured. This sets the named bucket private with a 2 MB limit and insert-only access. Review all existing storage policies; a permissive policy can still expose data.
4. Run `supabase/resultcard.sql` in the SQL editor to configure insert access and the unique `(rollnumber, email)` index. Existing duplicate pairs must be resolved manually if the index cannot be created; the migration never deletes rows. Then run `npm run check:storage` for a synthetic bucket test. Remove its synthetic object through the dashboard when finished.
5. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the `extension` directory. Agree to the data disclosure once. Log into the portal manually and open RESULTCARD.
6. The popup reports success or errors. Files appear at `captures/<random-installation-id>/<random-login-id>.txt` in the configured bucket.

For an existing installation, rebuild and click **Reload** in `chrome://extensions` after applying the table migration. To validate the local sample without showing or uploading its values, run `node scripts/save-student.mjs --validate-only`. To insert its roll number/email into the table, run `node scripts/save-student.mjs`.

`RESULTCARD.html` is an optional development sample, never an extension input. You can delete it without affecting the extension. The installed extension fetches fresh portal HTML on each capture and extracts student fields from that same response. The scripts that read local HTML are manual diagnostics and are not packaged in the extension.

## Behavior and limits

- Capture is once per detected login, shared across tabs. A top-level POST to the portal root starts a new capture session, matching the observed portal login. A browser restart also begins a fresh session. An installation ID is not a student ID.
- Student details come from the first `form#synopsisForm` inputs named `rollno` and `email`. The extension trims and inserts their values directly; validation is left to Supabase. Identical roll number/email pairs are deduplicated; a changed email creates another pair without overwriting the old row. No table SELECT or UPDATE access is needed.
- Success is shown only after both file and table writes succeed. Table retries reuse the uploaded file. These writes are not a database transaction: a failed table insert can leave a successfully uploaded file in the bucket.
- Visiting RESULTCARD again in the same session does not upload again after success. Each new login creates an immutable file; older files remain. The response is a fresh GET, not the byte-identical original navigation response.
- Failed uploads retry up to three times using alarms. Pending HTML stays in extension-only session storage, not persistent disk storage. It is discarded on restart, a new login, opt-out, or exhausted retries. An in-flight upload may complete after opt-out.
- No portal cookies or password are sent to Supabase, but full HTML may contain embedded tokens or hidden form fields. Nothing inside the HTML is redacted.
- This uses a public publishable key in a background service worker. Extension code and configuration cannot be hidden from users. There is no trusted server in a Chrome extension. Never bundle a service-role key.
- Without separate authentication or a trusted portal integration, the backend cannot prove which student submitted a file. Insert-only anonymous Storage access can be abused for unwanted uploads. Before public release, add server-enforced quotas/rate limits or authenticated upload authorization appropriate to your deployment; random paths and CORS are not authentication.

## Chrome Web Store release

The implementation is a development build, not a completed store submission. Provide operator identity, privacy/deletion contact, retention period and hosted privacy policy; make the listing and dashboard disclosures match the full HTML upload. Keep the opt-in. Complete live Chrome testing and server-side abuse controls before public distribution. Package only the contents of `extension/`, never `.env.local`, the saved RESULTCARD, tests or the project root.

For manual verification: decline consent (no upload), consent and visit RESULTCARD (one upload), refresh (no second upload), log out/in (one new upload), disable (no later upload), temporarily block Supabase (visible error and bounded retry), close/reopen Chrome (pending HTML cleared). Verify bucket public URLs and anonymous listing cannot retrieve records. The synthetic automated tests do not replace these checks.
