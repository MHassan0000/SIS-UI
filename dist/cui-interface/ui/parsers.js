(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const text = element => clean(element?.textContent);
  function number(value) {
    const normalized = clean(value);
    const result = /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
    return Number.isFinite(result) ? result : null;
  }
  function percentage(value) {
    const match = clean(value).match(/^(\d+(?:\.\d+)?)\s*%$/);
    const n = match ? Number(match[1]) : null;
    return n !== null && n >= 0 && n <= 100 ? n : null;
  }
  function courseAttendance(row) {
    const s = app.selectors;
    return [...row.querySelectorAll(s.attendanceBars)].flatMap(bar => {
      // Native two-tick animation first writes 0%, then the actual value.
      if (bar.matches(s.attendancePending)) return [];
      const value = percentage(text(bar));
      const container = bar.closest(s.attendanceContainer);
      // The portal's own -Class / -Lab IDs distinguish sessions even when DOM order changes.
      const kind = container?.id.endsWith('-Class') ? 'Lecture' : container?.id.endsWith('-Lab') ? 'Lab' : null;
      return value !== null && kind ? [{ value, kind, bar, container }] : [];
    });
  }
  function dashboard(root) {
    const s = app.selectors;
    const courses = [...root.querySelectorAll(s.courseRows)].map(row => ({
      element: row, code: text(row.querySelector(s.courseCode)),
      title: text(row.querySelector(s.courseName)), credits: number(text(row.querySelector(s.credits))),
      attendance: courseAttendance(row),
    }));
    const session = text(root.querySelector(s.session)).match(/^Current session:\s*(.*?)\s*\.\s*Open a course/i)?.[1];
    return { courses, session: session || null, attendancePending: !!root.querySelector(s.attendancePending) };
  }
  function results(root) {
    const s = app.selectors;
    return [...root.querySelectorAll(s.resultBlocks)].flatMap(block => {
      const semester = [...block.querySelectorAll(s.resultMeta)].map(text)
        .find(value => /^Semester\s*:/i.test(value))?.replace(/^Semester\s*:\s*/i, '');
      const rawCGPA = [...block.querySelectorAll(s.resultSummary)].map(text)
        .find(value => /^CGPA\s*:/i.test(value))?.replace(/^CGPA\s*:\s*/i, '');
      const grid = block.querySelector(s.resultGrid);
      if (!semester || !grid) return [];
      const rows = [...grid.rows].slice(1).filter(row => row.cells.length === 6);
      // Zero values in an ungraded semester are placeholders, not a published CGPA.
      const published = rows.length > 0 && rows.every(row => /^[A-F][+-]?$|^P$/i.test(text(row.cells[4])));
      const cgpa = number(rawCGPA);
      return [{ semester, count: rows.length, published,
        cgpa: published && cgpa !== null && cgpa <= 4 ? cgpa : null }];
    });
  }
  app.parsers = { clean, text, number, percentage, courseAttendance, dashboard, results };
})();
