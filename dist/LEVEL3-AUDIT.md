# Level 3 — Student Companion

Implemented in the loadable `dist/cui-interface` package. Audited 28 September 2026. This is an additive layer over Level 2, with a separate public timetable provider. No framework, external runtime script, analytics SDK, or new dependency is included.

## What ships

* **GPA scenarios:** registered-course/credit prefill from Dashboard, Registration Card or pending Result Card semester; letter grades, aggregate marks, or manual grade points; credit-weighted GPA, credits and quality points. Draft inputs survive switching companion tabs, but not navigation/reload.
* **CGPA and targets:** published result-card baseline when present, explicit use of the semester scenario, manual baseline adjustment, neighboring target comparisons and impossible-target detection. Repeats and transfer adjustments are not guessed.
* **Attendance:** exact present/absent counts from the current course, separate lecture/lab cards, attendance recovery, future attend/miss scenarios and a configurable target. Rounded dashboard percentages are never inverted into invented counts.
* **Marks planner:** manual completed components, raw obtained/maximum marks and explicit overall course weights. Shows weighted progress, maximum possible aggregate and required remaining performance. It does not fabricate weights from the empty SIS pages.
* **Academic history:** published CGPA changes, derived semester GPA and grade distribution. Pending zero-credit requirements no longer hide an otherwise graded semester. No degree-completion or official standing claims.
* **Room finder:** official room directory, building/group and specific-room selection, Pakistan-time day/time/duration filters, current/next-hour shortcuts, scheduled conflicts, next booking and free-until time. Failure means unknown, never free. Searches can be stopped.
* **Timetable:** public class-section selection, prefilling the section visible on Dashboard, scheduled-now/next-class indicators, day selector and study gaps. A gap opens Room Finder with its exact interval. Students must verify electives/repeater arrangements against registration.
* **Navigation:** Ctrl/Cmd+K search across companion tools and verified native navigation. Course destinations appear only in a current course context. No invented transcript or timetable SIS route.
* **Controls:** a Student Companion preference independent of the appearance theme; clear companion data; explicit reread of the current SIS page. Enhanced-interface OFF restores original content. New content is hidden in print.

## Authenticated SIS audit

Normal navigation only, using the signed-in student account. No submissions, mutations of university records, hidden endpoint discovery or credential extraction for this phase. No account-specific fixtures were written to disk.

| Area / observed route | Evidence and implementation decision |
| --- | --- |
| `/Courses/Index` | Server-rendered `.sis-dash-table`, six registered course rows in this account; code, title, credit hours and class section. Native course selection calls `/Courses/SetCourse/{observed ID}`, then navigates to Announcements. Counts/credits are read locally. |
| `/Announcements/Index` | New/archive tabs, empty notices for inspected course. No invented notice priority or deadlines. |
| `/Attendance/Index` | `.sis-att-card`, `.sis-att-pie-legend em/span`; present and absent are separate exact counts. Class and Lab distinct. Native tables expose dates/topics/status; no need to reconstruct counts from percentages. |
| `/MarksSummary/Index` | Visited all six current course contexts. Quiz, assignment, midterm, final and applicable lab sections were empty. No assessment tables or course weights to validate; automatic marks extraction is intentionally deferred. |
| LearningResources, Assignments, MDB, GDB, Quizzes, LectureContents | Visited through course navigation; empty states, no usable due dates in this account. Quizzes explicitly reported unavailable data. Native upload/discussion flows left intact. |
| `/CourseInformation/Index` | Books section; no reliable assessment weights or weekly timetable. |
| `/ResultCard/Index` | Five semester blocks, six-column result grids, published CGPA labels. Current semester ungraded; one previous semester has pending non-credit requirements. Graded credit-bearing rows establish publication status. Grade points are per-credit points, verified from the actual rows. |
| `/RegistrationCard/Index` | Three copies of one registration card. Read only the first `.sis-reg-table` to avoid triple-counting; original print control unchanged. |
| `/StudentCard/Index` | Existing profile/download/print controls preserved. No academic companion extraction from student identity card. |
| `/Fees/Index`, `/Fees/History` | Due dates and amounts/history tables. These do not establish a reliable outstanding/paid status; no invented fee alerts. |
| Profile and contact-create page | Structural inspection only; credential blocks and input values excluded. Contact form left untouched. |
| Survey and SoS | Survey and scheme summary available; SoS detail absent in account. No unsupported degree-progress calculation. |
| APS Apply, CheckStatus, CourseAppStatus, MyDocuments, UserManual | Application category/form structure and navigation inspected. Certificates/print links exist; no applications submitted or documents downloaded. |

No native timetable page, separate transcript page or semester selector was exposed in this account. Semester history is displayed together on Result Card. Course context is held by the server after normal course selection; the extension does not fetch multiple private course pages or try to correlate stale context.

## Public reference research

