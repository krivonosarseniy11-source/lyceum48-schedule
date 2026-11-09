const {test}=require('node:test'),assert=require('node:assert/strict');const Q=require('../search-core'),S=require('../parser'),T=require('../timing');
const lesson={class:'9Б',day:0,number:2,subject:'Физика / Информатика',teacher:'Викторенко Г. Н./Иванов П. П.',room:'1/15'};
const defaults=()=>Q.readParams(new URLSearchParams());
test('search supports AND, OR, phrases, exclusions and normalized Russian initials',()=>{
 for(const q of ['физика викторенко','химия | физика','"ФИЗИКА / информатика"','викторенко г.н.','-химия','физика -химия','химия -информатика | физика'])assert.ok(Q.queryMatch(lesson,q,S.rooms),q);
 for(const q of ['химия викторенко','физика -информатика','"физика информатика"','химия | биология'])assert.ok(!Q.queryMatch(lesson,q,S.rooms),q);
 assert.ok(Q.queryMatch({...lesson,subject:'Всё о физике'},'"все о физике"',S.rooms));assert.ok(Q.queryMatch(lesson,' | ',S.rooms));
});
test('combined filters match exact subgroup teachers/rooms and inclusive lesson limits',()=>{
 const a={...defaults(),days:[0,2],first:'2',last:'4',teacher:'Иванов П.П.',room:'1'};assert.ok(Q.filter(lesson,a,S,T));assert.ok(!Q.filter(lesson,{...a,room:'5'},S,T));assert.ok(!Q.filter(lesson,{...a,days:[1]},S,T));assert.ok(!Q.filter(lesson,{...a,first:'3'},S,T));assert.ok(!Q.filter(lesson,{...a,last:'1'},S,T));
});
test('time ranges use interval overlap and exclude touching boundaries and unknown slots',()=>{
 const a={...defaults(),start:'09:00',end:'09:31'};assert.ok(Q.filter(lesson,a,S,T));assert.ok(!Q.filter(lesson,{...a,start:'09:30'},S,T));assert.ok(!Q.filter(lesson,{...a,start:'08:00',end:'08:50'},S,T));assert.ok(!Q.filter(lesson,{...a,start:'10:00',end:'09:00'},S,T));assert.ok(!Q.filter({...lesson,number:9},a,S,T));
});
test('missing-data filters and URL normalization round trip',()=>{
 assert.ok(Q.filter({...lesson,teacher:''},{...defaults(),missing:'teacher'},S,T));assert.ok(!Q.filter(lesson,{...defaults(),missing:'teacher'},S,T));assert.ok(Q.filter({...lesson,room:''},{...defaults(),missing:'room'},S,T));assert.ok(Q.filter({...lesson,number:9},{...defaults(),missing:'time'},S,T));
 const a=Q.readParams(new URLSearchParams('sdays=4,0,4,9&first=2&last=15&start=09:00&end=12:00&teacher=Иванов&room=1&missing=room'));assert.deepEqual(a.days,[0,4]);assert.deepEqual(Q.readParams(new URLSearchParams(Q.params(a))),a);assert.ok(Q.active(a));assert.ok(!Q.active(defaults()));const invalid=Q.readParams(new URLSearchParams('first=-1&last=200&start=24:00&missing=x'));assert.equal(invalid.first,'');assert.equal(invalid.last,'');assert.equal(invalid.start,'');assert.equal(invalid.missing,'');
});
test('analysis counts occupied slots once, excludes ordinary breaks from windows, and keeps unknown time',()=>{
 const lessons=[{...lesson,number:1,room:'1'},{...lesson,number:1,room:'1'},{...lesson,number:3,room:'2'},{...lesson,number:4,room:'2'},{...lesson,number:9,room:''}];const d=Q.analyze(lessons,S,T)[0];assert.deepEqual(d.numbers,[1,3,4,9]);assert.deepEqual(d.windows,[2,5,6,7,8]);assert.equal(d.minutes,120);assert.equal(d.windowMinutes,200);assert.equal(d.longest,2);assert.equal(d.changes,1);assert.equal(d.unknown,1);assert.equal(d.start,480);assert.equal(d.end,685);assert.equal(d.conflicts.length,0);
 const normal=Q.analyze([{...lesson,number:1},{...lesson,number:2}],S,T)[0];assert.equal(normal.windows.length,0);assert.equal(normal.minutes,80);assert.equal(normal.changes,0);
});
test('analysis keeps subgroup ambiguity out of room changes and reports concurrent classes',()=>{
 const ls=[{...lesson,class:'9А',number:1},{...lesson,class:'9Б',number:1},{...lesson,number:2,room:'25'}];const d=Q.analyze(ls,S,T)[0];assert.equal(d.conflicts.length,1);assert.equal(d.conflicts[0].number,1);assert.equal(d.changes,0);assert.equal(d.numbers.length,2);assert.equal(d.records.length,3);const empty=Q.analyze([],S,T);assert.equal(empty.length,6);assert.ok(empty.every(d=>d.start===null&&!d.numbers.length&&!d.windows.length));
});
