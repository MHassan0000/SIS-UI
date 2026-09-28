# SIS Studio — conversation and project handoff

Last updated: **2026-09-28**, Asia/Karachi. Runtime version: **1.4.1**.

This is a curated export of the chat's decisions, completed work and verification evidence, not a verbatim transcript. It deliberately excludes credentials, cookies, keys and account-specific academic records. Read the current code and later user instructions before acting; browser sessions and external policies can change.

## Current status and immediate context

The user requested three phases: preserve the original extension, improve the SIS interface, then build an integrated Student Companion. The implementation and final refinement are complete for **personal, local unpacked use**, within the documented data/policy limits below. The last implementation response reported 19 Node tests + 63 browser assertions + 23 actual unpacked-extension checks passing (105 recorded checks in total, not 105 independent test suites).

The latest user request was to save this handoff in `tests/memory.md` so fresh chats can continue. This documentation task does not change extension functionality. No new feature request or known failing test is pending at this handoff.

The updated package still needs a reload in the user's existing Chrome installation to activate changed files. The chat does not establish that their personal Chrome installation was reloaded after the final 1.4.1 edits. The actual packaged extension was separately loaded and tested in a fresh automated Chromium profile.

## Workspace and source of truth

- Working directory: `C:\vscode\Ui extension\dist`.
- **Maintained and loadable runtime:** `C:\vscode\Ui extension\dist\cui-interface`.
- Detailed Level 3 specification: [cui-interface/uiprompt.txt](../cui-interface/uiprompt.txt).
- Usage and test instructions: [README-UI.md](../README-UI.md).
- Original interface audit: [UI-AUDIT.md](../UI-AUDIT.md).
- Latest feature, policy and verification audit: [LEVEL3-AUDIT.md](../LEVEL3-AUDIT.md).
- Tests live in this `tests` directory, outside the loadable extension.
- The parent repository has an **older, different source/build workflow**. Do not run its build or packaging scripts assuming they include these UI files: they can overwrite the maintained runtime. This vanilla-JavaScript package loads directly without a build step or new runtime dependencies.
- Shell is PowerShell on Windows. At handoff the writable workspace is `dist`; obtain tool-required approval for writes outside it.
- There were existing uncommitted changes at handoff. Do not reset, clean or overwrite them. This chat did not create a final commit or push.

`UI-AUDIT.md` describes the earlier Level 2 state. Its historical statements about no timetable UI, earlier test counts and preview-only verification are superseded by Level 3 and `LEVEL3-AUDIT.md`.

## User decisions and preferences that must carry forward

1. Preserve Level 1 and Level 2 while adding Level 3. Keep native SIS functional, including forms, course navigation, print and download controls.
2. The user initially mentioned uploading to Chrome, but later explicitly canceled public release: **“dont do anything to it i dont wanna public release this extension , this extension will remain local with me.”** This was their answer to a question about changing the existing automatic cloud backup for Web Store disclosure/consent. Do not reinterpret the current task as a Web Store release or silently redesign backup behavior.
3. The user previously asked whether backup applies only to them or to whoever installs the extension, wanted the latter, and asked for inspection only. The implementation has no account allowlist; each installation uses the configured destination and per-install/session identifiers. The actual trigger details are recorded below; do not oversimplify this to an upload on every login alone.
4. Keep the manifest description about COMSATS interface/UI customization only, without cloud-backup marketing or extra unrelated claims. Current text: “Customize COMSATS Lahore SIS with refined layouts, light and dark themes, clearer tables, and a more useful student dashboard.”
5. The main portal dark mode should be neutral near-black/ambient; light mode should look professional. Fix malformed cards and avoid distracting animations, clipping and abrupt cuts.
6. Remove the green status circle from the bottom-right settings launcher. This was done. A normal settings icon remains. The missing Student Card navigation icon was also addressed in scoped portal CSS.
7. Student Companion is a major feature and should stand out in both themes using different appealing colors and styles, rather than blend into the portal.
8. Verify COMSATS academic standards using official sources. COMSATS Plus is a functional reference, not the policy authority and not code/assets to copy.
9. User handles login and CAPTCHA manually. They repeatedly signed in for audits and said they would test their own installation. Do not read/fill credentials or ask them to log in again unless a needed live session has actually expired.
10. Work autonomously on routine implementation; do not repeatedly ask trivial permission questions. Do not claim universal correctness, untested native submissions, or future compatibility merely because current tests pass.

