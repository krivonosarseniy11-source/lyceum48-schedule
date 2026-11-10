const {test}=require('node:test'),assert=require('node:assert/strict');const F=require('../features-core'),P=require('../planner-core'),S=require('../parser'),T=require('../timing');
const l=(overrides={})=>({class:'9А',day:0,number:1,subject:'Физика',teacher:'Иванов И.И.',room:'1',...overrides});
const event={id:'event-1',class:'9А',title:'Контрольная',date:'2026-11-09',time:'09:00',duration:40,type:'test',subject:'Физика',notes:'Взять линейку'};
const preset={id:'preset-1',name:'Учителя 9-х',mode:'classes',grade:'9',selected:['9А','9Б'],unit:'count',basis:'total',dimension:'teacher',split:'split',differences:true};
test('room intervals use half-open overlap and unknown lessons never imply a free room',()=>{
 const lessons=[l(),l({number:2,room:'2'}),l({number:9,room:'3'}),l({day:1,room:'4'})];
 const r=F.rooms(lessons,0,'08:40','08:50',S,T);assert.equal(r.error,'');assert.deepEqual(r.rooms,[{room:'1',unknown:false,busy:false},{room:'2',unknown:false,busy:false},{room:'3',unknown:true,busy:false},{room:'4',unknown:false,busy:false}]);
 assert.equal(F.rooms(lessons,0,'08:39','08:51',S,T).rooms.filter(r=>r.busy).length,2);assert.equal(F.rooms(lessons,0,'08:50','',S,T).rooms.find(r=>r.room==='2').busy,true);assert.match(F.rooms(lessons,0,'09:00','08:00',S,T).error,/позже/);assert.ok(F.rooms(lessons,0,'24:00','',S,T).error);
});
test('source audit distinguishes joint slots, duplicates and missing fields',()=>{
 const lessons=[l(),l(),l({class:'9Б'}),l({number:9,teacher:'',room:''}),l({subject:'Химия',teacher:'Петров П.П.',room:'2'})],issues=F.audit(lessons,S,T);
 assert.equal(issues.filter(i=>i.type==='teacher').length,1);assert.equal(issues.filter(i=>i.type==='room').length,1);assert.equal(issues.filter(i=>i.type==='class').length,1);assert.equal(issues.filter(i=>i.type==='duplicate').length,1);for(const type of ['missingTeacher','missingRoom','unknownTime'])assert.equal(issues.filter(i=>i.type===type).length,1);
 assert.ok(!F.audit([l({teacher:'Иванов И.И./Петров П.П.',room:'1/2'})],S,T).some(i=>['teacher','room','class'].includes(i.type)));
});
test('event validation and old backups preserve compatibility and reject invalid durations/dates/IDs',()=>{
 assert.deepEqual(P.events([event]),[event]);assert.throws(()=>P.events([event,event]));assert.throws(()=>P.events([{...event,date:'2026-02-30'}]));assert.throws(()=>P.events([{...event,time:'24:00'}]));assert.throws(()=>P.events([{...event,duration:241}]));assert.throws(()=>P.events([{...event,title:'  '}]));
 const old={app:'lyceum48',version:1,tasks:[],notes:{},favorites:[],myClass:''};assert.deepEqual(P.backup(old).events,[]);assert.deepEqual(P.backup(old).comparisonPresets,[]);assert.equal(P.backup({...old,events:[event],comparisonPresets:[preset]}).events[0].id,event.id);
});
test('event calendars convert Moscow time, use exclusive all-day end and fold UTF-8 safely',()=>{
 const text=F.calendar([event,{...event,id:'all-day',time:'',title:'Алгебра '.repeat(16)+'\rПодготовить; тетрадь'}],new Date('2026-11-01T00:00:00Z'));
 assert.ok(text.includes('DTSTART:20261109T060000Z'));assert.ok(text.includes('DTEND:20261109T064000Z'));assert.ok(text.includes('DTSTART;VALUE=DATE:20261109'));assert.ok(text.includes('DTEND;VALUE=DATE:20261110'));assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,2);for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);assert.ok(!text.replace(/\r\n/g,'').includes('\r'));
});
test('comparison presets validate link settings and deduplicate selections',()=>{
 assert.deepEqual(P.presets([{...preset,selected:['9А','9Б','9А']}])[0].selected,['9А','9Б']);assert.throws(()=>P.presets([{...preset,dimension:'constructor'}]));assert.throws(()=>P.presets([{...preset,unit:'days'}]));assert.throws(()=>P.presets([{...preset,grade:9}]));assert.throws(()=>P.presets([preset,preset]));assert.throws(()=>P.presets([{...preset,differences:'yes'}]));
});
