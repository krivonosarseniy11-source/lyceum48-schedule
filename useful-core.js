(function(root){
 'use strict';
 const normal=v=>String(v).toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s*\.\s*/g,'.').replace(/\s*\/\s*/g,'/').replace(/\s+/g,' ').trim();
 const addDays=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 const weekday=date=>(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
 const weekStart=date=>addDays(date,-weekday(date));
 function week(tasks,cls,start){return Array.from({length:7},(_,i)=>{const date=addDays(start,i),items=tasks.filter(t=>t.class===cls&&t.due===date).sort((a,b)=>Number(a.done)-Number(b.done)||Number(b.priority==='high')-Number(a.priority==='high')||a.subject.localeCompare(b.subject,'ru'));return {date,items,done:items.filter(t=>t.done).length,open:items.filter(t=>!t.done).length}})}
 function diff(before,after){
  const group=lessons=>{const map=new Map();for(const l of lessons){const key=JSON.stringify([l.class,l.day,l.number]);if(!map.has(key))map.set(key,[]);map.get(key).push({...l})}return map},a=group(before),b=group(after);
  const signature=items=>JSON.stringify([...new Set(items.map(l=>JSON.stringify([l.subject,l.teacher,l.room].map(normal))))].sort());
  return [...new Set([...a.keys(),...b.keys()])].flatMap(key=>{const old=a.get(key)||[],next=b.get(key)||[];return signature(old)===signature(next)?[]:[{class:(next[0]||old[0]).class,day:(next[0]||old[0]).day,number:(next[0]||old[0]).number,type:!old.length?'added':!next.length?'removed':'changed',before:old,after:next}]}).sort((a,b)=>a.class.localeCompare(b.class,'ru',{numeric:true})||a.day-b.day||a.number-b.number);
 }
 function validChange(value){
  const record=l=>l&&typeof l.class==='string'&&l.class.length<=40&&Number.isInteger(l.day)&&l.day>=0&&l.day<=6&&Number.isInteger(l.number)&&l.number>0&&l.number<=15&&['subject','teacher','room'].every(k=>typeof l[k]==='string'&&l[k].length<=1500);
  return !!value&&typeof value.date==='string'&&Number.isFinite(Date.parse(value.date))&&typeof value.from==='string'&&Number.isFinite(Date.parse(value.from))&&Array.isArray(value.changes)&&value.changes.length<=2000&&value.changes.every(c=>c&&record({...c,subject:'',teacher:'',room:''})&&['added','removed','changed'].includes(c.type)&&['before','after'].every(k=>Array.isArray(c[k])&&c[k].length<=20&&c[k].every(record)));
 }
 function meeting(teacherLessons,classLessons,date,duration,T,now=new Date()){
  const off=T.holiday(date);if(off)return {reason:off,windows:[]};if(!Number.isInteger(duration)||duration<5||duration>60)return {reason:'Укажите длительность от 5 до 60 минут.',windows:[]};
  const day=weekday(date),teacher=teacherLessons.filter(l=>l.day===day),cls=classLessons.filter(l=>l.day===day);
  if(!teacher.length)return {reason:'У учителя нет уроков в первой смене на эту дату.',windows:[]};
  if([...teacher,...cls].some(l=>!T.slot(l.number)))return {reason:'Есть занятия без времени. Надёжно проверить общее свободное время нельзя.',windows:[]};
  const slots=teacher.map(l=>T.slot(l.number)),start=Math.min(...slots.map(s=>s.start)),end=Math.max(...slots.map(s=>s.end)),busy=[...teacher,...cls].map(l=>T.slot(l.number)).sort((a,b)=>a.start-b.start);
  const clock=T.clock(now);if(date<clock.date)return {reason:'Выбрана прошедшая дата.',windows:[]};let cursor=date===clock.date?Math.max(start,Math.ceil(clock.seconds/60)):start;
  const windows=[];for(const s of busy){if(s.end<=cursor||s.start>=end)continue;const stop=Math.min(s.start,end);if(stop-cursor>=duration)windows.push({start:cursor,end:stop,proposedEnd:cursor+duration});cursor=Math.max(cursor,s.end);if(cursor>=end)break}
  if(end-cursor>=duration)windows.push({start:cursor,end,proposedEnd:cursor+duration});return {reason:windows.length?'':'Подходящих общих промежутков между первым и последним уроком учителя нет.',windows};
 }
 const api={weekStart,week,diff,validChange,meeting};if(typeof module!=='undefined')module.exports=api;else root.Useful=api;
})(typeof window==='undefined'?globalThis:window);
