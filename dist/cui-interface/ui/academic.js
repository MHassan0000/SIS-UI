(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  // Registrar notification of 18 Nov 2021, effective Fall 2021 admissions.
  const grades = [
    ['A', 85, 4], ['A-', 80, 3.66], ['B+', 75, 3.33], ['B', 71, 3],
    ['B-', 68, 2.66], ['C+', 64, 2.33], ['C', 61, 2], ['C-', 58, 1.66],
    ['D+', 54, 1.30], ['D', 50, 1], ['F', 0, 0],
  ].map(([label, minimum, points]) => Object.freeze({ label, minimum, points }));
  const valid = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  function grade(marks) {
    return valid(marks, 0, 100) ? grades.find(g => Math.round(marks) >= g.minimum) : null;
  }
  function semester(courses) {
    if (!Array.isArray(courses) || !courses.length || courses.some(c => !valid(c.credits, 0, 30) || (c.credits > 0 && !valid(c.points, 0, 4)))) return null;
    const credits = courses.reduce((s, c) => s + c.credits, 0);
    const quality = courses.reduce((s, c) => s + (c.credits ? c.credits * c.points : 0), 0);
    return credits ? { credits, quality, gpa: quality / credits } : null;
  }
  function cumulative(current, completed, next, credits) {
    if (!valid(current, 0, 4) || !valid(completed, 0, 1000) || !valid(next, 0, 4) || !valid(credits, 0, 1000) || completed + credits === 0) return null;
    return (current * completed + next * credits) / (completed + credits);
  }
  function target(current, completed, goal, credits) {
    if (!valid(current, 0, 4) || !valid(completed, 0, 1000) || !valid(goal, 0, 4) || !valid(credits, 0.01, 1000)) return null;
    const required = (goal * (completed + credits) - current * completed) / credits;
    return { required, possible: required <= 4 + 1e-10, already: required <= 0 };
  }
  function attendance(present, total, threshold = 80, attend = 0, miss = 0) {
    if (![present, total, attend, miss].every(n => valid(n, 0, 100000) && Number.isInteger(n)) || present > total || !valid(threshold, 1, 100)) return null;
    const p = present + attend, t = total + attend + miss;
    const recover = threshold === 100 ? (p === t ? 0 : Infinity) : Math.max(0, Math.ceil((threshold * t - 100 * p) / (100 - threshold) - 1e-10));
    return { present: p, total: t, percent: t ? 100 * p / t : null,
      missable: t ? Math.max(0, Math.floor(100 * p / threshold - t + 1e-10)) : 0, recover };
  }
  function weighted(parts) {
    if (!parts.length || parts.some(p => !valid(p.obtained, 0, 100000) || !valid(p.total, 0.001, 100000) || p.obtained > p.total || !valid(p.weight, 0.001, 100))) return null;
    const weight = parts.reduce((s, p) => s + p.weight, 0);
    if (weight > 100 + 1e-9) return null;
    return { weight, earned: parts.reduce((s, p) => s + p.obtained / p.total * p.weight, 0) };
  }
  function finalNeeded(earned, completedWeight, goal) {
    if (!valid(completedWeight, 0, 100) || !valid(earned, 0, completedWeight) || !valid(goal, 0, 100)) return null;
    const remaining = 100 - completedWeight, needed = Math.max(0, goal - earned);
    return { remaining, needed, percent: remaining ? needed / remaining * 100 : null, possible: needed <= remaining + 1e-9 };
  }
  app.academic = Object.freeze({ grades, grade, semester, cumulative, target, attendance, weighted, finalNeeded, valid,
    policyURL: 'https://ww2.comsats.edu.pk/qec/downloads/Notification4304.pdf',
    attendanceURL: 'https://ww2.comsats.edu.pk/studentaffairs/' });
})();
