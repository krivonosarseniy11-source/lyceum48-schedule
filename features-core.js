(function(root){
 'use strict';
 function rooms(lessons,day,start,end,S,T){
  const a=T.minute(start),b=end?T.minute(end):null;if(a===null||end&&(b===null||b<=a))return {error:'Укажите время начала; конец интервала должен быть позже начала.',rooms:[]};
  const names=[...new Set(lessons.flatMap(S.rooms))].filter(r=>r!=='Спортзал').sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
  return {error:'',rooms:names.map(room=>{const own=lessons.filter(l=>l.day===day&&S.rooms(l).includes(room));return {room,unknown:own.some(l=>!T.slot(l.number)),busy:own.some(l=>{const s=T.slot(l.number);return !!s&&(end?s.start<b&&s.end>a:s.start<=a&&s.end>a)})}})};
 }
 function audit(lessons,S,T){
  const issues=[],group=(keys,include)=>{const map=new Map();for(const l of lessons)for(const name of new Set(keys(l))){const key=JSON.stringify([S.norm(name),l.day,l.number]);if(!map.has(key))map.set(key,{entity:name,day:l.day,number:l.number,lessons:[]});map.get(key).lessons.push(l)}return [...map.values()].filter(include)};
  for(const type of ['teacher','room'])for(const g of group(type==='teacher'?S.teachers:S.rooms,g=>new Set(g.lessons.map(l=>l.class)).size>1))issues.push({type,...g});
  const signature=l=>JSON.stringify([l.class,l.day,l.number,...[l.subject,l.teacher,l.room].map(S.norm)]),duplicates=new Map();
  for(const l of lessons){const key=signature(l);if(!duplicates.has(key))duplicates.set(key,[]);duplicates.get(key).push(l)}
  for(const list of duplicates.values())if(list.length>1)issues.push({type:'duplicate',entity:list[0].class,day:list[0].day,number:list[0].number,lessons:list});
  for(const g of group(l=>[l.class],g=>new Set(g.lessons.map(signature)).size>1))issues.push({type:'class',...g});
  for(const l of lessons)for(const [type,missing] of [['missingTeacher',!S.teachers(l).length],['missingRoom',!S.rooms(l).length],['unknownTime',!T.slot(l.number)]])if(missing)issues.push({type,entity:l.class,day:l.day,number:l.number,lessons:[l]});
  return issues.sort((a,b)=>a.type.localeCompare(b.type)||a.day-b.day||a.number-b.number||a.entity.localeCompare(b.entity,'ru',{numeric:true}));
 }
 function calendar(events,now=new Date()){
  const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'),stamp=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lyceum48//Personal events//RU','CALSCALE:GREGORIAN','X-WR-CALNAME:Личные события лицея'];
  for(const e of events){lines.push('BEGIN:VEVENT','UID:'+encodeURIComponent(e.id)+'@lyceum48-events','DTSTAMP:'+stamp(now.getTime()));if(e.time){const start=Date.parse(e.date+'T'+e.time+':00+03:00');lines.push('DTSTART:'+stamp(start),'DTEND:'+stamp(start+e.duration*60000))}else{const end=new Date(Date.parse(e.date+'T12:00:00Z')+86400000).toISOString().slice(0,10);lines.push('DTSTART;VALUE=DATE:'+e.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+end.replace(/-/g,''))}lines.push('SUMMARY:'+escape(e.title+' · '+e.class),'DESCRIPTION:'+escape([e.subject,e.notes,'Личное событие. Дату и время уточняйте в лицее.'].filter(Boolean).join('\n')),'END:VEVENT')}
  lines.push('END:VCALENDAR');const encoder=new TextEncoder();return lines.flatMap(line=>{const parts=[];let part='',bytes=0;for(const c of line){const size=encoder.encode(c).length;if(bytes+size>75){parts.push(part);part=' ';bytes=1}part+=c;bytes+=size}parts.push(part);return parts}).join('\r\n')+'\r\n';
 }
 const api={rooms,audit,calendar};if(typeof module!=='undefined')module.exports=api;else root.Features=api;
})(typeof window==='undefined'?globalThis:window);
