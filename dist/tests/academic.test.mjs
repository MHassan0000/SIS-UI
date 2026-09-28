import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ globalThis: { __sisStudioUI: {} }, Intl, Date });
for (const name of ['academic', 'timetable']) vm.runInContext(readFileSync(new URL(`../cui-interface/ui/${name}.js`, import.meta.url), 'utf8'), context);
const { academic: a, timetable: t } = context.globalThis.__sisStudioUI;
test('official grade boundaries, half-up rounding and D+ 1.30', () => {
  for (const [marks, letter] of [[0,'F'],[49.49,'F'],[49.5,'D'],[53.49,'D'],[53.5,'D+'],[57.5,'C-'],[60.5,'C'],[63.5,'C+'],[67.5,'B-'],[70.49,'B-'],[70.5,'B'],[74.5,'B+'],[79.5,'A-'],[84.5,'A'],[100,'A']]) assert.equal(a.grade(marks)?.label, letter, String(marks));
  assert.equal(a.grade(54).points, 1.30);
  for (const bad of [null, undefined, '', '85', -1, 100.01, NaN, Infinity]) assert.equal(a.grade(bad), null);
});
test('weighted semester includes failures, excludes zero credits, rejects missing grades', () => {
  const s = a.semester([{ credits: 4, points: 4 }, { credits: 3, points: 3.33 }, { credits: 2, points: 0 }, { credits: 0, points: null }]);
  assert.equal(s.credits,9);assert.ok(Math.abs(s.quality-25.99)<1e-12);assert.ok(Math.abs(s.gpa-25.99/9)<1e-12);
  for (const rows of [[], [{credits:0,points:4}], [{credits:3,points:null}], [{credits:-1,points:4}], [{credits:3,points:4.1}]]) assert.equal(a.semester(rows),null);
});
test('CGPA and targets are credit weighted and do not clamp impossible requirements', () => {
  assert.ok(Math.abs(a.cumulative(3.69,88,3.67,19) - (3.69*88+3.67*19)/107) < 1e-12);
  assert.equal(a.cumulative(0,0,4,18),4);assert.equal(a.cumulative(3,0,3,0),null);
  assert.ok(Math.abs(a.target(3.24,74,3.4,18).required - 4.057777777777778) < 1e-12);
  assert.equal(a.target(3.24,74,3.4,18).possible,false);
  assert.equal(a.target(4,30,0,15).already,true);assert.equal(a.target(3,30,4,0),null);
});
test('attendance exact boundaries, recovery, empty records and 100% targets', () => {
  assert.equal(a.attendance(21,25).missable,1);
  assert.equal(a.attendance(18,24).recover,6);
  assert.ok(Math.abs(a.attendance(18,22,80,0,1).percent-100*18/23)<1e-10);
  assert.equal(a.attendance(0,0).percent,null);
  assert.equal(a.attendance(4,4).missable,1);
  assert.equal(a.attendance(7,10,100).recover,Infinity);
  assert.equal(a.attendance(10,10,100).missable,0);
  assert.equal(a.attendance(2,1),null);assert.equal(a.attendance(1.5,3),null);assert.equal(a.attendance(1,3,0),null);
});
test('weighted assessments never assume weights or zero-fill missing marks', () => {
  const v=a.weighted([{obtained:8,total:10,weight:20},{obtained:22,total:25,weight:30}]);
  assert.equal(v.earned,42.4);assert.equal(v.weight,50);
  const r=a.finalNeeded(v.earned,v.weight,79.5);assert.ok(Math.abs(r.needed-37.1)<1e-10);assert.ok(Math.abs(r.percent-74.2)<1e-10);
  assert.equal(a.finalNeeded(30,80,85).possible,false);assert.equal(a.finalNeeded(90,100,80).needed,0);
  for(const values of [[],[{obtained:null,total:10,weight:10}],[{obtained:11,total:10,weight:10}],[{obtained:5,total:0,weight:10}],[{obtained:5,total:10,weight:101}]])assert.equal(a.weighted(values),null);
});
test('room interval boundaries, overlaps, unknown coverage and timetable gaps', () => {
  const s={start:510,end:1230,entries:[{day:'Mo',start:540,end:600},{day:'Mo',start:590,end:630},{day:'Mo',start:720,end:810}]};
  assert.equal(t.availability(s,'Mo',510,540).free,true);
  assert.equal(t.availability(s,'Mo',540,541).free,false);
  assert.equal(t.availability(s,'Mo',600,630).free,false);
  assert.equal(t.availability(s,'Mo',630,720).free,true);
  assert.equal(t.availability(s,'Mo',630,720).until,720);
  assert.equal(t.availability(s,'Mo',630,721).free,false);
  assert.equal(t.availability(s,'Tu',540,600).free,true);
  assert.equal(t.availability(s,'Mo',500,600),null);
  assert.equal(t.availability(s,'Mo',600,600),null);
  assert.equal(JSON.stringify(t.gaps(s.entries)),JSON.stringify([{start:630,end:720}]));
});
test('Pakistan day and clock are independent of browser time zone',()=>{
  const value=t.now(new Date('2026-09-27T20:15:00Z'));
  assert.equal(value.day,'Mo');assert.equal(value.minutes,75);
  assert.equal(t.minutes('24:00'),null);assert.equal(t.minutes('08:60'),null);assert.equal(t.minutes('08:30'),510);assert.equal(t.time(1230),'20:30');
});
test('minimum displayed scores round up, without floating-point whole-cent overshoot',()=>{
  for(const [n,expected] of [[3.991,'4.00'],[3.99,'3.99'],[4.00001,'4.01'],[74.201,'74.21'],[0,'0.00'],[3.3300000000000005,'3.33']])assert.equal(a.minimumDisplay(n),expected);
});
test('all grade boundaries reject the value just below the rounding threshold',()=>{
  for(let i=0;i<a.grades.length-1;i++){
    const boundary=a.grades[i].minimum-.5;
    assert.equal(a.grade(boundary).label,a.grades[i].label);
    assert.equal(a.grade(boundary-.0001).label,a.grades[i+1].label);
  }
});
test('attendance recovery and miss allowance agree with exhaustive integer scenarios',()=>{
  for(let total=1;total<=60;total++)for(let present=0;present<=total;present++){
    const r=a.attendance(present,total,80);
    assert.ok((present+r.recover)/(total+r.recover)>=.8-1e-12);
    if(r.recover>0)assert.ok((present+r.recover-1)/(total+r.recover-1)<.8+1e-12);
    if(present/total>=.8){assert.ok(present/(total+r.missable)>=.8-1e-12);assert.ok(present/(total+r.missable+1)<.8);}
  }
});
