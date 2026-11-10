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
 function packing(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>2000)throw Error('Неверные подсказки для портфеля');
  const result={};for(const [key,text] of Object.entries(value)){if(key.length>400||typeof text!=='string'||text.length>500)throw Error('Неверная подсказка для портфеля');if(!['__proto__','constructor','prototype'].includes(key))Object.defineProperty(result,key,{value:text,enumerable:true,writable:true,configurable:true})}return result;
 }
 function events(value=[]){
  if(!Array.isArray(value)||value.length>2000)throw Error('Неверный список событий');const ids=new Set();
  return value.map(e=>{if(!e||typeof e.id!=='string'||!e.id||e.id.length>100||ids.has(e.id)||typeof e.class!=='string'||!e.class||e.class.length>40||typeof e.title!=='string'||!e.title.trim()||e.title.length>160||!dateOK(e.date)||!['test','exam','project','meeting','other'].includes(e.type)||typeof e.subject!=='string'||e.subject.length>200||typeof e.notes!=='string'||e.notes.length>1000||typeof e.time!=='string'||e.time!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)||!Number.isInteger(e.duration)||e.duration<5||e.duration>240)throw Error('Неверное событие');ids.add(e.id);return {id:e.id,class:e.class,title:e.title,date:e.date,time:e.time,duration:e.duration,type:e.type,subject:e.subject,notes:e.notes}});
 }
 function presets(value=[]){
  if(!Array.isArray(value)||value.length>20)throw Error('Неверные сохранённые сравнения');const ids=new Set(),names=new Set();
  return value.map(p=>{if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||names.has(p.name)||!['grades','classes'].includes(p.mode)||typeof p.grade!=='string'||!/^\d{1,2}$/.test(p.grade)||!Array.isArray(p.selected)||p.selected.length>40||!p.selected.every(v=>typeof v==='string'&&v.length>0&&v.length<=40)||!['count','minutes','hours'].includes(p.unit)||!['total','average'].includes(p.basis)||!['subject','teacher','room','day'].includes(p.dimension)||!['combined','split'].includes(p.split)||typeof p.differences!=='boolean')throw Error('Неверное сохранённое сравнение');ids.add(p.id);names.add(p.name);return {id:p.id,name:p.name,mode:p.mode,grade:p.grade,selected:[...new Set(p.selected)],unit:p.unit,basis:p.basis,dimension:p.dimension,split:p.split,differences:p.differences}});
 }
 function backup(value){
  if(!value||value.app!=='lyceum48'||value.version!==1)throw Error('Это не резервная копия лицея №48');
  const result={tasks:tasks(value.tasks),notes:{},favorites:[],myClass:'',packingItems:packing(value.packingItems),events:events(value.events),comparisonPresets:presets(value.comparisonPresets)};
  if(!value.notes||typeof value.notes!=='object'||Array.isArray(value.notes)||Object.keys(value.notes).length>5000)throw Error('Неверные заметки');
  for(const [k,v] of Object.entries(value.notes)){if(k.length>400||typeof v!=='string'||v.length>1000)throw Error('Неверная заметка');if(!['__proto__','constructor','prototype'].includes(k))Object.defineProperty(result.notes,k,{value:v,enumerable:true,writable:true,configurable:true})}
  if(!Array.isArray(value.favorites)||value.favorites.length>8)throw Error('Неверное избранное');
  result.favorites=value.favorites.map(f=>{if(!f||!['class','teacher','room'].includes(f.mode)||typeof f.entity!=='string'||f.entity.length>200||typeof f.label!=='string'||f.label.length>250)throw Error('Неверное избранное');return {mode:f.mode,entity:f.entity,label:f.label}});
  if(typeof value.myClass!=='string'||value.myClass.length>40)throw Error('Неверный класс');result.myClass=value.myClass;return result;
 }
 function compare(lessons,a,b,day){return Array.from({length:8},(_,i)=>({number:i+1,a:lessons.filter(l=>l.class===a&&l.day===day&&l.number===i+1),b:lessons.filter(l=>l.class===b&&l.day===day&&l.number===i+1)}))}
 const api={dateOK,nextDate,tasks,packing,events,presets,backup,compare};if(typeof module!=='undefined')module.exports=api;else root.Planner=api;
})(typeof window==='undefined'?globalThis:window);
