# Portal audit — 2026-09-28

## Starting architecture

- Chrome Manifest V3, version 1.3.0, vanilla JavaScript; no content scripts or popup in the supplied runtime package.
- ES module service worker observes portal navigation, backs up result HTML, saves student details, and retries with alarms. Existing local/session storage is used by that worker.
- Existing permissions: storage, webRequest, alarms; host permissions for Lahore SIS and configured Supabase. The UI adds no permission, host, web-accessible resource, or dependency.
- `dist/cui-interface` differs from the parent repository's older source/build; work is intentionally confined to the supplied package.

## Verified portal structure

Audited the real authenticated account after the user signed in manually. The current portal already has a September 2026 SIS theme. This implementation enhances its existing structure and bridges its verified CSS variables rather than assuming the older portal described in the prompt.

The portal is a traditional multi-page MVC application with jQuery/Bootstrap and some AJAX (profile photo, application workflow, attendance progress). Its authenticated shell is `.sis-portal-shell`, `.sis-portal-header`, `.main_body > .content_area`; the sign-out anchor is `/Login/Sign_out`. Authentication is excluded using the observed `.sis-login-page` / `#LoginSubmit` markers plus the authenticated-shell guard. No credential values or hidden synopsis form are read by the enhancement.

| Observed destination | Evidence and treatment |
| --- | --- |
| `/Courses/Index` | `.sis-dash`, `.sis-dash-table`, `.is-course-row`; course rows retain original click handlers. Current session is displayed in the hero. Credits and separate attendance bars are present. |
| Course workspace | Existing course-row click navigates through `/Courses/SetCourse/...` to announcements. No course route is invented or hard-coded into UI actions. |
| `/Attendance/Index` | Requires selected-course context. Separate `.sis-att-card` sections, percentages, native charts, and `.sis-att-table` attendance records. |
| `/ResultCard/Index`, `/RESULTCARD` | `.single_result_container`, `.sis-result-grid`, `.sis-result-meta`, `.sis-result-summary`. Native duplicate `AutoNumber2` IDs are avoided; layout `.tbl_one` / `.tbl_two` tables are not treated as data grids. |
| `/Fees/Index`, `/Fees/History` | Data tables inside `.quiz_listing > .col-md-12`; original challan actions and values retained. |
| `/RegistrationCard/Index` | Three printable copies with `.sis-reg-table`. All copies and print action preserved. |
| `/StudentCard/Index` | Existing student-card design, download, and profile link retained. |
| `/Profile/Index`, `/Profile/Create` | Profile cards and contact form inspected structurally. Credential values not inspected or parsed. Inputs, names, IDs, and validation unchanged. |
| `/APS/Index` | Existing application category buttons, inputs, selects, hidden panels, search, and submit/reset buttons; native token bridge and scoped form styling. |
| `/Announcements/Index` | Existing new/archive tabs and empty notification state. |
| `/MarksSummary/Index` | Empty assessment state for the selected course; no invented grade summary. |
| LearningResources, Assignments, MDB, GDB, Quizzes, LectureContents | Available navigation and empty states inspected; native actions preserved. |
| `/CourseInformation/Index` | Course information content retained. |
| `/StudentSoS/Index`, `/SurveyLink/index` | Existing summaries and available empty/warning states retained. |

No timetable route or schedule was exposed in the available account navigation. No timetable UI, fake classes, speculative selectors, or background data fetch was added. Dashboard CGPA/fees/timetable cards are not shown when their data is absent from the current DOM.

## Data and fallback decisions

- Academic data exists only in current-page memory. Only enabled/theme/compact settings persist.
- Lowest attendance is explicitly the lowest displayed lecture or lab value, not an incorrectly weighted overall average.
- Hidden attendance-warning policy text is not promoted into a new status rule. No university threshold is assumed.
- CGPA is copied from the latest chronologically identified semester with complete displayed grades; an ungraded semester's `0.00` placeholder is excluded. A genuine published zero with complete grades is retained.
- Enhancement components are removable; original DOM attributes are recorded and restored. Search filtering is fully reversible.
- Mutation observers watch content changes and shallow shell boundaries, debounce work, ignore extension-owned mutations, and disconnect while enhancing or disabled.
- Portal CSS is scoped under `body.sis-studio-enabled` and `@media screen`; native print CSS remains authoritative. Extension-created UI is hidden in print.
- Styling uses native verified tokens across profile, application, empty and loading states. Unavailable modals/tooltips and populated assessment states could not be visually audited.

## Validation record

- Five Node test groups pass: numeric edge cases, preference schema, manifest/branding/assets, script syntax, and UI privacy boundary.
- Thirty-six synthetic browser checks pass: original DOM restoration, node identity, click/submit handlers, select values, disable/re-enable, no duplication, course filtering and empty state, dynamic content/data updates, CGPA placeholder handling, keyboard controls, system preference, teardown, login guard, late native CSS overrides, Student Card buttons, settings launcher, search/focus retention, course shortcut and attendance-loading handling.
- Live DOM/style previews checked dashboard, selected-course attendance, result cards, fees, registration, contact form and applications. Data counts and summaries use the actual displayed DOM; no academic data is written by the tests.
- Visual corrections included course-tab contrast, profile-photo sizing, dark surfaces, label contrast and lecture/lab presentation.
- Dashboard overflow checks pass at 1366×768, 1440×900, 1920×1080 and 390×844; native mobile navigation opens. Wide data tables retain local horizontal scrolling.
- Real academic submissions, password changes, applications and logout were not executed. Synthetic tests verify handlers; real navigation and native controls were inspected without changing academic information.
- DevTools blocks `chrome://` pages. Loading/reloading the extension requires user interaction. Live preview tests use in-memory storage; installed-extension persistence requires a real reload check.

No live student HTML, screenshots, names, grades, or attendance values were added as test fixtures. Browser fixtures are synthetic.

## Refinement audit

- Rechecked the real Student Card page after a fresh manual login. Its late inline `.sis-bc-hero` gradient uses `!important`, and some portal navigation rules outranked the earlier extension rules. Preview styles are now inserted **before** native styles to reproduce Chrome's stylesheet ordering. The regression fixture includes the late native gradient and button rules.
- Strengthened scoped selector specificity rather than broadly forcing all portal elements. The Student Card gradient alone gets an explicit important background override. Page cards share defined padding, borders and rounded corners; original print and download actions are retained.
- Dark palette is neutral near-black with charcoal surfaces. Light palette uses white, subtle gray and restrained blue accents. Settings UI follows the same palette; status dot removed.
- Verified the native mobile sheet remains visibly rendered offscreen when closed, casting a shadow into the page. Closed sheets now have hidden visibility; the original `is-open` class restores visibility. Open/close controls and all original links remain functional.
- Verified `/Content/js/progressBarTimer.js`: the native two-tick animation initially writes `0%`; final values are marked `bg-success`. The new summary waits for completion instead of promoting the placeholder into a false lowest-attendance value. A genuine completed zero is preserved. Progress ARIA values now reflect displayed percentages and are restored on disable.
- Verified native `.slice` uses a `bake-pie` entrance animation. It is disabled while enhanced, and verified green/red slice styles use semantic theme colors. No chart values or geometry are changed.
- Live checks cover dark Student Card, dashboard, results, fees, registration, profile, applications and selected-course attendance. Student Card was visually checked in light/dark and at 390px with no overflowing name, metadata or action group. Desktop checks include 1366px and 1440px. The QR image retains its white backing for readability.
- Tests are local browser previews with mocked preference storage; installing updated content scripts still requires reloading the existing Chrome extension and refreshing SIS.