## Phase 1 — original extension / cloud backup

The original runtime was a Manifest V3 extension (starting version 1.3.0) with an ES module service worker, an action opening the SIS portal, result-card HTML backup and student-detail insertion into its configured Supabase project. It predates the interface enhancement.

Files to preserve: `background.js`, `core.js`, `student.js`, `config.js`. These four files had **no changes in the final refinement**. Do not print the configuration key or account data into logs or documentation.

Observed implementation:

- `background.js` serializes backup tasks. Login POST to the portal root resets per-login state and pending retries.
- A successful main-frame completion at case-insensitive `/RESULTCARD` (optional trailing slash) triggers capture. `/ResultCard/Index` is not itself matched by `core.isResultCard`; a redirect to the matched route matters. Login alone is not the capture trigger.
- Capture fetches `/RESULTCARD` using the signed-in portal session, validates full HTML, content type, final route and the 2 MB limit, and uploads HTML to `captures/<installId>/<sessionId>.txt`.
- Installation ID is persisted locally; login/pending state and sensitive pending HTML use extension session storage. Completed uploads are deduplicated within the login session; alarm retries handle transient failures.
- The original `student.js` extracts fields named `uid` and `pwd` from result HTML and maps them to the existing `rollnumber` and `email` fields. The name `pwd` alone should not be used to invent a new claim about its meaning. New UI/Companion code does not read these hidden fields.
- There is no user/account-specific allowlist. Other installations with the same configuration follow the same behavior, subject to the route trigger, authentication and destination permissions.
- Automatic backup stays active independently of the interface/Companion toggles. Turning the redesign off does not disable backup.

Level 3's `companion-worker.js` imports the existing worker and adds a separate namespaced public-timetable handler. It does not replace the original backup. **The complete extension is not local-only in its data handling:** only the newly added academic calculations are local. Personal/unpacked distribution is a separate concept from network behavior.

## Phase 2 — SIS interface enhancement

Target: `https://lhr-sis.comsats.edu.pk`. The actual portal is a multi-page MVC application with jQuery/Bootstrap, server-rendered content and selected AJAX behavior. Existing modern SIS markup was inspected rather than assuming old screenshots/selectors.

Implemented:

- Scoped light/dark/system themes, near-black portal background, professional white/slate light surfaces, compact tables, stronger hierarchy and consistent cards/forms.
- Bottom-right keyboard-accessible settings in Shadow DOM, without the removed green dot.
- Reversible on/off enhancement preserving original node identities, IDs, input values, handlers and navigation. Native print layouts remain authoritative; enhancement UI is hidden in print.
- Dashboard session/course/credit summaries, separate lecture/lab attendance context, lowest completed attendance shortcut, course filtering and useful native links.
- Published CGPA summaries that ignore placeholder zero CGPA on ungraded semesters but retain a genuine published zero.
- Student Card banner/button geometry and contrast fixes, including native late `!important` gradient overrides and a missing navigation icon.
- Mobile navigation visibility fixes; table scrolling remains local to wide data tables.
- Decorative native chart/card/menu entrance animations suppressed while preserving useful loading feedback.
- Native attendance bars initially animate through zero. Summaries wait for the completed state (`bg-success`) rather than presenting this placeholder as real attendance. ARIA progress values are updated/restored correctly.
- Debounced, bounded observers ignore owned mutations and disconnect during enhancement/teardown. Search and keyboard focus survive relevant dynamic updates.

Preferences use `chrome.storage.local` key `sisStudio.ui.v1` for enabled/theme/compact and now companion visibility. UI academic data is not persisted there.

Key files under `cui-interface/ui/`:

| File | Role |
| --- | --- |
| `adapter.js` | Verified selectors, authentication guard, native navigation |
| `parsers.js` | Strict numbers and displayed academic data |
| `preferences.js` | Preference normalization and storage |
| `controls.js` | Settings launcher and Shadow DOM panel |
| `features.js` | Reversible summaries, navigation and filtering |
| `main.js` | Lifecycle, theme sync, observers and teardown |
| `styles/tokens.css` | Theme tokens and native SIS token bridge |
| `styles/portal.css` | Scoped portal component styling |
| `styles/features.css` | Enhancement-created summaries and controls |

