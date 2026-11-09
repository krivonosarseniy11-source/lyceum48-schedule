const {test}=require('node:test'),assert=require('node:assert/strict');const D=require('../daily-core'),T=require('../timing');
const l=(day,number=1)=>({day,number,class:'9Б',subject:'Физика',teacher:'Иванов',room:'10'});
test('actual tomorrow preserves Sunday and holidays; next school day skips them',()=>{
 assert.equal(D.addDays('2026-11-07',1),'2026-11-08');assert.equal(D.weekday('2026-11-08'),6);
 const ls=[l(0),l(5)];assert.deepEqual(D.lessonsOn(ls,'2026-11-08',T.holiday),[]);assert.equal(D.nextDay(ls,'2026-11-07',T.holiday),'2026-11-09');assert.equal(D.nextDay(ls,'2026-10-24',T.holiday),'2026-11-07');assert.equal(D.nextDay([], '2026-11-09',T.holiday),'');assert.equal(D.nextDay(ls,'2027-05-26',T.holiday),'');assert.equal(D.addDays('2026-12-31',1),'2027-01-01');
});
test('daily boundaries use actual first and last slot, preserving unknown times',()=>{
 const ls=[l(0,4),l(0,2),l(0,2)];assert.deepEqual(D.bounds(ls,T.slot),{start:530,end:685,unknown:false,count:2});assert.deepEqual(D.bounds([...ls,l(0,9)],T.slot),{start:530,end:null,unknown:true,count:3});assert.deepEqual(D.bounds([],T.slot),{start:null,end:null,unknown:false,count:0});
});
test('departure allows zero travel, saves ten-minute buffer and handles a prior day',()=>{
 assert.deepEqual(D.departure(480,20),{time:'07:30',dayOffset:0});assert.deepEqual(D.departure(530,0),{time:'08:40',dayOffset:0});assert.deepEqual(D.departure(30,40),{time:'23:40',dayOffset:-1});assert.equal(D.departure(null,20),null);for(const n of [-1,181,2.5,NaN])assert.equal(D.departure(480,n),null);
});
test('day copy includes actual date, subjects and rooms but excludes private homework and notes',()=>{
 const text=D.dayText('9Б','2026-11-10',[{...l(1),notes:'Личное',text:'Секрет'}],T.slot);assert.ok(text.startsWith('9Б класс · 10.11.2026'));assert.ok(text.includes('1. 08:00–08:40 · Физика · 10'));assert.ok(!text.includes('Личное'));assert.ok(!text.includes('Секрет'));assert.ok(D.dayText('9Б','2026-11-10',[l(1,9)],T.slot).includes('Время не указано'));
});
