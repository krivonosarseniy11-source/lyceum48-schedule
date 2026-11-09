const {test}=require('node:test'),assert=require('node:assert/strict');const H=require('../school-core'),S=require('../parser'),T=require('../timing');
const l=(overrides={})=>({class:'9А',day:0,number:1,subject:'Физика',teacher:'Иванов И. И.',room:'10',...overrides});
test('school hours sum unique class slots; concurrent classes share teacher and room occupancy',()=>{
 const lessons=[l(),l(),l({class:'9Б'}),l({day:1,number:9})],d=H.school({lessons,classes:['9А','9Б','9В']},S,T);
 assert.equal(d.total.count,3);assert.equal(d.total.minutes,80);assert.equal(d.total.unknown,1);assert.equal(d.classes.length,3);assert.equal(d.classes.find(c=>c.name==='9В').count,0);
 assert.equal(d.teachers[0].count,2);assert.equal(d.teachers[0].minutes,40);assert.equal(d.teachers[0].unknown,1);assert.equal(d.teachers[0].references,3);assert.equal(d.teachers[0].classes,2);assert.equal(d.rooms[0].count,2);assert.equal(d.days[0].count,2);assert.equal(d.days[0].minutes,80);
 assert.equal(d.classes.reduce((n,c)=>n+c.count,0),d.total.count);assert.equal(d.days.reduce((n,c)=>n+c.count,0),d.total.count);
});
test('subgroup subjects have explicit combined and separate modes without duplicate membership',()=>{
 const lessons=[l({subject:'Физика / Информатика',teacher:'Иванов И.И./Петров П.П.',room:'1/15'}),l({day:1,subject:'Физика'})];
 const combined=H.groups(lessons,'subject',S,T,false),split=H.groups(lessons,'subject',S,T,true);
 assert.equal(combined.length,2);assert.equal(combined.reduce((n,g)=>n+g.count,0),2);assert.equal(split.find(g=>g.name==='Физика').count,2);assert.equal(split.find(g=>g.name==='Информатика').count,1);assert.equal(split.reduce((n,g)=>n+g.minutes,0),120);
 assert.equal(H.groups([l({subject:'Физика/Физика'})],'subject',S,T,true)[0].count,1);assert.equal(H.groups(lessons,'teacher',S,T).length,2);assert.equal(H.groups(lessons,'room',S,T).length,3);
});
test('parallel comparison includes zero-subject classes and separates grades 9 and 10',()=>{
 const data={classes:['9Б','10А','9А','9В'],lessons:[l(),l({class:'9Б',subject:'Химия'}),l({class:'10А',subject:'Биология'})]};const p=H.parallel(data,'9',S,T);
 assert.deepEqual(p.classes,['9А','9Б','9В']);assert.deepEqual(p.totals.map(c=>c.count),[1,1,0]);assert.deepEqual(p.subjects.find(s=>s.name==='Физика').values.map(v=>v.count),[1,0,0]);assert.ok(!p.subjects.some(s=>s.name==='Биология'));assert.equal(H.grade('11Б'),'11');assert.deepEqual(H.parallel(data,'8',S,T).totals,[]);
});
test('class teacher day includes teachers teaching elsewhere, with own-class lesson filter available',()=>{
 const lessons=[l(),l({day:1,teacher:'Петров П.П.'}),l({class:'9Б',teacher:'Петров П.П.',number:2}),l({class:'10А',teacher:'Петров П.П.',number:2}),l({class:'9Б',teacher:'Чужой А.А.',number:3}),l({number:4,teacher:''})];
 const result=H.teachersForClass({lessons},'9А','2026-11-09',S,T);
 assert.equal(result.teachers.length,2);const p=result.teachers.find(t=>t.name.startsWith('Петров'));assert.equal(p.own.length,0);assert.equal(p.count,1);assert.equal(p.all.length,2);assert.equal(p.slots[0].number,2);assert.equal(result.teachers.filter(t=>t.own.length).length,1);assert.equal(result.missing.length,1);assert.ok(!result.teachers.some(t=>t.name.startsWith('Чужой')));
 assert.equal(H.teachersForClass({lessons},'9А','2026-11-02',S,T).teachers.length,0);assert.equal(H.teachersForClass({lessons},'9А','2026-11-08',S,T).teachers.length,0);
});
test('real sheet school totals reconcile across classes/days, and parallel ninth-grade load differs',()=>{
 const data=S.parse(require('../snapshot.json').payload),report=H.school(data,S,T);assert.equal(report.total.count,459);assert.equal(report.total.minutes,18360);assert.equal(report.total.minutes/60,306);assert.equal(report.classes.length,14);assert.equal(report.days.reduce((n,d)=>n+d.minutes,0),report.total.minutes);assert.equal(report.classes.reduce((n,d)=>n+d.count,0),report.total.count);assert.equal(report.days.reduce((a,b)=>a.count>b.count?a:b).day,0);
 const p=H.parallel(data,'9',S,T);assert.deepEqual(p.totals.map(r=>r.count),[39,40,41,40]);assert.ok(report.teachers.every(t=>t.count<=t.references));assert.ok(report.rooms.every(t=>t.count<=t.references));
});
