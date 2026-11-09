(function(root){
 'use strict';
 const addDays=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 const weekday=date=>(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
 const lessonsOn=(lessons,date,holiday)=>holiday(date)?[]:lessons.filter(l=>l.day===weekday(date)).sort((a,b)=>a.number-b.number);
 function nextDay(lessons,today,holiday){for(let i=1;i<=370;i++){const date=addDays(today,i);if(lessonsOn(lessons,date,holiday).length)return date}return ''}
 function departure(start,travel){if(start===null||!Number.isInteger(travel)||travel<0||travel>180)return null;const minutes=start-travel-10,dayOffset=Math.floor(minutes/1440),clock=((minutes%1440)+1440)%1440;return {time:String(Math.floor(clock/60)).padStart(2,'0')+':'+String(clock%60).padStart(2,'0'),dayOffset}}
 function bounds(lessons,slot){const sorted=[...lessons].sort((a,b)=>a.number-b.number);return {start:sorted.length?slot(sorted[0].number)?.start??null:null,end:sorted.length?slot(sorted.at(-1).number)?.end??null:null,unknown:sorted.some(l=>!slot(l.number)),count:new Set(sorted.map(l=>l.number)).size}}
 function dayText(cls,date,lessons,slot){return [`${cls} класс · ${date.split('-').reverse().join('.')}`,...lessons.map(l=>`${l.number}. ${slot(l.number)?.label||'Время не указано'} · ${l.subject}${l.room?' · '+l.room:''}`),'Недельное расписание. Замены уточняйте в лицее.'].join('\n')}
 const api={addDays,weekday,lessonsOn,nextDay,departure,bounds,dayText};if(typeof module!=='undefined')module.exports=api;else root.Daily=api;
})(typeof window==='undefined'?globalThis:window);
