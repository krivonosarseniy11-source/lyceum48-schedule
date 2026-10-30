(function(root){
 'use strict';
 const DAYS=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
 const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
 const norm=v=>clean(v).toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s*\.\s*/g,'.');
 function decode(text){
  const start=text.indexOf('{'), end=text.lastIndexOf('}');
  if(start<0||end<start) throw new Error('Google вернул неверный ответ');
  return JSON.parse(text.slice(start,end+1));
 }
 function parse(payload){
  if(payload.status==='error'||!payload.table?.rows) throw new Error('Таблица недоступна');
  const rows=payload.table.rows.map(r=>r.c.map(c=>clean(c?.f??c?.v)));
  const hi=rows.findIndex(row=>row.some(v=>/^\d{1,2}\s*[а-яa-z]$/i.test(v)));
  if(hi<0) throw new Error('Не найдены заголовки классов');
  const firstLesson=rows.slice(hi+1).find(row=>DAYS.some(d=>norm(d)===norm(row[0])));
  if(!firstLesson)throw new Error('Не найдены дни недели');
  const columns=rows[hi].flatMap((v,i)=>/^\d{1,2}\s*[а-яa-z]$/i.test(v)?[{i:/^\d+$/.test(firstLesson[i])?i:i-1,name:v.replace(/\s/g,'').toLocaleUpperCase('ru')}]:[]);
  let day=-1; const lessons=[];
  for(let r=hi+1;r<rows.length;r++){
   const row=rows[r]; const di=DAYS.findIndex(d=>norm(d)===norm(row[0])); if(di>=0)day=di;
   if(day<0)continue;
   for(const col of columns){
    const n=Number(row[col.i]), subject=clean(row[col.i+1]);
    if(!Number.isInteger(n)||n<1||n>15||!subject)continue;
    // Teacher row belongs to this lesson only when no new lesson/day starts there.
    const next=rows[r+1]||[];
    const teacher=!Number(next[col.i])&&!DAYS.some(d=>norm(d)===norm(next[0]))?clean(next[col.i+1]):'';
    const room=clean(row[col.i+2]);
    lessons.push({class:col.name,day,number:n,subject,teacher,room});
   }
  }
  if(!lessons.length)throw new Error('В таблице нет уроков');
  return {classes:columns.map(c=>c.name),lessons};
 }
 const teachers=l=>l.teacher.split('/').map(clean).filter(Boolean).map(t=>t.replace(/^(.+?)\s+([А-ЯЁ])\s*\.?\s*([А-ЯЁ])\s*\.?$/u,'$1 $2. $3.'));
 const rooms=l=>norm(l.room).includes('спорт')?['Спортзал']:l.room.split('/').map(clean).filter(Boolean);
 function matches(l,{mode='class',entity='',search='',subject=''}={}){
  const candidate=mode==='class'?[l.class]:mode==='teacher'?teachers(l):rooms(l);
  return (!entity||candidate.some(x=>norm(x)===norm(entity)))&&(!subject||l.subject===subject)&&norm(search).split(' ').filter(Boolean).every(q=>norm([l.class,l.subject,l.teacher,l.room,...rooms(l)].join(' ')).includes(q));
 }
 const api={DAYS,clean,norm,decode,parse,teachers,rooms,matches};
 if(typeof module!=='undefined') module.exports=api; else root.Schedule=api;
})(typeof window==='undefined'?globalThis:window);
