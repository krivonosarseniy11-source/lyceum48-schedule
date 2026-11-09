(function(root){
 'use strict';
 const classSlot=l=>JSON.stringify([l.class,l.day,l.number]),timeSlot=l=>JSON.stringify([l.day,l.number]);
 const grade=cls=>String(cls).match(/^\d+/)?.[0]||'';
 function metrics(lessons,slot,key=classSlot){
  const unique=[...new Map(lessons.map(l=>[key(l),l])).values()],known=unique.filter(l=>slot(l.number));
  return {count:unique.length,minutes:known.reduce((sum,l)=>{const s=slot(l.number);return sum+s.end-s.start},0),unknown:unique.length-known.length,days:new Set(unique.map(l=>l.day)).size,classes:new Set(lessons.map(l=>l.class)).size,references:new Set(lessons.map(classSlot)).size};
 }
 function groups(lessons,dimension,S,T,split=false){
  const map=new Map();
  for(const l of lessons){const names=dimension==='class'?[l.class]:dimension==='teacher'?S.teachers(l):dimension==='room'?S.rooms(l):(split?l.subject.split('/').map(S.clean).filter(Boolean):[l.subject.replace(/\s*\/\s*/g,' / ')]);
   for(const name of new Set(names)){const key=S.norm(name);if(!map.has(key))map.set(key,{name,lessons:[]});map.get(key).lessons.push(l)}
  }
  return [...map.values()].map(g=>({...g,...metrics(g.lessons,T.slot,['teacher','room'].includes(dimension)?timeSlot:classSlot)}));
 }
 function school(data,S,T,split=false){
  const classes=groups(data.lessons,'class',S,T);for(const name of data.classes)if(!classes.some(c=>c.name===name))classes.push({name,lessons:[],...metrics([],T.slot)});
  return {total:metrics(data.lessons,T.slot),classes,teachers:groups(data.lessons,'teacher',S,T),rooms:groups(data.lessons,'room',S,T),subjects:groups(data.lessons,'subject',S,T,split),days:Array.from({length:6},(_,day)=>({day,...metrics(data.lessons.filter(l=>l.day===day),T.slot)}))};
 }
 function parallel(data,selectedGrade,S,T,split=false){
  const classes=data.classes.filter(c=>grade(c)===String(selectedGrade)).sort((a,b)=>a.localeCompare(b,'ru',{numeric:true})),lessons=data.lessons.filter(l=>classes.includes(l.class));
  const totals=classes.map(name=>({name,...metrics(lessons.filter(l=>l.class===name),T.slot)}));
  const subjects=groups(lessons,'subject',S,T,split).sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(g=>({name:g.name,values:classes.map(cls=>metrics(g.lessons.filter(l=>l.class===cls),T.slot))}));
  return {classes,totals,subjects};
 }
 function teachersForClass(data,cls,date,S,T){
  const day=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7,off=T.holiday(date),schoolToday=off?[]:data.lessons.filter(l=>l.day===day);
  const classToday=schoolToday.filter(l=>l.class===cls),names=[...new Set(data.lessons.filter(l=>l.class===cls).flatMap(S.teachers))].sort((a,b)=>a.localeCompare(b,'ru'));
  const teachers=names.map(name=>{
   const own=classToday.filter(l=>S.teachers(l).some(t=>S.norm(t)===S.norm(name))),all=schoolToday.filter(l=>S.teachers(l).some(t=>S.norm(t)===S.norm(name))),numbers=[...new Set(all.map(l=>l.number))].sort((a,b)=>a-b);
   return {name,own,all,...metrics(all,T.slot,timeSlot),slots:numbers.map(number=>({number,lessons:all.filter(l=>l.number===number)}))};
  }).filter(t=>t.all.length);
  return {day,off,classToday,teachers,absent:names.filter(n=>!teachers.some(t=>t.name===n)),missing:classToday.filter(l=>!S.teachers(l).length)};
 }
 const api={classSlot,timeSlot,grade,metrics,groups,school,parallel,teachersForClass};if(typeof module!=='undefined')module.exports=api;else root.SchoolStats=api;
})(typeof window==='undefined'?globalThis:window);
