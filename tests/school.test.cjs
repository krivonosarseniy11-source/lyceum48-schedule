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
test('compare grades separates totals, per-class diversity averages and missing cohorts',()=>{
 const data={classes:['5А','5Б','6А'],lessons:[l({class:'5А',subject:'Математика',room:'1'}),l({class:'5А',number:2,subject:'Русский язык',teacher:'Петров П.П.',room:'2'}),l({class:'5Б',subject:'Математика',room:'1'}),l({class:'6А',subject:'Физика',teacher:'Сидоров С.С.',room:'3'}),l({class:'6А',day:1,subject:'Физика',teacher:'Сидоров С.С.',room:'3'})]};
 const r=H.compare(data,'grades',['5','6','7','5'],S,T);assert.equal(r.items.length,3);assert.equal(r.items[0].classCount,2);assert.equal(r.items[0].count,3);assert.equal(r.items[0].minutes,120);assert.equal(r.items[0].count/r.items[0].classCount,1.5);assert.equal(r.items[0].subjectCount,2);assert.equal(r.items[0].teacherCount,2);assert.equal(r.items[0].roomCount,2);assert.equal(r.items[0].avgSubjects,1.5);assert.equal(r.items[0].avgTeachers,1.5);assert.equal(r.items[0].avgRooms,1.5);assert.equal(r.items[1].count/r.items[1].classCount,2);assert.equal(r.items[2].available,false);
 const math=r.matrices.subject.find(g=>g.name==='Математика');assert.deepEqual(math.values.map(v=>v?.count??null),[2,0,null]);assert.equal(r.matrices.day.length,6);assert.deepEqual(r.matrices.day[0].values.map(v=>v?.count??null),[3,1,null]);
});
test('within-grade comparison shows exact subject, teacher, room diversity and all memberships',()=>{
 const data={classes:['8А','8Б'],lessons:[l({class:'8А',subject:'Физика/Информатика',teacher:'Иванов И.И./Петров П.П.',room:'1/2'}),l({class:'8А',number:2,subject:'Физика',teacher:'Иванов И.И.',room:'1'}),l({class:'8Б',subject:'Химия',teacher:'Петров П.П.',room:'2'})]};
 const r=H.compare(data,'classes',['8А','8Б'],S,T,true);assert.deepEqual(r.items.map(g=>g.count),[2,1]);assert.deepEqual(r.items.map(g=>g.subjectCount),[2,1]);assert.deepEqual(r.items.map(g=>g.teacherCount),[2,1]);assert.deepEqual(r.items.map(g=>g.roomCount),[2,1]);assert.deepEqual(r.matrices.subject.find(g=>g.name==='Физика').values.map(v=>v.count),[2,0]);assert.deepEqual(r.matrices.teacher.find(g=>g.name==='Петров П. П.').values.map(v=>v.count),[1,1]);assert.deepEqual(r.matrices.room.find(g=>g.name==='1').values.map(v=>v.count),[2,0]);
});
test('comparison matrices measure class workload, deduplicate duplicate records and retain unknown times',()=>{
 const lessons=[l({class:'8А'}),l({class:'8А'}),l({class:'8Б'}),l({class:'8Б',number:9})],data={classes:['8А','8Б'],lessons},r=H.compare(data,'grades',['8'],S,T);
 assert.equal(r.items[0].count,3);assert.equal(r.items[0].unknown,1);assert.equal(r.matrices.teacher[0].values[0].count,3);assert.equal(r.matrices.teacher[0].values[0].minutes,80);assert.equal(r.matrices.teacher[0].values[0].unknown,1);assert.equal(H.school(data,S,T).teachers[0].count,2);assert.deepEqual(H.compare(data,'classes',[],S,T).items,[]);
});
test('real cohort comparison metrics reconcile and has teacher/room differences within ninth grade',()=>{
 const data=S.parse(require('../snapshot.json').payload),r=H.compare(data,'grades',['5','9','10','11'],S,T);assert.equal(r.items.reduce((n,g)=>n+g.count,0),459);assert.equal(r.items.reduce((n,g)=>n+g.minutes,0),18360);assert.equal(r.items.find(g=>g.id==='9').classCount,4);
 const c=H.compare(data,'classes',['9А','9Б','9В','9Г'],S,T,true);assert.deepEqual(c.items.map(g=>g.count),[39,40,41,40]);assert.ok(c.matrices.teacher.some(row=>new Set(row.values.map(v=>v.count)).size>1));assert.ok(c.matrices.room.some(row=>new Set(row.values.map(v=>v.count)).size>1));
});
