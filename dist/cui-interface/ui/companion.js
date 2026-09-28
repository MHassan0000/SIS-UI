(() => {
  'use strict';
  const app = globalThis.__sisStudioUI, calc = app.academic, tt = app.timetable;
  const labels = { academics: 'GPA & CGPA', attendance: 'Attendance', marks: 'Marks planner', rooms: 'Room finder', timetable: 'My timetable', history: 'Academic history' };
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const button = (label, action, cls = '') => { const b = el('button', label, cls); b.type = 'button'; b.addEventListener('click', action); return b; };
  const link = (text, href) => { const a = el('a', text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; };
  const field = (label, value = '', type = 'number', min = 0, max = 100, step = 'any') => {
    const wrap = el('label', label), input = document.createElement('input');
    input.type = type; input.value = value ?? ''; input.setAttribute('aria-label', label);
    if (type === 'number') { input.min = min; input.max = max; input.step = step; }
    if (type === 'text') input.maxLength = 120;
    wrap.append(input); return { wrap, input };
  };
  const select = (label, options, value) => {
    const wrap = el('label', label), input = document.createElement('select'); input.setAttribute('aria-label', label);
    options.forEach(([v, name]) => { const o = el('option', name); o.value = v; input.append(o); });
    if (value !== undefined) input.value = value; wrap.append(input); return { wrap, input };
  };
  const num = input => input.value.trim() === '' || !input.validity.valid ? null : Number(input.value);
  const fixed = n => n === null || !Number.isFinite(n) ? '—' : n.toFixed(2);
  const metric = (label, value, note = '') => { const box = el('div', undefined, 'metric'); box.append(el('span', label), el('strong', value), el('span', note)); return box; };
  const note = text => el('p', text, 'note');
  const section = title => { const s = el('section', undefined, 'section'); s.append(el('h3', title)); return s; };
  function table(headers, rows) {
    const wrap = el('div', undefined, 'table-wrap'), t = el('table'), head = el('thead'), tr = el('tr'), body = el('tbody');
    headers.forEach(h => { const th = el('th', h); th.scope = 'col'; tr.append(th); }); head.append(tr);
    rows.forEach(values => { const r = el('tr'); values.forEach(v => r.append(el('td', v))); body.append(r); });
    t.append(head, body); wrap.append(t); return wrap;
  }
  app.createCompanion = () => {
    let host, shadow, workspace, panel, model, active = '', palette, returnFocus, disposed = false, timer, generation = 0;
    const roomCache = new Map();
    const drafts = new Map();
    const saveDraft = () => { if (['academics', 'attendance', 'marks', 'history'].includes(active)) drafts.set(active, [...panel.childNodes]); };
    let directory, publicClasses, timetable, roomPreset;
    const dateTime = date => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }).format(date);
    function renderAcademics() {
      const area = section('Explore your semester');
      area.append(note('Plan locally using registered course credits from this page. These are estimates, separate from official SIS results. Blank grades are not counted as failures.'));
      const cohort = select('Applicable grading policy', [['', 'Choose your policy'], ['current', 'Fall 2021 admissions onward'], ['manual', 'Earlier / other policy — enter grade points']]);
      const mode = select('Enter results as', [['grade', 'Letter grades'], ['marks', 'Aggregate marks / 100']]);
      const top = el('div', undefined, 'fields'); top.append(cohort.wrap, mode.wrap); area.append(top);
      const courseRows = el('div'), summary = el('div', undefined, 'metrics'), status = el('output', undefined, 'result'); status.setAttribute('aria-live', 'polite');
      const rows = [];
      function add(course = {}) {
        if (rows.length >= 30) return;
        const row = el('div', undefined, 'row');
        const name = field('Course', course.title ? `${course.code} · ${course.title}` : '', 'text');
        const credits = field('Credit hours', course.credits ?? '', 'number', 0, 30, '0.5');
        const holder = el('div'); let gradeInput;
        const item = { row, name, credits, holder, get result() { return gradeInput; }, resetInput() {
          holder.replaceChildren();
          const g = cohort.input.value === 'manual' ? field('Grade points', '', 'number', 0, 4) : mode.input.value === 'marks' ? field('Aggregate marks', '', 'number', 0, 100) : select('Expected grade', [['', 'Choose grade'], ...calc.grades.map(g => [g.label, `${g.label} · ${g.points.toFixed(2)}`])]);
          gradeInput = g.input; holder.append(g.wrap); g.input.addEventListener('input', update);
        } };
        item.resetInput(); rows.push(item);
        const remove = button('×', () => { rows.splice(rows.indexOf(item), 1); row.remove(); update(); }, 'remove'); remove.setAttribute('aria-label', 'Remove course');
        row.append(name.wrap, credits.wrap, holder, remove); courseRows.append(row); credits.input.addEventListener('input', update);
      }
      const cgpa = section('Plan your cumulative GPA');
      cgpa.append(note('New-course scenario: repeats, grade replacement and transfer adjustments are not applied. Previous credits must be the credits included in your CGPA (including failed attempts where applicable), not just passed credits. A rounded SIS CGPA makes this projection approximate.'));
      const current = field('Current CGPA', model.history.current, 'number', 0, 4);
      const previous = field('Previous GPA credits', model.history.credits, 'number', 0, 1000);
      const future = field('Upcoming credits', model.courses.length && model.courses.every(c => c.credits !== null) ? model.courses.reduce((s, c) => s + c.credits, 0) : '', 'number', 0.01, 1000);
      const next = field('Projected semester GPA', '', 'number', 0, 4);
      const target = field('Target CGPA', '', 'number', 0, 4);
      const use = button('Use semester scenario', () => { const s = calculate(); if (s) { next.input.value = s.gpa.toFixed(6); future.input.value = s.credits; updatePlan(); } });
      const fields = el('div', undefined, 'fields'); [current, previous, future, next, target].forEach(f => fields.append(f.wrap));
      const plan = el('div'), planStatus = el('output', undefined, 'result'); planStatus.setAttribute('aria-live', 'polite');
      const scenarios = el('div'); cgpa.append(fields, use, plan, planStatus, scenarios);
      if (model.history.credits !== null) cgpa.append(note('Previous credits prefilled from the published, unique credit-bearing rows on this result page. Confirm these against your official CGPA record.'));
      if (model.history.repeated) cgpa.append(note('Repeated course codes detected. Previous GPA credits need manual confirmation; no replacement rule has been assumed.'));
      function calculate() {
        if (!cohort.input.value) return null;
        return calc.semester(rows.map(r => {
          const value = r.result.value;
          let points = cohort.input.value === 'manual' ? num(r.result) : mode.input.value === 'marks' ? calc.grade(num(r.result))?.points ?? null : calc.grades.find(g => g.label === value)?.points ?? null;
          return { credits: num(r.credits.input), points };
        }));
      }
      function update() {
        const result = calculate(); summary.replaceChildren(metric('Projected semester GPA', fixed(result?.gpa ?? null)), metric('Scenario credits', result ? String(result.credits) : '—'), metric('Quality points', fixed(result?.quality ?? null)));
        status.textContent = result ? 'Σ(credit hours × grade points) ÷ Σ(credit hours). Non-credit courses are excluded; F contributes 0 points with its credits included.' : 'Choose the applicable policy and enter valid credits and a result for every credit-bearing course.';
        use.disabled = !result;
      }
      function updatePlan() {
        const c = num(current.input), p = num(previous.input), f = num(future.input), n = num(next.input), g = num(target.input);
        const projected = calc.cumulative(c, p, n, f), required = calc.target(c, p, g, f);
        plan.replaceChildren(); const metrics = el('div', undefined, 'metrics'); metrics.append(metric('Projected CGPA', fixed(projected)), metric('Required semester GPA', required ? required.already ? '0.00' : fixed(required.required) : '—')); plan.append(metrics);
        planStatus.textContent = required ? required.already ? 'Target remains mathematically reachable even with 0 semester GPA. This is not an academic standing decision.' : required.possible ? 'Target is mathematically reachable within the entered credits.' : 'Target is not achievable within these credits, even with a 4.00 semester GPA.' : 'Enter a baseline, upcoming credits and a target to calculate the requirement.';
        scenarios.replaceChildren();
        if (required) scenarios.append(table(['Target CGPA', 'Required GPA', 'Within these credits'], [...new Set([Math.max(0, g - .1), g, Math.min(4, g + .1)].map(x => Number(x.toFixed(2))))].map(goal => { const r = calc.target(c, p, goal, f); return [goal.toFixed(2), fixed(Math.max(0, r.required)), r.possible ? 'Reachable' : 'Not reachable']; })));
        if (projected !== null) scenarios.append(note(`(${c} × ${p} + ${n} × ${f}) ÷ (${p} + ${f}) = ${projected.toFixed(4)}. Displayed to two decimal places.`));
      }
      [current, previous, future, next, target].forEach(f => f.input.addEventListener('input', updatePlan));
      (model.courses.length ? model.courses : [{}]).forEach(add);
      const source = note(model.courses.length ? `Prefilled ${model.courses.length} courses from this SIS page. Adjust credits for your scenario if needed.` : 'Open the Dashboard, Registration Card or Result Card to prefill course credits. You can also add courses manually.');
      cohort.input.addEventListener('change', () => { mode.wrap.hidden = cohort.input.value === 'manual'; rows.forEach(r => r.resetInput()); update(); });
      mode.input.addEventListener('change', () => { rows.forEach(r => r.resetInput()); update(); });
      area.append(source, courseRows, button('Add course', () => { add(); update(); }), summary, status);
      const policy = el('details'); policy.append(el('summary', 'Grading policy & calculation assumptions'), note('Fall 2021 onward: aggregate marks round to the nearest whole number, with .5 rounding upward, before mapping to a grade. D+ is 1.30 in the Registrar notification. Earlier cohorts and other policies use manually entered official grade points; no legacy marks scale is assumed.'), link('Official CUI grading notification', calc.policyURL), table(['Grade', 'Rounded marks from', 'Points'], calc.grades.map(g => [g.label, g.minimum, g.points.toFixed(2)])));
      area.append(policy); panel.append(area, cgpa); update(); updatePlan();
    }
    function renderAttendance() {
      panel.append(el('h3', 'Understand your next classes'), note('Estimates use recorded class counts, separately for lecture and lab. The undergraduate default is 80%; adjust for your applicable requirement. This does not determine official exam eligibility.'), link('Official student affairs guidance', calc.attendanceURL));
      const threshold = field('Attendance target (%)', 80, 'number', 1, 100); panel.append(threshold.wrap);
      if (!model.attendance.length) panel.append(note('Open a course’s Attendance page for automatic lecture/lab counts. Rounded dashboard percentages cannot reliably reconstruct class counts.'));
      const cards = el('div', undefined, 'grid'), updates = [];
      (model.attendance.length ? model.attendance : [{ label: 'Manual attendance scenario', present: '', total: '' }]).forEach(data => {
        const card = el('section', undefined, 'card'); card.append(el('h4', data.label));
        const present = field('Present so far', data.present, 'number', 0, 100000, '1'), total = field('Classes recorded', data.total, 'number', 0, 100000, '1');
        const attend = field('Next classes attended', 0, 'number', 0, 100000, '1'), miss = field('Next classes missed', 0, 'number', 0, 100000, '1');
        const fields = el('div', undefined, 'fields'); [present, total, attend, miss].forEach(f => fields.append(f.wrap));
        const output = el('output', undefined, 'result'); output.setAttribute('aria-live', 'polite'); const detail = el('p');
        const update = () => { const r = calc.attendance(num(present.input), num(total.input), num(threshold.input), num(attend.input), num(miss.input));
          output.textContent = !r ? 'Enter valid whole counts: present cannot exceed recorded classes.' : r.percent === null ? 'No classes recorded yet.' : `${r.present} / ${r.total} → ${r.percent.toFixed(1)}% projected attendance`;
          detail.textContent = !r || r.percent === null ? '' : r.recover ? Number.isFinite(r.recover) ? `Attend the next ${r.recover} consecutive classes to reach ${threshold.input.value}%.` : 'With existing absences, 100% cannot be recovered in a finite number of classes.' : `At this scenario’s counts, missing up to ${r.missable} subsequent classes stays at or above ${threshold.input.value}%.`;
        };
        [present, total, attend, miss].forEach(f => f.input.addEventListener('input', update)); updates.push(update); update(); card.append(fields, output, detail); cards.append(card);
      });
      threshold.input.addEventListener('input', () => updates.forEach(fn => fn())); panel.append(cards);
    }
    function renderMarks() {
      panel.append(el('h3', 'What do I need in the remaining assessments?'), note(model.context || 'Manual course scenario'), el('p', 'Enter completed components using the weights confirmed by your instructor. The uncompleted weight is treated as the remaining assessment pool. Do not enter unmarked work as zero.', 'notice'));
      panel.append(note('No verified assessment-weight model is available from the inspected SIS marks pages. Values below are your scenario inputs, not extracted or official marks. For theory/lab courses, use each component’s contribution to the overall course, not its section-only percentage.'));
      const rows = [], container = el('div');
      const goal = field('Target aggregate (%)', '', 'number', 0, 100);
      const gradeTarget = select('Or use a Fall 2021+ grade boundary', [['', 'Custom target'], ...calc.grades.filter(g => g.minimum).map(g => [String(g.minimum - .5), `${g.label} · ${g.minimum - .5}% before rounding`])]);
      const output = el('output', undefined, 'result'); output.setAttribute('aria-live', 'polite'); const details = el('div');
      function update() {
        const value = calc.weighted(rows.map(r => ({ obtained: num(r.obtained.input), total: num(r.total.input), weight: num(r.weight.input) })));
        const result = value && calc.finalNeeded(value.earned, value.weight, num(goal.input));
        details.replaceChildren();
        output.textContent = !value ? 'Enter valid marks and positive weights; completed weights cannot exceed 100%.' : !result ? 'Enter a target aggregate to calculate the remaining requirement.' : !result.possible ? 'This target is not reachable within the remaining weight.' : result.remaining === 0 ? 'All assessment weight is complete; the target has been reached.' : `Need ${fixed(result.needed)} of ${fixed(result.remaining)} remaining weighted marks (${fixed(result.percent)}% across remaining assessments).`;
        if (value) { const metrics = el('div', undefined, 'metrics'); metrics.append(metric('Weighted marks earned', fixed(value.earned), 'out of 100 course marks'), metric('Weight recorded', `${fixed(value.weight)}%`), metric('Maximum possible total', fixed(value.earned + 100 - value.weight))); details.append(metrics); }
      }
      function add() {
        if (rows.length >= 20) return;
        const card = el('div', undefined, 'card'), fields = el('div', undefined, 'fields');
        const name = field('Component', '', 'text'), obtained = field('Obtained marks', '', 'number', 0, 100000), total = field('Maximum marks', '', 'number', .001, 100000), weight = field('Overall course weight (%)', '', 'number', .001, 100);
        const r = { obtained, total, weight }; rows.push(r); [name, obtained, total, weight].forEach(f => fields.append(f.wrap));
        [obtained, total, weight].forEach(f => f.input.addEventListener('input', update));
        card.append(fields, button('Remove component', () => { rows.splice(rows.indexOf(r), 1); card.remove(); update(); })); container.append(card);
      }
      add(); const fields = el('div', undefined, 'fields'); fields.append(goal.wrap, gradeTarget.wrap);
      gradeTarget.input.addEventListener('change', () => { if (gradeTarget.input.value) goal.input.value = gradeTarget.input.value; update(); });
      goal.input.addEventListener('input', () => { gradeTarget.input.value = ''; update(); });
      panel.append(container, button('Add completed component', () => { add(); update(); }), fields, output, details, link('Rounding and grade boundaries: official notification', calc.policyURL)); update();
    }
    function renderHistory() {
      panel.append(el('h3', 'Your published academic record'), note('SIS CGPA is shown as published. Semester GPA below is calculated from each row’s own grade points and credits, including F. Pending semesters are excluded; repeated courses are not merged.'));
      const history = model.history.semesters.filter(s => s.published);
      if (!history.length) { panel.append(el('p', 'Open Result Card to analyze the published semester history.', 'notice')); const a = el('a', 'Open Result Card'); a.href = '/ResultCard/Index'; panel.append(a); return; }
      const metrics = el('div', undefined, 'metrics'); metrics.append(metric('Latest published CGPA', fixed(model.history.current)), metric('GPA credits in unique rows', model.history.credits === null ? 'Review repeats' : String(model.history.credits)));
      panel.append(metrics, table(['Semester', 'Derived semester GPA', 'Published CGPA', 'CGPA change'], history.map((s, i) => [s.semester, fixed(s.derived?.gpa ?? null), fixed(s.cgpa), i && s.cgpa !== null && history[i - 1].cgpa !== null ? `${s.cgpa - history[i - 1].cgpa >= 0 ? '+' : ''}${(s.cgpa - history[i - 1].cgpa).toFixed(2)}` : '—'])));
      const distribution = new Map(); history.flatMap(s => s.rows).filter(r => r.credits > 0).forEach(r => distribution.set(r.letter, (distribution.get(r.letter) || 0) + 1));
      panel.append(note('Grade distribution counts published credit-bearing attempts. It is not a count of unique courses passed.'), table(['Grade', 'Recorded attempts'], [...distribution]));
    }
    function freshness(schedule) {
      const age = (Date.now() - Date.parse(`${schedule.version}T00:00:00+05:00`)) / 86400000;
      return `${schedule.term} · published ${schedule.version} · fetched ${dateTime(new Date(schedule.readAt))} PKT.${age > 14 ? ' Published more than 14 days ago; confirm changes with your department.' : ''}`;
    }
    function renderRooms() {
      const token = ++generation;
      panel.append(el('h3', 'Find a room for your break'), note('Availability is derived from the official published timetable, not live occupancy. Bookings, holidays and room access may differ. Labs may need permission. Searches fetch only public room schedules and stay in memory for this page.'));
      panel.append(link('Open official CUI Lahore timetable', `${tt.source}?Kind=room`));
      const current = tt.now(), day = select('Day (Pakistan time)', tt.days.map((v, i) => [v, ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]]), roomPreset?.day || current.day);
      const start = field('Start time', tt.time(roomPreset?.start ?? Math.max(510, Math.min(1170, current.minutes))), 'time');
      const duration = select('Available for at least', [['30','30 minutes'],['60','1 hour'],['90','90 minutes'],['120','2 hours'],['180','3 hours']], String(roomPreset ? roomPreset.end - roomPreset.start : 60));
      if (!duration.input.value) { const o = el('option', `${roomPreset.end - roomPreset.start} minutes`); o.value = String(roomPreset.end - roomPreset.start); duration.input.append(o); duration.input.value = o.value; }
      const block = select('Building / room group', [['A','A block'],['B','B block'],['C','C block'],['D','D block'],['N','N block'],['O','O block'],['labs','Labs / special rooms']], 'A');
      const room = select('Specific room', [['','All in selected group']]);
      const filters = el('div', undefined, 'fields'); [day,start,duration,block,room].forEach(f => filters.append(f.wrap));
      const output = el('p', undefined, 'notice'); output.setAttribute('role','status'); const list = el('div', undefined, 'grid room-grid');
      let busy = false, cancelled = false;
      function group(name) { return block.input.value === 'labs' ? !/^[A-Z]-\d/.test(name) : name.startsWith(`${block.input.value}-`) || name.includes(`(${block.input.value}-`); }
      function fillRooms() { room.input.replaceChildren(); const option = el('option','All in selected group'); option.value=''; room.input.append(option); (directory || []).filter(group).forEach(n => { const o=el('option',n);o.value=n;room.input.append(o); }); }
      block.input.addEventListener('change',fillRooms);
      const search = button('Search official timetable', async () => {
        if (busy) return;
        const from=tt.minutes(start.input.value), length=Number(duration.input.value), selectedDay=day.input.value;
        if (from===null || from < 510 || from+length>1230) { output.textContent='Choose an interval within the published timetable hours, 08:30–20:30 PKT.'; return; }
        busy=true;cancelled=false;search.disabled=true;stop.hidden=false;list.replaceChildren();
        try {
          if (!directory) { output.textContent='Loading official room directory…'; directory=await tt.request('room'); fillRooms(); }
          const names = room.input.value ? [room.input.value] : directory.filter(group);
          if (!names.length) throw new Error('No rooms found for this group in the official directory.');
          const selected=names.slice(0,30); let count=0, free=0, unknown=0;
          for (const name of selected) {
            if(cancelled || disposed || token!==generation) break;
            const card=el('div',undefined,'card');card.append(el('h4',name));
            try {
              let schedule=roomCache.get(name); if (!schedule || Date.now()-schedule.readAt>1800000) { schedule=await tt.request('room',name);roomCache.set(name,schedule); }
              if(cancelled || disposed || token!==generation) break;
              const result=tt.availability(schedule,selectedDay,from,from+length);
              if (!result) throw new Error('Outside verified timetable coverage.');
              if (result.free) { free++;card.append(el('p',`No scheduled class · free until ${tt.time(result.until)}`,'ok')); if(result.next) card.append(el('p',`Next: ${result.next.code} at ${tt.time(result.next.start)}`)); }
              else card.append(el('p',`Scheduled: ${result.conflicts.map(e=>`${e.code} ${tt.time(e.start)}–${tt.time(e.end)}`).join('; ')}`));
              card.append(el('small',freshness(schedule)),link('Verify schedule',schedule.url));
            } catch(error) { unknown++;card.append(el('p','Availability unknown','warn'),el('small',error.message)); }
            if(token!==generation || disposed) break;
            list.append(card);count++;output.textContent=`${count}/${selected.length} checked · ${free} without a scheduled class · ${unknown} unavailable. ${tt.time(from)}–${tt.time(from+length)} PKT.`;
          }
          if(token===generation && !disposed && (cancelled || names.length>30)) output.textContent += cancelled ? ' Search stopped; remaining rooms are unknown.' : ' First 30 rooms shown; choose a specific room to check others.';
        } catch(error) { if(token===generation) output.textContent=error.message; }
        finally { busy=false;search.disabled=false;stop.hidden=true; }
      },'primary');
      const stop=button('Stop search',()=>{cancelled=true;});stop.hidden=true;
      const presets=el('div',undefined,'actions');
      presets.append(button('Now · 1 hour',()=>{const n=tt.now();day.input.value=n.day;start.input.value=tt.time(n.minutes);duration.input.value='60';}),button('Next hour',()=>{const n=tt.now();day.input.value=n.day;start.input.value=tt.time(Math.min(1380,(Math.floor(n.minutes/60)+1)*60));duration.input.value='60';}));
      const actions=el('div',undefined,'actions');actions.append(search,stop);panel.append(presets,filters,actions,output,list); fillRooms();output.textContent='Choose a building and time, then search. Unknown or failed schedules are never marked free.';
      roomPreset=null;
    }
    function renderTimetable() {
      const token=++generation;
      panel.append(el('h3','Your teaching week'),note('Choose your public class section to load its official weekly timetable. Check elective groups and repeat courses against your registration. This requests a public class schedule only; your marks, attendance and student ID are not sent.'));
      const chosen=field('Class section',timetable?.who || model.classNames[0] || '', 'text'); chosen.input.placeholder='e.g. FA24-BSE-A';
      const day=select('Day (Pakistan time)',tt.days.map((v,i)=>[v,['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]]),tt.now().day);
      const datalist=el('datalist');datalist.id='studio-public-classes';chosen.input.setAttribute('list',datalist.id);
      const status=el('p',undefined,'notice');status.setAttribute('role','status');const view=el('div');
      const load=button('Load class timetable',async()=>{
        const who=chosen.input.value.trim();if(!who){status.textContent='Choose a class section first.';return;}
        load.disabled=true;status.textContent='Loading official class directory…';
        try{
          publicClasses ||= await tt.request('class');datalist.replaceChildren(...publicClasses.map(n=>{const o=el('option');o.value=n;return o;}));
          const name=publicClasses.find(n=>n.toLowerCase()===who.toLowerCase());if(!name)throw new Error('This section is not listed in the current public timetable. Choose a listed section.');
          const schedule=await tt.request('class',name);if(disposed || token!==generation)return;timetable=schedule;chosen.input.value=name;draw();
        }catch(error){if(token===generation){status.textContent=error.message;view.replaceChildren();}}finally{load.disabled=false;}
      },'primary');
      const fields=el('div',undefined,'fields');fields.append(chosen.wrap,day.wrap);panel.append(fields,datalist,load,status,view,link('Browse the official class directory',`${tt.source}?Kind=class`));
      function draw(){
        if(!timetable)return;view.replaceChildren();status.textContent=freshness(timetable);
        const entries=timetable.entries.filter(e=>e.day===day.input.value).sort((a,b)=>a.start-b.start),now=tt.now();
        if(!entries.length){view.append(note('No classes listed for this day in this section’s timetable. Confirm holidays and special arrangements separately.'));return;}
        const next=day.input.value===now.day?entries.find(e=>e.start>now.minutes):null;
        if(next)view.append(el('p',`Next: ${next.code} in ${next.start-now.minutes} minutes · ${next.room}`,'notice'));
        const timeline=el('div',undefined,'timeline');
        const items=[...entries.map(e=>({...e,type:'class'})),...tt.gaps(entries).map(g=>({...g,type:'gap'}))].sort((a,b)=>a.start-b.start);
        for(const e of items){const card=el('div',undefined,'card');const desc=el('div');desc.append(el('small',`${tt.time(e.start)}–${tt.time(e.end)} PKT`),el('h4',e.type==='gap'?'Study break':e.code));
          if(e.type==='gap')card.append(desc,button('Find a room',()=>{roomPreset={day:day.input.value,start:e.start,end:e.end};open('rooms');}));
          else {desc.append(el('p',e.room||'Room not specified'));if(day.input.value===now.day && e.start<=now.minutes && e.end>now.minutes){card.classList.add('current');desc.append(el('span','Scheduled now','pill'));}card.append(desc);}timeline.append(card);
        }
        view.append(timeline,link('Verify full weekly timetable',timetable.url));
      }
      day.input.addEventListener('change',draw);timer=setInterval(()=>{if(timetable && active==='timetable' && !shadow.activeElement?.matches('input,select'))draw();},60000);
      if(timetable)draw();else status.textContent='Choose your section to see classes, the next scheduled class, and gaps you can use for study.';
    }
    function open(name) {
      if(!host || !labels[name])return;
      saveDraft();
      generation++;clearInterval(timer);active=name;workspace.hidden=false;panel.replaceChildren();
      shadow.querySelectorAll('[role=tab]').forEach(b=>{const selected=b.dataset.tab===name;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
      panel.setAttribute('aria-labelledby',`studio-tab-${name}`);
      if (drafts.has(name)) panel.append(...drafts.get(name));
      else ({academics:renderAcademics,attendance:renderAttendance,marks:renderMarks,rooms:renderRooms,timetable:renderTimetable,history:renderHistory})[name]();
      shadow.querySelector(`[data-tab="${name}"]`).focus({preventScroll:true});
    }
    function commands(){
      if(palette.open)return;returnFocus=shadow.activeElement || document.activeElement;palette.showModal();
      const search=palette.querySelector('input'),list=palette.querySelector('.commands');search.value='';
      const nav=app.adapter.navigation();
      // Course links are offered only when the native course navigation is present.
      const courseLinks=[...document.querySelectorAll('.circuled_menu_boxes a[href]')].flatMap(a=>{const u=new URL(a.getAttribute('href'),location.href);return u.origin===location.origin && !u.search && !u.hash?[{label:a.textContent.trim(),href:u.href}]:[];});
      function draw(){list.replaceChildren();const query=search.value.toLowerCase();for(const [name,label] of Object.entries(labels)){if(label.toLowerCase().includes(query))list.append(button(label,()=>{palette.close();open(name);}));}for(const dest of [...nav,...courseLinks]){if(!dest.label.toLowerCase().includes(query))continue;const a=el('a',dest.label);a.href=dest.href;list.append(a);}if(!list.children.length)list.append(note('No matching tools or visible SIS destinations.'));}
      search.oninput=draw;draw();search.focus();
    }
    function keydown(event){
      if((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k' && !event.altKey){event.preventDefault();commands();}
    }
    function mount(root){
      model=app.companionData.read(root);disposed=false;
      host=el('section');host.id='sis-studio-companion';host.dataset.sisStudioOwned='companion';shadow=host.attachShadow({mode:'open'});
      const style=el('style',app.companionStyle);shadow.append(style);
      const bar=el('div',undefined,'bar'),title=el('div');title.append(el('strong','Student Companion'),el('small','Plan your semester. Make the most of your day.'));
      const actions=el('div',undefined,'actions');actions.append(button('GPA & CGPA',()=>open('academics'),'primary'),button('Find a room',()=>open('rooms')),button('Search · Ctrl K',commands));
      if(model.attendance.length)actions.prepend(button('Attendance what-if',()=>open('attendance'),'primary'));
      else if(/\/MarksSummary\b/i.test(location.pathname))actions.prepend(button('Plan course marks',()=>open('marks'),'primary'));
      else if(model.history.semesters.length)actions.prepend(button('Analyze results',()=>open('history')));
      else if(model.classNames.length)actions.prepend(button('My timetable',()=>open('timetable')));
      bar.append(title,actions);workspace=el('div',undefined,'workspace');workspace.hidden=true;
      const heading=el('div',undefined,'heading'),intro=el('div');intro.append(el('h2','A little clarity for your semester'),el('small','Local calculations · Official timetable · Your choices'));
      heading.append(intro,button('Close',()=>{saveDraft();generation++;clearInterval(timer);workspace.hidden=true;active='';actions.querySelector('button')?.focus();}));
      const tabs=el('div',undefined,'tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Student companion tools');
      for(const [name,label] of Object.entries(labels)){const b=button(label,()=>open(name));b.dataset.tab=name;b.id=`studio-tab-${name}`;b.setAttribute('role','tab');b.setAttribute('aria-selected','false');b.setAttribute('aria-controls','studio-tool-panel');b.tabIndex=-1;tabs.append(b);}
      tabs.addEventListener('keydown',e=>{const list=[...tabs.children],i=list.indexOf(e.target);if(i<0)return;let next;if(e.key==='ArrowRight')next=(i+1)%list.length;if(e.key==='ArrowLeft')next=(i+list.length-1)%list.length;if(e.key==='Home')next=0;if(e.key==='End')next=list.length-1;if(next!==undefined){e.preventDefault();open(list[next].dataset.tab);}});
      panel=el('section',undefined,'panel');panel.id='studio-tool-panel';panel.setAttribute('role','tabpanel');panel.tabIndex=0;
      const footer=el('div',undefined,'footer');
      const readLabel=el('span',`SIS values read ${dateTime(model.readAt)} PKT. Plans clear on navigation or reload.`, 'muted');
      footer.append(readLabel,button('Clear companion data',()=>{const target=active||'academics';active='';drafts.clear();roomCache.clear();directory=null;publicClasses=null;timetable=null;model={courses:[],history:{semesters:[],current:null,credits:null,repeated:false},attendance:[],classNames:[],context:'',readAt:new Date()};readLabel.textContent='Companion data cleared. Read this SIS page again to restore prefills.';open(target);}),button('Read this SIS page again',()=>{const target=active||'academics';active='';drafts.clear();model=app.companionData.read(root);readLabel.textContent=`SIS values read ${dateTime(model.readAt)} PKT. Plans clear on navigation or reload.`;open(target);}));
      workspace.append(heading,tabs,panel,footer);
      palette=el('dialog');palette.setAttribute('aria-label','Find a SIS page or companion tool');const ph=el('div',undefined,'heading');ph.append(el('h3','Go straight there'),button('Close',()=>palette.close()));const search=field('Find a page or tool','','search');palette.append(ph,search.wrap,el('div',undefined,'commands'));
      palette.addEventListener('close',()=>{returnFocus?.focus?.({preventScroll:true});});
      palette.addEventListener('keydown',e=>{if(e.key==='ArrowDown' && e.target===search.input){e.preventDefault();palette.querySelector('.commands button,.commands a')?.focus();}});
      shadow.append(bar,workspace,palette);root.prepend(host);document.addEventListener('keydown',keydown);
    }
    function clear(){disposed=true;generation++;clearInterval(timer);document.removeEventListener('keydown',keydown);if(palette?.open)palette.close();host?.remove();host=null;active='';drafts.clear();roomCache.clear();directory=null;publicClasses=null;timetable=null;}
    return { sync(root){if(!host?.isConnected){clear();mount(root);}}, clear };
  };
})();