## Phase 3 — Student Companion

Implemented as an additive layer, initially version 1.4.0 and refined to **1.4.1**. No framework, external runtime scripts, analytics library or new runtime dependency.

### Academic and student tools

- **Semester GPA scenarios:** course/credit prefills from the current Dashboard, first Registration Card copy, or pending Result Card semester. Letter grade, aggregate marks or manual grade points; credit-weighted GPA, quality points and credits.
- **CGPA projections and target planning:** editable current baseline, explicit use of the semester scenario, neighboring target scenarios and impossible-target detection. Required minimum scores round upward to two decimals; internal arithmetic retains precision.
- **Historical baseline safeguards:** aggregate credit-bearing history must reconcile with the latest published CGPA within 0.011 display tolerance, semesters must be usable, and normalized course codes must not repeat before credits are automatically trusted. Otherwise require manual confirmation. Repeat/transfer policy is not guessed.
- **Attendance assistant:** exact present/absent counts on the selected course Attendance page, separate lecture/lab models, recovery calculations, missable classes and future attend/miss scenarios. No reverse-engineering exact counts from rounded dashboard percentages.
- **Weighted marks planner:** entered obtained/maximum marks and explicit course weights; earned contribution, maximum possible result and required remaining marks. No universal theory/lab weighting assumed.
- **Academic history:** published CGPA changes, derived semester GPA and grade distribution. Pending zero-credit requirements do not hide a graded semester.
- **Public class timetable:** class section selection/prefill, day selector, scheduled-now/next indicators, study gaps and a button to transfer the exact gap into room search.
- **Room finder:** official directory, building/group or room selection, Pakistan-time day/time/duration, now/next-hour presets, conflicts, next booking and free-until. Provider/parser failures mean unknown, never free.
- **Navigation:** Ctrl/Cmd+K command dialog for tools and verified native links. Contextual course actions use observed routes/handlers.
- **Controls:** independent Companion visibility, clear data and explicit reread of current SIS page. Drafts survive Companion tab changes but clear on full navigation/reload.

### Final refinement

- Distinct blue-and-gold banner, white title, compact quick actions and per-tool heading/description.
- Indigo academics, green attendance, amber marks, cyan rooms, rose timetable and violet history accents. Dedicated light surfaces and dark navy workspace surfaces separate the feature from the neutral main portal.
- Responsive forms/cards and prominent metrics; no new animations.
- Minimum GPA/marks display rounds upward to avoid an insufficient target being shown as sufficient.
- Historical credits reconcile against published CGPA rather than blindly summing all result rows.
- Editing room-search filters clears old availability. Search filters/presets disable while loading; two consecutive failures stop the batch and leave unqueried rooms unknown.
- Editing a loaded class section clears the old timetable; input is disabled during the request.

### Phase 3 architecture

| File | Role |
| --- | --- |
| `ui/academic.js` | Pure policy mappings, GPA/CGPA/target, attendance and marks math |
| `ui/companion-data.js` | Current-page courses, history, attendance and class-section models |
| `ui/timetable.js` | Inert public HTML parsing, directory/schedule validation, intervals and Pakistan time |
| `ui/companion-style.js` | Shadow DOM Companion CSS and tool palettes |
| `ui/companion.js` | Banner, six tabs, drafts, context actions and command dialog |
| `companion-worker.js` | Existing worker import plus pinned public timetable fetch/cache handler |

The isolated content-script namespace is `globalThis.__sisStudioUI`. Companion DOM host is `#sis-studio-companion`. Manifest script order matters and is already configured. The extension requires Chrome 120+.

## COMSATS Plus research and official policies

