'use strict';
function readLocal(key,fallback){try{return JSON.parse(storage.get(key))||fallback}catch{return fallback}}
let favorites=readLocal('favorites',[]);if(!Array.isArray(favorites))favorites=[];
let notes=readLocal('lessonNotes',{});if(typeof notes!=='object'||Array.isArray(notes))notes={};
const noteKey=l=>[l.class,l.day,l.number,l.subject].join('|');
function lessonNote(l){const key=noteKey(l),text=String(notes[key]||'');return `<details class="lesson-note"><summary>${text?'✎ Есть заметка':'＋ Заметка'}</summary><label>Личная заметка · ${esc(l.class)}<textarea maxlength="1000" data-note="${esc(key)}" placeholder="Что взять с собой, задание или напоминание…">${esc(text)}</textarea></label><small>Сохраняется автоматически на этом устройстве</small></details>`}
function filteredLessons(){return data?data.lessons.filter(l=>S.matches(l,{mode,entity:$('searchAll').checked?'':entity,search:$('search').value,subject:$('subject').value})&&T.atTime(l,$('atTime').value)):[]}
function download(name,text,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let t=String(value??'');if(/^[=+@-]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'}).join(';')).join('\r\n')}
function clearFilters(){ $('search').value='';$('subject').value='';$('atTime').value='';$('searchAll').checked=false }
function openEntity(newMode,newEntity){mode=newMode;entity=newEntity;clearFilters();populate()}
function renderExtras(all=filteredLessons()){
 if(!data)return;
 $('favorite').title='Сохранить '+selectedLabel();
 $('favorite').textContent=favorites.some(f=>f.mode===mode&&f.entity===entity)?'★ В избранном':'☆ В избранное';
 $('favorites').innerHTML=favorites.map((f,i)=>`<div><button data-open-favorite="${i}">${esc(f.label)}</button><button data-remove-favorite="${i}" aria-label="Убрать ${esc(f.label)} из избранного">×</button></div>`).join('');
 $('myClass').textContent='★ '+(storage.get('myClass')||'Мой класс');
 const daily=all.filter(l=>l.day===day),p=T.dayPlan(daily),fmt=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
 $('dayPlan').innerHTML=view==='day'&&p?`<strong>${S.DAYS[day]}</strong><span>${fmt(p.start)}–${fmt(p.end)}</span><span>${p.count} уроков по звонкам</span><span>${p.minutes} мин занятий</span><span>${p.breaks} мин между занятиями</span>`:'';
 renderRooms();
}
function renderLoadChart(all){
 const counts=Array.from({length:6},(_,d)=>all.filter(l=>l.day===d).length),max=Math.max(1,...counts);
 $('loadChart').innerHTML=counts.map((n,d)=>`<button data-load-day="${d}" aria-label="${S.DAYS[d]}: ${countText(n)}"><span>${S.DAYS[d]}</span><i><b style="width:${n/max*100}%"></b></i><strong>${n}</strong></button>`).join('');
}
function renderRooms(){
 if(!data)return;const time=$('roomTime').value;
 if(!time){$('roomResults').innerHTML='';$('roomsSummary').textContent='Укажите время для проверки.';return}
 const rooms=T.freeRooms(data.lessons,+$('roomDay').value,time,S),free=rooms.filter(r=>!r.busy),shown=$('onlyFree').checked?free:rooms;
 $('roomsSummary').textContent=`${S.DAYS[+$('roomDay').value]} · ${time} МСК · без занятий ${free.length} из ${rooms.length}`;
 $('roomResults').innerHTML=shown.map(r=>`<button data-find-room="${esc(r.room)}" class="${r.busy?'busy':'free'}"><strong>${esc(r.room)}</strong><small>${r.busy?'Занят':'Нет занятий'}</small></button>`).join('')||'<p>По выбранным условиям кабинетов нет.</p>';
}
$('searchAll').onchange=()=>{if(data)populate()};
$('prevDay').onclick=()=>{day=(day+5)%6;view='day';render()};
$('nextDay').onclick=()=>{day=(day+1)%6;view='day';render()};
$('tomorrow').onclick=()=>{day=displayDay((T.clock().day+1)%7);view='day';render();if(T.clock().day===5)toast('После субботы показываем понедельник')};
$('myClass').onclick=()=>{const c=storage.get('myClass');if(c)openEntity('class',c);else toast('Выберите класс и нажмите «Сделать моим классом»')};
$('favorite').onclick=()=>{const i=favorites.findIndex(f=>f.mode===mode&&f.entity===entity);if(i>=0)favorites.splice(i,1);else if(favorites.length<8)favorites.push({mode,entity,label:selectedLabel()});else return toast('Можно сохранить до 8 расписаний');storage.set('favorites',JSON.stringify(favorites));renderExtras()};
$('favorites').onclick=e=>{const open=e.target.closest('[data-open-favorite]'),remove=e.target.closest('[data-remove-favorite]');if(open){const f=favorites[+open.dataset.openFavorite];if(f)openEntity(f.mode,f.entity)}if(remove){favorites.splice(+remove.dataset.removeFavorite,1);storage.set('favorites',JSON.stringify(favorites));renderExtras()}};
$('jumpNow').onclick=()=>{clearFilters();day=displayDay(T.clock().day);view='day';render();const target=document.querySelector('.is-current')||$('live');target.scrollIntoView({behavior:'smooth',block:'center'});if(!document.querySelector('.is-current'))toast('Сейчас занятия по выбранному расписанию нет')};
function applyCompact(){const compact=storage.get('compact')===null?matchMedia('(max-width:760px)').matches:storage.get('compact')==='1';document.body.classList.toggle('compact',compact);$('compact').setAttribute('aria-pressed',compact)}
$('compact').onclick=()=>{storage.set('compact',document.body.classList.contains('compact')?'0':'1');applyCompact()};applyCompact();
$('schedule').addEventListener('input',e=>{if(!e.target.matches('[data-note]'))return;notes[e.target.dataset.note]=e.target.value;if(!e.target.value)delete notes[e.target.dataset.note];storage.set('lessonNotes',JSON.stringify(notes));e.target.closest('details').querySelector('summary').textContent=e.target.value?'✎ Есть заметка':'＋ Заметка'});
$('loadChart').onclick=e=>{const b=e.target.closest('[data-load-day]');if(b){day=+b.dataset.loadDay;view='day';render();$('schedule').scrollIntoView({behavior:'smooth',block:'start'})}};
$('exportSchedule').onclick=()=>{const ls=filteredLessons().filter(l=>view==='week'||l.day===day).sort((a,b)=>a.day-b.day||a.number-b.number||a.class.localeCompare(b.class,'ru',{numeric:true}));download('расписание.csv',csv([['День','Урок','Время','Класс','Предмет','Учитель','Кабинет'],...ls.map(l=>[S.DAYS[l.day],l.number,T.slot(l.number)?.label||'',l.class,l.subject,l.teacher,l.room])]),'text/csv;charset=utf-8')};
$('exportStats').onclick=()=>{const rows=[...document.querySelectorAll('.stats-table tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(td=>td.textContent));download('статистика.csv',csv(rows),'text/csv;charset=utf-8')};
$('exportCalendar').onclick=()=>{const text=T.calendar(filteredLessons());if(!text.includes('BEGIN:VEVENT'))return toast('На ближайшие 4 недели занятий по фильтрам нет');download('лицей48-4недели.ics',text,'text/calendar;charset=utf-8');toast('Календарь на 4 недели. Перед импортом проверьте выбранные фильтры')};
$('roomDay').innerHTML=S.DAYS.slice(0,6).map((d,i)=>`<option value="${i}">${d}</option>`).join('');$('roomDay').value=displayDay(T.clock().day);
['roomDay','roomTime','onlyFree'].forEach(id=>$(id).onchange=renderRooms);
$('roomResults').onclick=e=>{const b=e.target.closest('[data-find-room]');if(b){openEntity('room',b.dataset.findRoom);day=+$('roomDay').value;$('atTime').value=$('roomTime').value;view='day';render();$('schedule').scrollIntoView({behavior:'smooth',block:'start'})}};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const editing=e.target.matches('input,textarea,select,[contenteditable]');if(e.key==='/'&&!editing){e.preventDefault();$('search').focus()}if(e.key==='Escape'&&!e.target.matches('textarea')){clearFilters();render();$('search').blur()}});
window.addEventListener('offline',()=>toast('Нет сети — показываем сохранённое расписание'));
window.addEventListener('online',()=>{toast('Соединение восстановлено');refresh()});
if(data)render();
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installApp').hidden=false});
$('installApp').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('installApp').hidden=true}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
