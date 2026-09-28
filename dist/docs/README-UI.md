# SIS Studio interface enhancement

Load **`cui-interface`** as the unpacked Chrome extension, or reload its existing installation and refresh SIS. Sign in on the real university login page. The **SIS Studio** button at the bottom right opens appearance settings on authenticated pages.

- Enhanced interface: on/off, with immediate restoration and no reload.
- Appearance: System, Light, or Dark.
- Compact tables: reduces cell padding.
- Dashboard: current session, course count, displayed credit total, lowest completed lecture/lab attendance with a direct course action, real navigation shortcuts, and course search that survives live updates.
- Attendance: separate lecture/lab labels and accessible progress indicators. No attendance policy is inferred.
- Results: published CGPA with its semester, record counts, and incomplete-grade status. Placeholder zero CGPAs from ungraded semesters are excluded.

Preferences persist in `chrome.storage.local` under `sisStudio.ui.v1`; no academic data is stored by the UI. Original form nodes, IDs, values, handlers, URLs, and print layouts are preserved. Search temporarily hides nonmatching rows; switching the enhancement off restores them.

The refined design uses near-black/charcoal surfaces in dark mode and neutral white/slate surfaces in light mode. Student Card banners and action buttons have consistent geometry and contrast, including when the portal loads its styles after the extension. The settings launcher has a simple settings icon and no status dot. Decorative card/menu/chart animations are suppressed; native loading feedback is retained.

## Existing extension behavior

The name, icons, action and original upload implementation remain unchanged. **The original worker still uploads result-card HTML and student details to its configured Supabase service.** Level 3 adds a wrapper worker that imports it and handles explicit requests for the official public timetable. Companion academic calculations run locally and do not read credentials, cookies or hidden forms. Turning off the enhanced interface controls appearance and companion visibility; it does not disable existing backup functionality.

This distinction resolves the prompt's conflict between preserving all existing functionality and keeping the UI enhancement local. The complete pre-existing extension is not local-only.

## Package architecture

`cui-interface` is the maintained runtime package for this task. There is no build step or added runtime dependency.

| File | Responsibility |
| --- | --- |
| `ui/adapter.js` | Verified portal selectors, authenticated-page guard, original navigation links |
| `ui/parsers.js` | Strict numeric parsing and normalized displayed data |
| `ui/preferences.js` | Validated, isolated preference storage |
| `ui/controls.js` | Keyboard-accessible settings in Shadow DOM |
| `ui/features.js` | Reversible dashboard, attendance, results, table and navigation enhancements |
| `ui/main.js` | Lifecycle, system theme changes, bounded DOM observers, teardown |
| `ui/styles/tokens.css` | Light/dark design tokens and native SIS token bridge |
| `ui/styles/portal.css` | Verified portal component styles |
| `ui/styles/features.css` | Extension-created summaries and tools |

The parent repository has an older build that generates a differently branded `extension/` package. Do not run that build or packaging workflow expecting it to include this UI. This package can be loaded directly. No parent build files were modified.

## Verification

Run from this `dist` directory:

```powershell
node --test tests/ui.test.mjs tests/academic.test.mjs tests/worker.test.mjs
```

Open `tests/browser.html` in Chrome for the synthetic DOM regression suite. Its form submission is prevented by a test listener; no test data is submitted. Tests use an in-memory Chrome storage adapter. They verify restoration, original element identity, handlers, dynamic changes, summaries, filtering, keyboard controls, and login exclusion. This suite is outside the extension package.

See [the audit and validation record](UI-AUDIT.md) for live coverage and limitations.
# Level 3 Student Companion — version 1.4.1

The loadable extension in `cui-interface` now includes GPA/CGPA scenarios and targets, attendance what-if tools, a weighted-marks planner, academic history, an official public timetable and room finder, and Ctrl/Cmd+K navigation. Open **Student Companion** at the top of an authenticated SIS page. Its visibility can be toggled in SIS Studio settings.

Reload the unpacked extension from `C:\vscode\Ui extension\dist\cui-interface`, then refresh SIS. The updated manifest adds access only to the official public timetable host. Keep loading this package directly; an older parent-project build that does not include these UI files may overwrite it.

Scenario drafts stay in memory across companion tabs and clear on page navigation/reload. Course prefills come from the current page: use Dashboard or Registration Card for current courses, Result Card for historical CGPA, and a course's Attendance page for exact lecture/lab counts. Room/timetable retrieval requires a connection. Earlier grading cohorts use manually entered official grade points. Assessment weights remain manual because the inspected SIS marks pages supplied none.

Existing Level 1 backup behavior is unchanged. The new companion calculations do not upload academic data. Full findings, policy sources, limitations and validation: [LEVEL3-AUDIT.md](LEVEL3-AUDIT.md).

The companion now has a distinct blue-and-gold banner and six tool palettes: indigo academics, green attendance, amber marks, cyan rooms, rose timetable and violet history. Light and dark surfaces adapt independently of the surrounding portal. Required minimum GPA/marks round upward; historical credit prefills require reconciliation against published CGPA; changed room filters clear stale results.

This is a personal unpacked extension, not a Chrome Web Store release. Reload the installed extension and refresh SIS to activate 1.4.1.

Verification completed: 19 Node tests, 63 browser regression assertions and 23 actual unpacked-extension end-to-end checks, including live official timetable retrieval. Run:

```powershell
node --test tests/ui.test.mjs tests/academic.test.mjs tests/worker.test.mjs
node tests/extension-e2e.mjs
node tests/extension-e2e.mjs --live-public
```

Open `tests/browser.html` for the browser regression suite. The end-to-end runner uses an installed Playwright Core and Chromium; set `STUDIO_PLAYWRIGHT` to its `index.mjs` and `STUDIO_CHROMIUM` to the browser executable if the local defaults differ. The default run mocks public timetable responses; `--live-public` needs internet access. Both use synthetic SIS pages, load the actual extension and block all other network destinations. Screenshots in `tests/output` contain synthetic data only.