Inspected the rendered [COMSATS Plus calculator family](https://www.comsatsplus.com/calculator), including GPA, CGPA, target planning and internal marks. Concepts: editable course rows, credit weighting, target inversion and separate assessment inputs. The observed GPA selector uses D+ **1.33**, which conflicts with the official source below; our calculation uses **1.30**. No branding, UI, implementation code or assets were copied.

Inspected the public [COMSATS Plus room finder](https://www.comsatsplus.com/room-finder): day, half-hour time ranges, block/room filters and available/partial/occupied classifications. Its normal browser traffic queries a third-party Supabase timetable. The extension does not depend on that endpoint. It uses the official Lahore source linked directly by the university homepage.

## Academic policies and scope

The [CUI Registrar notification, 18 November 2021](https://ww2.comsats.edu.pk/qec/downloads/Notification4304.pdf) applies from Fall 2021 admissions. Its fixed mapping and whole-mark rounding are centralized in `ui/academic.js` and tested at every boundary. D+ is 1.30. The UI requires policy selection before marks/letter-grade scenarios calculate.

Older official departmental pages show a different legacy scheme, but current general applicability and legacy rounding could not be established sufficiently for every cohort. **Earlier/other policies therefore use student-entered official grade points**, rather than an unverified automatic marks conversion. No universal theory/lab weighting is assumed. SIS’s own points are used for historical derived semester GPA.

The official [Student Affairs guidance](https://ww2.comsats.edu.pk/studentaffairs/) lists 80% undergraduate attendance. The calculator labels this as its configurable default and does not determine exam eligibility or assume condonation. Repeated-course replacement, credit transfers, special pass conditions and degree standing require official records; the app does not simulate them silently.

## Official timetable provider

Source: [CUI Lahore public timetable](https://sfs.cuilahore.edu.pk/schedule/Public/Timetable), linked as Fall 2026 Class Timetable on the [Lahore campus homepage](https://lahore.comsats.edu.pk/). Observed version: **2026-09-27**.

* `Kind=room` and `Kind=class` expose public directories. `Who` selects a listed public room or class section using the site's normal GET form.
* The parser reads the directory's JSON list literal without executing remote scripts. It reads `.grid`, `.ptime`, `.daycol`, `.slot`, `.blk`, `.code`, `.mid2`, `.room` and `.brklabel` from inert HTML.
* Expands colspan/rowspan across timetable lanes, treats prayer blocks as reserved, validates all seven days and contiguous hours, resolves the displayed 12-hour sequence into monotonic minutes, and rejects unknown occupied-cell markup.
* Intervals are half-open: a class ending at 13:00 does not conflict with a search starting at 13:00. Overlaps across lanes remain occupied.
* Explicit searches only; no background polling. Up to 30 public room schedules per selected group, sequential requests with 15-second timeout. Larger groups require a specific-room choice for additional rooms. Stop/navigation prevents further requests after the current request settles.
* Worker public cache is bounded to 150 entries with 30-minute reuse; no durable timetable or academic cache. Retrieved time is preserved through cache hits. Version older than 14 days is flagged; the published term/version and source link remain visible.
* One added host permission: `https://sfs.cuilahore.edu.pk/*`. Public GET requests omit cookies/credentials and referrer, disallow redirects and carry no student ID, marks or attendance. Public room/section choices are the only query inputs.

Manual cross-check: Monday C-5 is unbooked 13:00–13:30, with the next class at 13:30; A-2 is booked 12:30–14:30; SE Lab-J (C-9) is booked 11:30–14:30. All match parsed availability. Friday 13:00–13:30 prayer blocks are reserved. FA24-BSE-A’s Monday schedule yields a 13:00–14:30 gap, matching the official class sheet.

## Preservation and privacy boundaries

The original `background.js`, `core.js`, `student.js` and `config.js` are unchanged. `companion-worker.js` imports the existing worker and registers one separate namespaced public-timetable handler. Existing backup behavior is **not disabled or made local** by this phase. Claims about local processing apply to the new companion tools, not to the existing Level 1 backup.

Academic models, entered scenarios and public schedules stay in page/worker memory. No new academic data is written to storage.local/sync or sent to Supabase. Only the companion visibility boolean is added to the existing normalized UI preference. No student identifier is needed for cohort selection, public schedule selection or cache keys.

Clear companion data removes current-page models, drafts and page timetable cache. The worker's public-only response cache expires automatically; it contains no academic record. Navigation/reload clears drafts. Logout/full navigation destroys the content-script context; no cross-account academic data is retained.

## Verification

* `node --test tests/ui.test.mjs tests/academic.test.mjs tests/worker.test.mjs`: 16 passing tests covering policy boundaries, validation, GPA/CGPA, impossible targets, attendance recovery, weighted marks, interval conflicts, Pakistan time, manifest scope and public-provider credential omission/error behavior. An integration test imports the actual packaged wrapper with mocked Chrome/network APIs and verifies original backup event registration, deduplication and login reset without any real uploads.
* `tests/browser.html`: 61 passing browser assertions covering real DOM extraction, retained scenario drafts, weighted UI results, unknown data, room failures, rowspans, prayer blocks, timetable-gap handoff, settings, native form handlers, OFF restoration, content replacement and Level 2 regressions.
* Live signed-in DOM and public timetable checks performed with DevTools. Companion light/dark mobile layouts checked at an emulated 390px viewport, with no document/control overflow; desktop host checked at 1280px. See UI-AUDIT.md for Level 2 visual coverage. Packaged-extension reload/activation is left to the user, who explicitly elected to perform that test themselves; it is not claimed as an automated end-to-end extension test.

Unsupported structures fail closed or fall back to clearly labeled manual inputs. Empty/unavailable course data is not a zero score. Timetable availability does not establish actual access or physical occupancy.
