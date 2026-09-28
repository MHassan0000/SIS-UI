(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  app.createFeatures = () => {
    const originals = new Map();
    const added = new Set();
    const cleanups = [];
    function attr(node, name, value) {
      if (!originals.has(node)) originals.set(node, new Map());
      const values = originals.get(node);
      if (!values.has(name)) values.set(name, node.getAttribute(name));
      if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
    }
    function own(node) {
      node.dataset.sisStudioOwned = 'feature';
      added.add(node);
      return node;
    }
    function clear() {
      cleanups.splice(0).forEach(fn => fn());
      added.forEach(node => node.remove());
      added.clear();
      for (const [node, attributes] of originals) {
        for (const [name, value] of attributes) {
          if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
        }
      }
      originals.clear();
    }
    function cards(items, title = 'At a glance') {
      const section = own(element('section', 'studio-overview'));
      section.setAttribute('aria-label', title);
      for (const item of items) {
        const card = element('div', 'studio-stat');
        card.append(element('span', 'studio-eyebrow', item.label), element('strong', 'studio-stat-value', item.value));
        if (item.note) card.append(element('span', 'studio-stat-note', item.note));
        if (item.action) {
          const button = element('button', 'studio-stat-action', item.action.label);
          button.type = 'button';
          button.addEventListener('click', item.action.run);
          card.append(button);
        }
        section.append(card);
      }
      return section;
    }
    function enhanceDashboard(root) {
      const s = app.selectors;
      const dashboard = root.querySelector(s.dashboard);
      if (!dashboard) return;
      const data = app.parsers.dashboard(root);
      const items = [];
      if (data.session) items.push({ label: 'Current session', value: data.session, note: 'Your academic semester' });
      if (data.courses.length) {
        items.push({ label: 'Registered courses', value: String(data.courses.length), note: 'Open a course below for details' });
        if (data.courses.every(course => course.credits !== null)) {
          items.push({ label: 'Credit hours', value: String(data.courses.reduce((sum, course) => sum + course.credits, 0)), note: 'Across your registered courses' });
        }
        const sessions = data.courses.flatMap(course => course.attendance.map(item => ({ ...item, course })));
        const lowest = sessions.reduce((min, item) => !min || item.value < min.value ? item : min, null);
        if (data.attendancePending) items.push({ label: 'Lowest attendance', value: '—', note: 'Waiting for SIS attendance' });
        else if (lowest) items.push({ label: 'Lowest attendance', value: `${lowest.value}%`,
          note: `${lowest.course.code} · ${lowest.kind}`,
          action: { label: 'Open course', run: () => lowest.course.element.click() } });
      }
      const hero = dashboard.querySelector(s.dashboardHero);
      if (items.length && hero) hero.after(cards(items));
      const links = app.adapter.navigation().filter(link => /^(Result Card|Fees|Registration Card|Profile)$/.test(link.label));
      if (links.length && hero) {
        const nav = own(element('nav', 'studio-quick-actions'));
        nav.setAttribute('aria-label', 'Quick actions');
        nav.append(element('span', 'studio-eyebrow', 'Quick access'));
        for (const link of links) {
          const anchor = element('a', '', link.label);
          anchor.href = link.href;
          anchor.append(element('span', 'studio-arrow', '↗'));
          nav.append(anchor);
        }
        (hero.nextElementSibling?.classList.contains('studio-overview') ? hero.nextElementSibling : hero).after(nav);
      }
      for (const course of data.courses) {
        for (const item of course.attendance) {
          attr(item.container, 'data-studio-session', item.kind);
          attr(item.bar, 'aria-label', `${item.kind} attendance`);
          attr(item.bar, 'aria-valuenow', String(item.value));
          attr(item.bar, 'aria-valuemax', '100');
        }
        // Preserve the original click listener and URL; supply keyboard activation only.
        if (!course.element.hasAttribute('tabindex')) {
          attr(course.element, 'tabindex', '0');
          attr(course.element, 'aria-label', `Open ${course.title || course.code}`);
          const keydown = event => {
            if (event.target !== course.element || !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            course.element.click();
          };
          course.element.addEventListener('keydown', keydown);
          cleanups.push(() => course.element.removeEventListener('keydown', keydown));
        }
      }
      const table = root.querySelector(s.courseTable);
      if (!table || !data.courses.length) return;
      const toolbar = own(element('div', 'studio-course-tools'));
      const label = element('label', 'studio-search-label', 'Find a course');
      const input = element('input', 'studio-search');
      input.type = 'search';
      input.placeholder = 'Search by name or code…';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Find a registered course by name or code');
      label.append(input);
      const count = element('span', 'studio-search-count', `${data.courses.length} courses`);
      count.setAttribute('role', 'status');
      toolbar.append(label, count);
      table.parentElement.before(toolbar);
      const empty = own(element('p', 'studio-search-empty', 'No matching courses. Clear your search to see all courses.'));
      empty.hidden = true;
      toolbar.after(empty);
      input.addEventListener('input', () => {
        const query = input.value.trim().toLocaleLowerCase();
        let shown = 0;
        for (const course of data.courses) {
          const matches = `${course.code} ${course.title}`.toLocaleLowerCase().includes(query);
          attr(course.element, 'data-studio-filtered', matches ? null : 'true');
          if (matches) shown++;
        }
        count.textContent = `${shown} of ${data.courses.length} courses`;
        empty.hidden = shown > 0;
      });
    }
    function enhanceResults(root) {
      const blocks = app.parsers.results(root);
      if (!blocks.length) return;
      const latest = blocks.filter(block => block.cgpa !== null).sort((a, b) => {
        const rank = semester => {
          const year = Number(semester.match(/\b\d{4}\b/)?.[0] || 0);
          return year * 10 + (/fall/i.test(semester) ? 3 : /summer/i.test(semester) ? 2 : 1);
        };
        return rank(a.semester) - rank(b.semester);
      }).at(-1);
      const items = [{ label: 'Semester records', value: String(blocks.length), note: 'All original records retained below' }];
      if (latest) {
        items.unshift({ label: 'Published CGPA', value: latest.cgpa.toFixed(2), note: latest.semester });
        items.push({ label: 'Latest graded semester', value: latest.semester, note: `${latest.count} course records` });
      }
      const pending = blocks.filter(block => !block.published).length;
      if (pending) items.push({ label: 'Awaiting complete grades', value: String(pending), note: 'Ungraded placeholders excluded from CGPA' });
      root.querySelector(app.selectors.resultTitle)?.after(cards(items, 'Result card overview'));
    }
    function enhanceAttendance(root) {
      for (const card of root.querySelectorAll(app.selectors.attendanceCards)) {
        const pct = card.querySelector(app.selectors.attendancePercent);
        const value = app.parsers.percentage(app.parsers.text(pct));
        if (value === null) continue;
        const meter = own(element('div', 'studio-attendance-meter'));
        const progress = element('progress');
        progress.max = 100;
        progress.value = value;
        progress.setAttribute('aria-label', app.parsers.text(card.querySelector(app.selectors.attendanceHeading)) || 'Attendance');
        meter.append(progress, element('span', '', `${value}% recorded attendance`));
        pct.parentElement.after(meter);
      }
    }
    function enhanceTables(root) {
      for (const table of root.querySelectorAll(app.selectors.dataTables)) {
        // Nested layout tables are never selected or reformatted as data grids.
        if (table.querySelector('table')) continue;
        attr(table, 'data-studio-table', 'true');
        if (table.matches(app.selectors.resultGrid)) {
          const header = table.rows[0];
          if (header) attr(header, 'data-studio-table-head', 'true');
        }
      }
      for (const link of document.querySelectorAll(app.selectors.activeNavigation)) {
        if (!link.hasAttribute('aria-current')) attr(link, 'aria-current', 'page');
      }
    }
    return {
      clear,
      apply(root) {
        for (const [name, feature] of Object.entries({ tables: enhanceTables, dashboard: enhanceDashboard, results: enhanceResults, attendance: enhanceAttendance })) {
          try { feature(root); }
          catch { console.warn(`[SIS Studio] ${name} enhancement skipped; original portal remains available.`); }
        }
      },
    };
  };
})();
