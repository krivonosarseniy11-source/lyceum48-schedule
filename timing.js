(function(root){
 'use strict';
 const BELLS=[['08:00','08:40'],['08:50','09:30'],['09:50','10:30'],['10:45','11:25'],['11:40','12:20'],['12:30','13:10'],['13:15','13:55']];
 const minute=t=>{if(!/^\d{2}:\d{2}$/.test(t||''))return null;const [h,m]=t.split(':').map(Number);return h<24&&m<60?h*60+m:null};
 const slot=n=>BELLS[n-1]?{start:minute(BELLS[n-1][0]),end:minute(BELLS[n-1][1]),label:BELLS[n-1].join('–')}:null;
 const atTime=(l,time)=>{if(!time)return true;const s=slot(l.number),m=minute(time);return !!s&&m!==null&&m>=s.start&&m<s.end};
 function clock(now=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const date=`${p.year}-${p.month}-${p.day}`;return {date,day:(new Date(date+'T12:00:00Z').getUTCDay()+6)%7,seconds:Number(p.hour)*3600+Number(p.minute)*60+Number(p.second),time:`${p.hour}:${p.minute}`,civil:Date.parse(date+'T00:00:00Z')};
 }
 function holiday(date){
  if(date<'2026-09-01'||date>'2027-05-26')return 'Вне учебного года';
  for(const [a,b,title] of [['2026-10-26','2026-11-04','Осенние каникулы'],['2026-12-31','2027-01-10','Зимние каникулы'],['2027-03-27','2027-04-04','Весенние каникулы']])if(date>=a&&date<=b)return title;
  return '';
 }
 function live(lessons,now=new Date()){
  const c=clock(now),off=holiday(c.date),today=off?[]:lessons.filter(l=>l.day===c.day);
  const current=today.filter(l=>{const s=slot(l.number);return s&&c.seconds>=s.start*60&&c.seconds<s.end*60});
  let next=null;
  for(let offset=0;offset<370&&!next;offset++){
   const civil=c.civil+offset*86400000,date=new Date(civil).toISOString().slice(0,10),day=(new Date(civil).getUTCDay()+6)%7;
   if(holiday(date))continue;
   const candidates=lessons.filter(l=>l.day===day&&slot(l.number)&&(offset>0||slot(l.number).start*60>c.seconds)).sort((a,b)=>a.number-b.number);
   if(candidates.length){const start=slot(candidates[0].number).start;next={lessons:candidates.filter(l=>slot(l.number).start===start),date,seconds:offset*86400+start*60-c.seconds}}
  }
  return {clock:c,off,current,next,remaining:current.length?slot(current[0].number).end*60-c.seconds:null,unknown:today.filter(l=>!slot(l.number))};
 }
 function duration(seconds){seconds=Math.max(0,Math.floor(seconds));const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return d?`${d} д ${h} ч ${m} мин`:h?`${h} ч ${m} мин ${s} с`:`${m} мин ${String(s).padStart(2,'0')} с`}
 function stats(lessons,dimension,S){
  const groups=new Map();
  for(const l of lessons){const keys=dimension==='teacher'?(S.teachers(l).length?S.teachers(l):['Не указан']):dimension==='room'?(S.rooms(l).length?S.rooms(l):['Не указан']):dimension==='time'?[`${l.number} урок · ${slot(l.number)?.label||'время не указано'}`]:dimension==='class'?[l.class]:[l.subject.replace(/\s*\/\s*/g,' / ')];
   for(const key of new Set(keys)){if(!groups.has(key))groups.set(key,{name:key,count:0,minutes:0,unknown:0,days:new Set(),classes:new Set()});const g=groups.get(key);g.count++;g.days.add(l.day);g.classes.add(l.class);const s=slot(l.number);if(s)g.minutes+=s.end-s.start;else g.unknown++}
  }
  return [...groups.values()].map(g=>({...g,days:g.days.size,classes:g.classes.size})).sort((a,b)=>dimension==='time'?parseInt(a.name)-parseInt(b.name):b.count-a.count||a.name.localeCompare(b.name,'ru',{numeric:true}));
 }
 const api={BELLS,minute,slot,atTime,clock,holiday,live,duration,stats};
 if(typeof module!=='undefined')module.exports=api;else root.Timing=api;
})(typeof window==='undefined'?globalThis:window);
