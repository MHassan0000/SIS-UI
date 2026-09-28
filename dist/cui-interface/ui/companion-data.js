(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  const { text, number } = app.parsers;
  const semesterOrder = label => {
    const m = label.match(/(Spring|Summer|Fall)\s+(20\d{2})/i);
    return m ? Number(m[2]) * 10 + ({ spring: 1, summer: 2, fall: 3 })[m[1].toLowerCase()] : null;
  };
  function read(root) {
    const dash = app.parsers.dashboard(root);
    let courses = dash.courses.map(c => ({ code: c.code, title: c.title, credits: c.credits }));
    const reg = root.querySelector('.sis-reg-table');
    if (!courses.length && reg) courses = [...reg.rows].slice(1).filter(r => r.cells.length === 6).map(r => ({ code: text(r.cells[1]), title: text(r.cells[2]), credits: number(text(r.cells[3])) }));
    const semesters = [...root.querySelectorAll('.single_result_container')].flatMap(block => {
      const parsed = app.parsers.results({ querySelectorAll: () => [block] })[0];
      if (!parsed) return [];
      const rows = [...block.querySelector('.sis-result-grid').rows].slice(1).filter(r => r.cells.length === 6).map(r => ({
        code: text(r.cells[0]), title: text(r.cells[1]), credits: number(text(r.cells[2])), marks: number(text(r.cells[3])), letter: text(r.cells[4]), points: number(text(r.cells[5])),
      }));
      return [{ ...parsed, rows, order: semesterOrder(parsed.semester), derived: parsed.published ? app.academic.semester(rows) : null }];
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (!courses.length) {
      const pending = semesters.filter(s => !s.published).at(-1);
      if (pending) courses = pending.rows.map(({ code, title, credits }) => ({ code, title, credits }));
    }
    const published = semesters.filter(s => s.published && s.cgpa !== null);
    const gradedRows = published.flatMap(s => s.rows).filter(c => c.credits > 0);
    const codes = gradedRows.map(c => c.code.toUpperCase().replace(/\s+/g, ''));
    const repeated = codes.length !== new Set(codes).size;
    // No repeat replacement, transferred credits, or non-credit pass grades are guessed.
    const complete = published.length > 0 && semesters.every(s => s.order !== null) && published.every(s => !!s.derived) && !repeated;
    // Cross-check the proposed baseline against published CGPA. Missing semesters,
    // transfers or special GPA exclusions must not silently prefill the wrong credits.
    const aggregate = complete ? app.academic.semester(gradedRows) : null;
    const reconciled = aggregate && Math.abs(aggregate.gpa - published.at(-1).cgpa) <= 0.011;
    const completedCredits = reconciled ? aggregate.credits : null;
    const history = { semesters, current: published.at(-1)?.cgpa ?? null, credits: completedCredits, repeated };
    const attendance = [...root.querySelectorAll('.sis-att-card')].flatMap(card => {
      const entries = [...card.querySelectorAll('.sis-att-pie-legend li')];
      const present = number(text(entries.find(e => text(e.querySelector('em')) === 'Present')?.querySelector('span')));
      const absent = number(text(entries.find(e => text(e.querySelector('em')) === 'Absent')?.querySelector('span')));
      if (present === null || absent === null || !Number.isInteger(present) || !Number.isInteger(absent)) return [];
      return [{ label: text(card.querySelector('h2')), present, total: present + absent }];
    });
    const classNames = [...root.querySelectorAll('.sis-dash-table tr.is-course-row')].flatMap(r => text(r.cells[4]).match(/(?:FA|SP)\d{2}-[A-Z]+-[A-Z]\b/g) || []);
    const context = text(document.querySelector('.page_title_container'));
    return { courses, history, attendance, classNames: [...new Set(classNames)], context, readAt: new Date(), session: dash.session };
  }
  app.companionData = { read, semesterOrder };
})();
