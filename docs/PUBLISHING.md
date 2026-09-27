# Install locally or publish publicly

For personal use, follow **Install in your Chrome now** in the README. Developer mode is a Chrome setting, not a paid developer account. An unpacked extension needs no Web Store registration.

## Publish later for other people

1. Sign in to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Register, accept the agreement, and pay the one-time fee shown there. Complete the account verification prompts.
2. Run `npm run package`. Choose **Add new item** in the dashboard and upload `dist/resultcard-cloud-backup.zip`.
3. Add a title, description, category and images. Use `extension/icons/icon-128.png` for the icon. Supply an actual screenshot at 1280×800 or 640×400, and a 440×280 promotional image. Do not expose real student records in screenshots.
4. Complete Privacy practices using the explanations below. Host a privacy-policy page and enter its public URL. The bundled `extension/privacy.html` explains behavior but still needs your public name, contact and retention policy before publication.
5. Add test instructions. Reviewers need a legitimate way to exercise the university-login flow; explain the CAPTCHA and arrange a permitted test account through the portal owner if necessary. Do not post your personal portal password in the store listing.
6. Choose distribution, then **Submit for review**. You can choose to publish manually after approval. Uploading a ZIP does not automatically publish it or guarantee approval.

## Suggested listing copy

**Name:** Result Card Cloud Backup

**Description:** With your permission, this independent student project sends a backup of your COMSATS Lahore RESULTCARD page to the project operator's Supabase storage. It also saves the synopsis form's roll number and email in the project's database. Enable uploads once, log into the university portal normally, and open RESULTCARD. Upload status appears in the extension. You can disable future uploads at any time. The complete page contains personal and academic information, including hidden HTML fields. Existing uploaded data is retained by the operator. This version does not generate reports or provide student access to stored backups. It is not an official university extension.

**Single purpose:** Back up a consenting user's COMSATS Lahore result-card HTML and its student identifiers to the project operator's cloud project.

## Permission explanations

| Permission | Reason |
| --- | --- |
| storage | Remember consent, upload status and an installation ID; temporarily hold pending HTML in session memory. |
| webRequest | Detect portal login and successful RESULTCARD document requests on the Lahore portal. |
| alarms | Retry failed uploads a limited number of times. |
| lhr-sis.comsats.edu.pk | Fetch RESULTCARD using the user's existing portal session. |
| Configured Supabase host | Upload the HTML text file and insert roll number/email. |

No remotely hosted code is executed. The parser is bundled locally. Disclose personal identifiers and website content, including academic records, full HTML and embedded fields; do not describe this as collecting no data. Explain the observed portal activity and local use of its authenticated session accurately. The extension does not send portal passwords or browser cookies as separate fields, but raw HTML is not redacted. Review the actual dashboard categories against this behavior before certifying them.

## Details that only you can supply

- Public operator/developer name: who is responsible for the stored records.
- Contact email: where users request help or deletion.
- Retention: how long you keep uploaded data, and how you will enforce deletion.
- A public HTTPS privacy-policy URL describing those details and the behavior above.

The current anonymous upload interface also needs server-side abuse controls before broad public distribution. Keep the bucket private and student-table reads restricted; extension configuration is visible to users and a publishable key is not a secret. These deployment tasks are separate from installing the extension locally.

Official references: [registration](https://developer.chrome.com/docs/webstore/register), [publishing](https://developer.chrome.com/docs/webstore/publish), [images](https://developer.chrome.com/docs/webstore/images), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).
