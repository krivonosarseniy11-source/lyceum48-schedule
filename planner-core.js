(function(root){
 'use strict';
 const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 function nextDate(lessons,subject,today,holiday){
  for(let i=1;i<=370;i++){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10),day=(d.getUTCDay()+6)%7;if(!holiday(date)&&lessons.some(l=>l.subject===subject&&l.day===day))return date}return '';
 }
 function tasks(value){
  if(!Array.isArray(value)||value.length>2000)throw Error('Неверный список заданий');
  const ids=new Set();
  return value.map(t=>{if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.class!=='string'||t.class.length>40||typeof t.subject!=='string'||t.subject.length>200||typeof t.text!=='string'||!t.text.trim()||t.text.length>1000||!dateOK(t.due)||!['normal','high'].includes(t.priority)||typeof t.done!=='boolean')throw Error('Неверный формат задания');ids.add(t.id);return {id:t.id,class:t.class,subject:t.subject,text:t.text,due:t.due,priority:t.priority,done:t.done}});
 }
 function backup(value){
  if(!value||value.app!=='lyceum48'||value.version!==1)throw Error('Это не резервная копия лицея №48');
  const result={tasks:tasks(value.tasks),notes:{},favorites:[],myClass:''};
  if(!value.notes||typeof value.notes!=='object'||Array.isArray(value.notes)||Object.keys(value.notes).length>5000)throw Error('Неверные заметки');
  for(const [k,v] of Object.entries(value.notes)){if(k.length>400||typeof v!=='string'||v.length>1000)throw Error('Неверная заметка');if(!['__proto__','constructor','prototype'].includes(k))Object.defineProperty(result.notes,k,{value:v,enumerable:true,writable:true,configurable:true})}
  if(!Array.isArray(value.favorites)||value.favorites.length>8)throw Error('Неверное избранное');
  result.favorites=value.favorites.map(f=>{if(!f||!['class','teacher','room'].includes(f.mode)||typeof f.entity!=='string'||f.entity.length>200||typeof f.label!=='string'||f.label.length>250)throw Error('Неверное избранное');return {mode:f.mode,entity:f.entity,label:f.label}});
  if(typeof value.myClass!=='string'||value.myClass.length>40)throw Error('Неверный класс');result.myClass=value.myClass;return result;
 }
 function compare(lessons,a,b,day){return Array.from({length:8},(_,i)=>({number:i+1,a:lessons.filter(l=>l.class===a&&l.day===day&&l.number===i+1),b:lessons.filter(l=>l.class===b&&l.day===day&&l.number===i+1)}))}
 const api={dateOK,nextDate,tasks,backup,compare};if(typeof module!=='undefined')module.exports=api;else root.Planner=api;
})(typeof window==='undefined'?globalThis:window);
