const {test}=require('node:test'),assert=require('node:assert/strict');const U=require('../useful-core'),T=require('../timing'),P=require('../planner-core');
const l=(n,extra={})=>({class:'9Б',day:0,number:n,subject:'Физика',teacher:'Иванов Г. Н.',room:'10',...extra});
test('week board includes weekends, completion state and only the requested class',()=>{
 const tasks=[{id:'a',class:'9Б',due:'2026-11-09',done:false,priority:'normal',subject:'Физика'},{id:'b',class:'9Б',due:'2026-11-15',done:true,priority:'high',subject:'Химия'},{id:'c',class:'9А',due:'2026-11-09',done:false,priority:'normal',subject:'Физика'}];
 assert.equal(U.weekStart('2026-11-15'),'2026-11-09');assert.equal(U.weekStart('2027-01-01'),'2026-12-28');const w=U.week(tasks,'9Б','2026-11-09');assert.equal(w.length,7);assert.equal(w[0].open,1);assert.equal(w[6].date,'2026-11-15');assert.equal(w[6].done,1);assert.equal(w.reduce((s,d)=>s+d.items.length,0),2);
});
test('schedule differences distinguish added, removed, changed and ignore order/format/duplicates',()=>{
 assert.deepEqual(U.diff([l(1),l(2)],[l(2),l(1),l(1)]),[]);assert.deepEqual(U.diff([l(1)],[l(1,{teacher:'Иванов Г.Н.',subject:' физика '})]),[]);
 const changes=U.diff([l(1),l(2)],[l(1,{room:'20'}),l(3)]);assert.deepEqual(changes.map(c=>c.type),['changed','removed','added']);assert.equal(changes[0].before[0].room,'10');assert.equal(changes[0].after[0].room,'20');assert.equal(changes[1].after.length,0);assert.equal(changes[2].before.length,0);
 const payload={from:'2026-11-09T10:00:00Z',date:'2026-11-10T10:00:00Z',changes};assert.ok(U.validChange(payload));assert.ok(!U.validChange({...payload,date:'bad'}));assert.ok(!U.validChange({...payload,changes:[{...changes[0],day:15}]}));
});
test('meeting time uses exact union of busy intervals and full requested duration',()=>{
 const teacher=[l(1),l(3),l(4)],cls=[l(2)],r=U.meeting(teacher,cls,'2026-11-09',15,T,new Date('2026-11-09T04:00:00Z'));
 assert.deepEqual(r.windows,[{start:570,end:590,proposedEnd:585},{start:630,end:645,proposedEnd:645}]);assert.equal(U.meeting(teacher,cls,'2026-11-09',30,T,new Date('2026-11-09T04:00:00Z')).windows.length,0);
 assert.equal(U.meeting([l(1)],[],'2026-11-09',5,T,new Date('2026-11-09T04:00:00Z')).windows.length,0);
});
test('meeting avoids past minutes, holidays and unverifiable unknown-time lessons',()=>{
 const teacher=[l(1),l(3),l(4)],cls=[l(2)];const r=U.meeting(teacher,cls,'2026-11-09',15,T,new Date('2026-11-09T06:35:01Z'));assert.deepEqual(r.windows,[{start:630,end:645,proposedEnd:645}]);
 assert.match(U.meeting(teacher,[l(9)],'2026-11-09',10,T,new Date('2026-11-09T04:00:00Z')).reason,/без времени/);assert.match(U.meeting(teacher,[],'2026-11-02',10,T).reason,/каникулы/);assert.equal(U.meeting(teacher,[],'2026-11-09',61,T).windows.length,0);assert.match(U.meeting(teacher,[],'2026-11-09',10,T,new Date('2026-11-10T04:00:00Z')).reason,/прошедшая/);
});
test('packing hints are optional in old backups, validated and safe to merge',()=>{
 const backup={app:'lyceum48',version:1,tasks:[],notes:{},favorites:[],myClass:'9Б'};assert.deepEqual(P.backup(backup).packingItems,{});const key=JSON.stringify(['9Б','Физика']);assert.equal(P.backup({...backup,packingItems:{[key]:'Линейка, тетрадь'}}).packingItems[key],'Линейка, тетрадь');assert.throws(()=>P.backup({...backup,packingItems:{x:'x'.repeat(501)}}));assert.throws(()=>P.packing([]));assert.equal(Object.hasOwn(P.packing(JSON.parse('{"__proto__":"x"}')),'__proto__'),false);
});
