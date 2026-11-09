(function(root){
 'use strict';
 const norm=v=>String(v??'').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s*\.\s*/g,'.').replace(/\s+/g,' ').trim();
 function queryMatch(lesson,query,rooms){
  const text=norm([lesson.class,lesson.subject,lesson.teacher,lesson.room,...rooms(lesson)].join(' '));
  const groups=[[]];
  for(const token of String(query).match(/-?"[^"]*"|\||[^\s|]+/g)||[]){if(token==='|'){groups.push([]);continue}const exclude=token.startsWith('-'),word=norm(token.slice(exclude?1:0).replace(/^"|"$/g,''));if(word)groups.at(-1).push({word,exclude})}
  const clauses=groups.filter(g=>g.length);return !clauses.length||clauses.some(g=>g.every(t=>text.includes(t.word)!==t.exclude));
 }
 function readParams(p){
  const number=k=>/^(?:[1-9]|1[0-5])$/.test(p.get(k)||'')?p.get(k):'';
  const time=k=>/^([01]\d|2[0-3]):[0-5]\d$/.test(p.get(k)||'')?p.get(k):'';
  return {days:[...new Set((p.get('sdays')||'').split(',').filter(x=>/^[0-5]$/.test(x)).map(Number))].sort(),first:number('first'),last:number('last'),start:time('start'),end:time('end'),teacher:(p.get('teacher')||'').slice(0,200),room:(p.get('room')||'').slice(0,100),missing:['teacher','room','time'].includes(p.get('missing'))?p.get('missing'):''};
 }
 function params(a){return {sdays:a.days.join(','),first:a.first,last:a.last,start:a.start,end:a.end,teacher:a.teacher,room:a.room,missing:a.missing}}
 const active=a=>Object.values(params(a)).some(Boolean);
 function filter(l,a,S,T){
  if(a.days.length&&!a.days.includes(l.day)||a.first&&l.number<+a.first||a.last&&l.number>+a.last)return false;
  if(a.teacher&&!S.teachers(l).some(t=>norm(t)===norm(a.teacher))||a.room&&!S.rooms(l).some(r=>norm(r)===norm(a.room)))return false;
  const slot=T.slot(l.number);
  if(a.start||a.end){if(!slot)return false;const start=a.start?T.minute(a.start):0,end=a.end?T.minute(a.end):1440;if(start>=end||slot.end<=start||slot.start>=end)return false}
  return !a.missing||(a.missing==='teacher'?!S.teachers(l).length:a.missing==='room'?!S.rooms(l).length:!slot);
 }
 function analyze(lessons,S,T){
  return Array.from({length:6},(_,day)=>{
   const records=lessons.filter(l=>l.day===day),numbers=[...new Set(records.map(l=>l.number))].sort((a,b)=>a-b),known=numbers.filter(n=>T.slot(n));
   const windows=numbers.length?Array.from({length:numbers.at(-1)-numbers[0]+1},(_,i)=>numbers[0]+i).filter(n=>!numbers.includes(n)):[];
   let longest=0,run=0,previous=null,changes=0;
   for(const n of numbers){run=n===previous+1?run+1:1;longest=Math.max(longest,run);previous=n}
   for(let i=1;i<numbers.length;i++){const room=n=>{const items=records.filter(l=>l.number===n);if(items.some(l=>S.rooms(l).length!==1))return null;const rooms=[...new Set(items.flatMap(S.rooms))];return rooms.length===1?rooms[0]:null};const a=room(numbers[i-1]),b=room(numbers[i]);if(a&&b&&a!==b)changes++}
   const minutes=known.reduce((sum,n)=>{const s=T.slot(n);return sum+s.end-s.start},0),start=known.length?T.slot(known[0]).start:null,end=known.length?T.slot(known.at(-1)).end:null;
   const conflicts=numbers.map(number=>({number,lessons:records.filter(l=>l.number===number)})).filter(r=>new Set(r.lessons.map(l=>l.class)).size>1);
   return {day,records,numbers,windows,longest,changes,minutes,start,end,unknown:numbers.length-known.length,windowMinutes:windows.reduce((sum,n)=>{const s=T.slot(n);return sum+(s?s.end-s.start:0)},0),conflicts};
  });
 }
 const api={norm,queryMatch,readParams,params,active,filter,analyze};if(typeof module!=='undefined')module.exports=api;else root.SearchTools=api;
})(typeof window==='undefined'?globalThis:window);
