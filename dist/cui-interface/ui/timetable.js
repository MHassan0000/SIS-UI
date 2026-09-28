(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const source = 'https://sfs.cuilahore.edu.pk/schedule/Public/Timetable';
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  // Template contents remain inert, including images/iframes in remote HTML.
  const parseDocument = html => { const template = document.createElement('template'); template.innerHTML = html; return template.content; };
  const time = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  function minutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value)) return null;
    const [h, m] = value.split(':').map(Number);
    return h < 24 && m < 60 ? h * 60 + m : null;
  }
  function now(date = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
    return { day: ({ Mon: 'Mo', Tue: 'Tu', Wed: 'We', Thu: 'Th', Fri: 'Fr', Sat: 'Sa', Sun: 'Su' })[parts.weekday], minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function directory(html) {
    const doc = parseDocument(html);
    // Parse only the public list literal, never execute remote scripts.
    const literal = [...doc.querySelectorAll('script')].map(s => s.textContent.match(/const all\s*=\s*(\[[^;]*\]);/)?.[1]).find(Boolean);
    if (!literal) throw new Error('The official room directory format has changed. Open the source timetable.');
    const names = JSON.parse(literal);
    if (!Array.isArray(names) || !names.length || names.length > 1000 || names.some(n => typeof n !== 'string' || n.length > 150)) throw new Error('Invalid timetable directory.');
    return names;
  }
  function parse(html, kind, who) {
    const doc = parseDocument(html);
    const grid = doc.querySelector('table.grid');
    const text = clean(doc.textContent);
    const version = text.match(/v\.\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    const term = text.match(/(?:Spring|Summer|Fall)\s+20\d{2}\s+Timetable/)?.[0];
    if (!grid || !version || !term || clean(doc.querySelector('#whoInput')?.value) !== who) throw new Error('The official timetable could not be verified. Availability is unknown.');
    const headers = [...grid.querySelectorAll('thead .ptime')];
    let previous = -1;
    const boundaries = [];
    for (const header of headers) {
      const vals = [...header.querySelectorAll('div')].map(e => minutes(clean(e.textContent)));
      if (vals.length !== 2 || vals.includes(null)) throw new Error('Unrecognized timetable hours.');
      let [start, end] = vals;
      while (start <= previous) start += 720;
      while (end <= start) end += 720;
      if (start >= 1440 || end > 1440 || (boundaries.length && start !== boundaries.at(-1)[1])) throw new Error('Timetable hours are not contiguous.');
      boundaries.push([start, end]); previous = start;
    }
    if (!boundaries.length) throw new Error('No timetable hours available.');
    const occupied = [], coverage = new Set(), rows = [...grid.querySelectorAll('tbody > tr')];
    const spans = [];
    let day = null;
    rows.forEach((row, ri) => {
      const label = clean(row.querySelector('.daycol')?.textContent);
      if (label) { if (!days.includes(label)) throw new Error('Unknown timetable day.'); day = label; coverage.add(day); }
      if (!day) throw new Error('Missing timetable day.');
      let column = 0;
      for (const cell of [...row.cells].filter(c => !c.classList.contains('daycol'))) {
        while ((spans[column] || 0) > ri) column++;
        const width = cell.colSpan || 1, height = cell.rowSpan || 1;
        if (column + width > boundaries.length || height < 1) throw new Error('Invalid timetable cell span.');
        for (let c = column; c < column + width; c++) { if ((spans[c] || 0) > ri) throw new Error('Overlapping timetable layout.'); spans[c] = ri + height; }
        const blocks = [...cell.querySelectorAll('.blk, .brklabel')];
        if (clean(cell.textContent) && !blocks.length) throw new Error('Unrecognized booking.');
        for (const block of blocks) occupied.push({ day, start: boundaries[column][0], end: boundaries[column + width - 1][1],
          code: clean(block.querySelector('.code')?.textContent) || (block.classList.contains('brklabel') ? clean(block.textContent) : 'Reserved'), room: kind === 'room' ? who : clean(block.querySelector('.room')?.textContent),
          group: kind === 'room' ? clean(block.querySelector('.mid2')?.textContent) : '' });
        column += width;
      }
      while ((spans[column] || 0) > ri) column++;
      if (column !== boundaries.length) throw new Error('Incomplete timetable row.');
    });
    if (coverage.size !== 7) throw new Error('Incomplete timetable week.');
    return { kind, who, version, term, start: boundaries[0][0], end: boundaries.at(-1)[1], entries: occupied, readAt: Date.now(), url: `${source}?Kind=${kind}&Who=${encodeURIComponent(who)}` };
  }
  function availability(schedule, day, start, end) {
    if (!days.includes(day) || !Number.isFinite(start) || !Number.isFinite(end) || start >= end || start < schedule.start || end > schedule.end) return null;
    const entries = schedule.entries.filter(e => e.day === day).sort((a, b) => a.start - b.start);
    const conflicts = entries.filter(e => e.start < end && e.end > start);
    const next = entries.find(e => e.start >= end);
    return { free: !conflicts.length, conflicts, next, until: next?.start ?? schedule.end };
  }
  function gaps(entries) {
    const sorted = [...entries].sort((a, b) => a.start - b.start), result = [];
    let end = sorted[0]?.end;
    for (const entry of sorted.slice(1)) { if (entry.start > end) result.push({ start: end, end: entry.start }); end = Math.max(end, entry.end); }
    return result;
  }
  async function request(kind, who = '') {
    const result = await chrome.runtime.sendMessage({ type: 'sis-studio-public-timetable', kind, who });
    if (!result?.ok) throw new Error(result?.error || 'Timetable unavailable. Reload the extension, or open the official timetable.');
    if (!who) return directory(result.html);
    const schedule = parse(result.html, kind, who);
    if (Number.isFinite(result.fetchedAt)) schedule.readAt = result.fetchedAt;
    return schedule;
  }
  app.timetable = { days, source, time, minutes, now, directory, parse, availability, gaps, request };
})();