Reviewed [COMSATS Plus calculators](https://www.comsatsplus.com/calculator) and [room finder](https://www.comsatsplus.com/room-finder). Adopted functional ideas for GPA, CGPA, target planning, internal marks and room filters. Implemented independently; did not copy branding, assets or source. Their observed room data endpoint is not used by this extension.

Policy checked against the [CUI Registrar notification dated 18 November 2021](https://ww2.comsats.edu.pk/qec/downloads/Notification4304.pdf), effective Fall 2021 admissions:

| Grade | Minimum rounded aggregate | Points |
| --- | --- | --- |
| A | 85 | 4.00 |
| A- | 80 | 3.66 |
| B+ | 75 | 3.33 |
| B | 71 | 3.00 |
| B- | 68 | 2.66 |
| C+ | 64 | 2.33 |
| C | 61 | 2.00 |
| C- | 58 | 1.66 |
| D+ | 54 | **1.30** |
| D | 50 | 1.00 |
| F | Below 50 | 0.00 |

Aggregate marks round to the nearest whole number, half up, before this conversion. Observed COMSATS Plus D+ was 1.33; the official 1.30 takes precedence. Automatic conversion requires choosing the applicable policy; earlier/other cohorts enter official grade points manually because a universal legacy scheme was not sufficiently verified.

GPA is sum(credits × points) / sum(credits), including credit-bearing failures. CGPA projections weight the existing baseline and next semester by credits. A displayed, rounded current CGPA necessarily makes projections estimates; these tools do not replace official results or resolve special repeat/transfer rules.

The [official Student Affairs guidance](https://ww2.comsats.edu.pk/studentaffairs/) supplied the configurable 80% undergraduate attendance default. The app does not decide exam eligibility, condonation or other official standing. Additional formula reference reviewed: [official department academic information](https://ww2.comsats.edu.pk/ms_vhr/BBS.aspx).

## Timetable source and guarantees

Use [official CUI Lahore public timetable](https://sfs.cuilahore.edu.pk/schedule/Public/Timetable), linked by the [campus homepage](https://lahore.comsats.edu.pk/). Version observed during this audit: **2026-09-27, Fall 2026**. Recheck later; do not treat these dated examples as permanent truth.

- Public GET queries use `Kind=room` or `Kind=class`, plus a directory-listed `Who` selection.
- Wrapper worker validates sender and destination; credentials/referrer omitted, redirects rejected, 15-second timeout.
- Public in-memory worker cache: maximum 150 entries, 30-minute reuse; preserve original fetched time. Display source/version; warn for versions over 14 days old.
- Explicit searches only; no private SIS crawling or periodic polling. Room groups search up to 30 schedules sequentially; larger groups require a room choice for additional results.
- Parser uses an inert template, parses only the public list literal, and does not execute remote scripts or load page resources. It validates timetable structure, all days, colspan/rowspan lanes, reserved prayer blocks and monotonic time slots.
- Conflict intervals are half-open: a class ending at 13:00 does not conflict with a search starting at 13:00.
- Checked Monday C-5 free 13:00–13:30 then booked; A-2 occupied 12:30–14:30; SE Lab-J (C-9) occupied 11:30–14:30; Friday 13:00–13:30 prayer reserved; public FA24-BSE-A Monday gap 13:00–14:30.
- Scheduled availability does not guarantee physical vacancy, permission to enter, holiday schedules or room access. Section schedules may not reflect personal electives/repeats.

## Live SIS audit and deliberate limitations

The user manually authenticated. Normal student-accessible navigation was inspected without submitting university records. No credential extraction by the new features and no account-specific HTML/screenshots were saved as fixtures.

Audited Dashboard, announcements, lecture/lab attendance, all six current course marks contexts, resources, assignments, MDB/GDB, quizzes, lecture contents, course information, results, registration, Student Card, fees/history, profile/contact form structure, survey, SoS and APS sections. Detailed routes/selectors are in `LEVEL3-AUDIT.md`.

Important observations:

- All six inspected current marks contexts were empty. Automatic marks/assessment-weight extraction is intentionally deferred. The manual planner is implemented; do not claim real marks autofill was validated.
- Registration has three printable copies; read only the first for prefills.
- Current ungraded semester and pending non-credit requirements need different treatment from published zero scores.
- No native timetable route, separate transcript page or semester selector was exposed. Use the public provider; do not invent private endpoints.
- No reliable assignment deadlines, degree-progress denominator or fee payment status was available to support extra automatic claims.
- Models come only from the current page. No background fetching of private courses, cross-page academic cache or durable scenario storage was added.
- Native record-changing submissions, password changes and real applications were not executed. Synthetic regression fixtures verify handler preservation.

## Verification evidence at completion

Recorded on 2026-09-28 after the final runtime edits:

| Layer | Result | What it establishes |
| --- | --- | --- |
| Node suites | **19 passed** | Policy boundaries/rounding, arithmetic/validation, exhaustive attendance edges, intervals/time, manifest and worker behavior |
| Browser regression fixture | **63 passed** | DOM extraction, drafts, baseline reconciliation, room failures/gaps, native handler preservation, themes/OFF restore, dynamic changes and login guard |
| Actual unpacked MV3 extension with live public provider | **23 passed** | Real worker load, manifest injection/isolated scripts, tools, public fetches, stale-result clearing, persistence/reload, mobile/theme controls, outage behavior and no runtime errors |

The E2E test uses **synthetic SIS responses** with the actual packaged extension. `--live-public` allows the official timetable requests through the actual worker; all other external destinations are blocked. No real student uploads were made by that test. Original backup handler registration/dedup/reset was tested with mocked Chrome/network APIs, not a fresh production upload.

Live signed-in DOM previews separately verified real portal compatibility and historical-baseline reconciliation. Distinguish these from the isolated-world installed-extension test. Desktop and 390px mobile Companion layouts were checked; light-mobile and dark screenshots from the actual extension were reviewed. Earlier Level 2 audits cover additional portal pages and resolutions.

The first live-provider E2E attempt failed because the shell environment blocked networking. The approved network-enabled final run passed. Do not misreport the restricted-network failure as a product defect or hide it when explaining the evidence.

`git diff --check` passed (only line-ending normalization warnings). Original four backup files showed no diff in this refinement. Current results are evidence for the tested version and cases, not proof of zero possible bugs or immunity to later portal changes.

### Reproducing tests

Run from `C:\vscode\Ui extension\dist`:

```powershell
node --test tests/ui.test.mjs tests/academic.test.mjs tests/worker.test.mjs
node tests/extension-e2e.mjs
node tests/extension-e2e.mjs --live-public
```

Open `tests/browser.html` in Chrome for the browser regression suite; inspect `#test-output` for passes/failures.

The E2E runner imports existing Playwright Core and launches Chromium. Local defaults are in its first lines; override via `STUDIO_PLAYWRIGHT` (path to `index.mjs`) and `STUDIO_CHROMIUM` (browser executable) if needed. No runtime dependency was added to the extension. Network-enabled tests may require environment approval. The runner uses a fresh temporary profile and safely removes it afterward.

Synthetic visual artifacts: `tests/output/companion-dark-fixture.png`, `companion-dark-live.png`, `companion-light-mobile.png`. A filename containing “live” refers to the public provider, not private student data.

## Continuation checklist for a fresh chat

1. Read this file, `LEVEL3-AUDIT.md`, relevant code and any newly applicable `AGENTS.md`. Follow new user instructions over historical assumptions.
2. Check `git status` and preserve existing changes. Work in the maintained runtime, not the older parent build.
3. No unfinished implementation is known. Continue from the user's next concrete request; do not restart the three phases or reopen the canceled public-release discussion unprompted.
4. For a bug, reproduce on the affected page/tool; preserve native handlers and Phase 1 behavior. Run tests appropriate to the change rather than claiming past results apply to new edits.
5. Discover current browser tabs/session state instead of reusing old page IDs. Ask for manual sign-in/CAPTCHA only if needed. Chrome internal extension pages were blocked by the available browser tools; the user may need to perform reload themselves.
6. To activate this package: Chrome `chrome://extensions` → Developer mode → Load unpacked → `C:\vscode\Ui extension\dist\cui-interface`. If already installed, Reload SIS Studio and refresh SIS. Do not select the parent `dist` or `tests` folder.
7. Current readiness means **personal unpacked use**, not Chrome Web Store compliance or submission. No public release, final ZIP, Git commit or push is implied by this handoff.
8. Keep explanations candid: the implemented tools passed the recorded checks; manual-policy/data fallbacks remain intentional. Do not promise every theoretical functionality or unsupported academic policy is automated.
