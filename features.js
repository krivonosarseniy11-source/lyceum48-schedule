'use strict';
const F=window.Features,eventTypes={test:'Контрольная',exam:'Экзамен',project:'Проект',meeting:'Встреча',other:'Событие'};
let featuresSource=null,featureClass='',editingEvent=null,deletedEvent=null,auditSource=null,auditRows=[],comparisonPending=null;
try{const raw=new URLSearchParams(location.search).get('comparison');if(raw&&raw.length<6000)comparisonPending=P.presets([JSON.parse(raw)])[0]}catch{toast('Ссылка сравнения содержит неверные настройки')}
function renderFeatures(){
 if(!data)return;const changed=featuresSource!==data;featuresSource=data;
 const cls=$('usefulClass').value;if(changed||featureClass!==cls){options($('eventSubject'),[...new Set(data.lessons.filter(l=>l.class===cls).map(l=>l.subject))].sort((a,b)=>a.localeCompare(b,'ru')),$('eventSubject').value,'Без предмета');featureClass=cls}
 if(!$('eventDate').value)$('eventDate').value=T.clock().date;
 if(changed)options($('auditClass'),data.classes,$('auditClass').value,'Все классы');
 renderComparisonPresets();if(usefulTab==='events')renderEvents();if(schoolTab==='audit')renderAudit();
 if(comparisonPending){const value=comparisonPending;comparisonPending=null;applyComparison(value);$('schoolTitle').scrollIntoView({behavior:'smooth',block:'start'})}
}
function resetEventForm(){editingEvent=null;$('eventTitle').value='';$('eventNotes').value='';$('eventTime').value='';$('eventDuration').value=40;$('eventSave').textContent='＋ Добавить событие';$('eventCancel').hidden=true}
function selectedEvents(){
 const today=T.clock().date,scope=$('eventScope').value,cls=$('usefulClass').value;
 return classEvents.filter(e=>($('eventAllClasses').checked||e.class===cls)&&(scope==='all'||scope==='past'&&e.date<today||scope==='upcoming'&&e.date>=today)).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.title.localeCompare(b.title,'ru'));
}
function persistEvents(next){try{localStorage.setItem('classEvents',JSON.stringify(next));classEvents=next;renderUseful();renderDaily();return true}catch{toast('События не сохранены: хранилище браузера недоступно');return false}}
function featureEventsForDay(cls,date){return classEvents.filter(e=>e.class===cls&&e.date===date).sort((a,b)=>a.time.localeCompare(b.time)).map(e=>`<button class="event-chip" data-open-event="${esc(e.id)}"><strong>${eventTypes[e.type]}${e.time?' · '+e.time:''}</strong><span>${esc(e.title)}</span></button>`).join('')}
function renderEvents(){
 const events=selectedEvents();$('usefulSummary').textContent=`Личные события · показано ${events.length}${editingEvent?' · редактируется событие '+editingEvent.class:''}.`;
 $('usefulContent').innerHTML=events.length?events.map(e=>`<article class="personal-event"><strong>${esc(e.title)}</strong><small>${usefulDate(e.date)}${e.time?' · '+e.time+' · '+e.duration+' мин':' · весь день'} · ${esc(e.class)} · ${eventTypes[e.type]}${e.subject?' · '+esc(e.subject):''}</small>${e.notes?`<p>${esc(e.notes)}</p>`:''}<button data-open-event="${esc(e.id)}">Изменить</button><button data-delete-event="${esc(e.id)}">Удалить</button></article>`).join(''):'<p class="tool-empty">Событий по выбранным условиям нет.</p>';
 const dates=new Map();for(const e of events.filter(e=>e.type==='test'||e.type==='exam')){const key=e.class+'|'+e.date;dates.set(key,(dates.get(key)||0)+1)}
 const overloaded=[...dates].filter(([,n])=>n>1);if(overloaded.length)$('usefulSummary').textContent+=' Дней с несколькими контрольными / экзаменами: '+overloaded.length+'.';
 $('usefulMethod').textContent='Только ваши личные записи. События видны в недельном обзоре заданий и в «Моём дне». ICS — разовая копия выбранного списка, без автоматической синхронизации. События без времени экспортируются на весь день; время с часами считается по Москве.';
 usefulCSV=[['Класс','Дата','Время · МСК','Длительность, мин','Вид','Название','Предмет','Подготовить'],...events.map(e=>[e.class,e.date,e.time,e.time?e.duration:'Весь день',eventTypes[e.type],e.title,e.subject,e.notes])];
}
$('eventForm').onsubmit=e=>{e.preventDefault();const record={id:editingEvent?.id||crypto.randomUUID(),class:editingEvent?.class||$('usefulClass').value,title:$('eventTitle').value.trim(),date:$('eventDate').value,time:$('eventTime').value,duration:+$('eventDuration').value,type:$('eventType').value,subject:$('eventSubject').value,notes:$('eventNotes').value};try{P.events([record])}catch(error){return toast(error.message)}if(!editingEvent&&classEvents.length>=2000)return toast('Можно сохранить до 2000 событий');const next=editingEvent?classEvents.map(e=>e.id===editingEvent.id?record:e):[...classEvents,record];if(persistEvents(next)){resetEventForm();renderEvents();toast('Событие сохранено')}};
$('eventCancel').onclick=()=>{resetEventForm();renderEvents()};$('eventScope').onchange=renderEvents;$('eventAllClasses').onchange=renderEvents;
$('eventUndo').onclick=()=>{if(!deletedEvent)return;if(classEvents.length>=2000)return toast('Достигнут лимит событий');if(persistEvents(classEvents.some(e=>e.id===deletedEvent.id)?classEvents:[...classEvents,deletedEvent])){deletedEvent=null;$('eventUndo').hidden=true;toast('Событие восстановлено')}};
$('eventCalendar').onclick=()=>{const events=selectedEvents();if(!events.length)return toast('Нет событий для календаря');download('личные-события.ics',F.calendar(events),'text/calendar;charset=utf-8')};
document.addEventListener('click',e=>{
 const edit=e.target.closest('[data-open-event]'),remove=e.target.closest('[data-delete-event]');if(!edit&&!remove)return;
 const record=classEvents.find(item=>item.id===(edit?edit.dataset.openEvent:remove.dataset.deleteEvent));if(!record)return;
 if(remove){if(persistEvents(classEvents.filter(item=>item.id!==record.id))){deletedEvent=record;$('eventUndo').hidden=false;if(editingEvent?.id===record.id)resetEventForm();renderEvents();toast('Событие удалено')}return}
 if(data.classes.includes(record.class)){$('usefulClass').value=record.class;renderFeatures()}usefulTab='events';renderUsefulContent();editingEvent=record;$('eventTitle').value=record.title;$('eventDate').value=record.date;$('eventTime').value=record.time;$('eventDuration').value=record.duration;$('eventType').value=record.type;$('eventNotes').value=record.notes;if(record.subject&&![...$('eventSubject').options].some(o=>o.value===record.subject))$('eventSubject').add(new Option(record.subject,record.subject));$('eventSubject').value=record.subject;$('eventSave').textContent='Сохранить · '+record.class;$('eventCancel').hidden=false;$('eventTitle').focus();renderEvents();
});
$('usefulClass').addEventListener('change',()=>{resetEventForm();renderFeatures()});
const auditNames={teacher:'Совпадение у учителя',room:'Совпадение кабинета',class:'Несколько записей класса',duplicate:'Полный дубликат',missingTeacher:'Не указан учитель',missingRoom:'Не указан кабинет',unknownTime:'Неизвестное время'};
function renderAudit(){
 if(!data)return;if(auditSource!==data){auditSource=data;auditRows=F.audit(data.lessons,S,T)}
 const rows=auditRows.filter(r=>(!$('auditType').value||r.type===$('auditType').value)&&(!$('auditClass').value||r.lessons.some(l=>l.class===$('auditClass').value))),describe=l=>`${l.class} · ${l.subject} · ${l.teacher||'Учитель не указан'} · ${l.room||'Кабинет не указан'}`;
 $('schoolContext').textContent='Проверка всей исходной таблицы первой смены · без поисковых фильтров';$('schoolInsight').textContent=`Записей для проверки: ${rows.length}. Совпадения могут быть запланированными совместными занятиями.`;
 $('schoolReport').innerHTML=schoolTable(['Тип','Объект','День','Урок','Записи таблицы'],rows.map(r=>[esc(auditNames[r.type]),schoolLink(['teacher','room'].includes(r.type)?r.type:'class',r.entity,r.entity,r.day),S.DAYS[r.day],r.number,esc(r.lessons.map(describe).join('; '))]));
 $('schoolMethod').textContent='Проверка отмечает несколько классов у одного учителя или в одном кабинете в одном слоте, несколько записей класса, точные дубликаты и пропущенные поля. Это подсказки для проверки источника, а не автоматический вывод об ошибке: общие занятия и подгруппы могут быть намеренными. Неполные данные не заполняются догадками.';
 schoolCSV=[['Тип','Объект','День','Урок','Записи таблицы'],...rows.map(r=>[auditNames[r.type],r.entity,S.DAYS[r.day],r.number,r.lessons.map(describe).join('; ')])];
}
$('auditType').onchange=renderAudit;$('auditClass').onchange=renderAudit;
function currentComparison(name='По ссылке',id='link'){
 const mode=$('schoolCompareMode').value;return P.presets([{id,name,mode,grade:$('schoolGrade').value,selected:mode==='grades'?[...(schoolComparedGrades||[])]:[...(schoolComparedClasses[$('schoolGrade').value]||[])],unit:$('schoolUnit').value,basis:$('schoolCompareBasis').value,dimension:$('schoolCompareDimension').value,split:$('schoolSplit').value,differences:$('schoolOnlyDifferences').checked}])[0];
}
function renderComparisonPresets(){
 $('comparisonPresets').innerHTML=comparisonPresets.map(p=>`<div><button data-load-comparison="${esc(p.id)}">${esc(p.name)}</button><button data-delete-comparison="${esc(p.id)}" aria-label="Удалить сравнение ${esc(p.name)}">×</button></div>`).join('');
}
function applyComparison(p){
 if(!data)return;schoolTab='parallels';$('schoolCompareMode').value=p.mode;if(![...$('schoolGrade').options].some(o=>o.value===p.grade))$('schoolGrade').add(new Option(p.grade+' — нет данных',p.grade));$('schoolGrade').value=p.grade;if(p.mode==='grades')schoolComparedGrades=[...p.selected];else schoolComparedClasses[p.grade]=[...p.selected];$('schoolUnit').value=p.unit;$('schoolCompareBasis').value=p.basis;$('schoolCompareDimension').value=p.dimension;$('schoolSplit').value=p.split;$('schoolOnlyDifferences').checked=p.differences;schoolSnapshot=H.school(data,S,T,p.split==='split');renderSchoolReport();$('comparisonNotice').textContent='Открыто сравнение: '+p.name+'. Данные берутся из текущей таблицы.';
}
function persistComparisons(next){try{localStorage.setItem('comparisonPresets',JSON.stringify(next));comparisonPresets=next;renderComparisonPresets();return true}catch{toast('Не удалось сохранить сравнение в браузере');return false}}
$('saveComparison').onclick=()=>{const name=$('comparisonName').value.trim();if(!name){$('comparisonName').focus();return toast('Введите название сравнения')}try{const old=comparisonPresets.find(p=>p.name===name),record=currentComparison(name,old?.id||crypto.randomUUID()),next=[...comparisonPresets.filter(p=>p.name!==name),record];P.presets(next);if(persistComparisons(next)){$('comparisonName').value='';toast('Сравнение сохранено')}}catch(error){toast(error.message)}};
$('shareComparison').onclick=async()=>{try{const config=currentComparison(),url=new URL(location.href);url.searchParams.set('comparison',JSON.stringify(config));url.hash='schoolTitle';try{await navigator.clipboard.writeText(url.href);toast('Ссылка на сравнение скопирована')}catch{download('ссылка-на-сравнение.txt',url.href,'text/plain;charset=utf-8')}}catch(error){toast(error.message)}};
$('comparisonPresets').onclick=e=>{const load=e.target.closest('[data-load-comparison]'),remove=e.target.closest('[data-delete-comparison]');if(load){const p=comparisonPresets.find(p=>p.id===load.dataset.loadComparison);if(p)applyComparison(p)}if(remove)persistComparisons(comparisonPresets.filter(p=>p.id!==remove.dataset.deleteComparison))};
$('roomExport').onclick=()=>{if(!data)return;const result=F.rooms(data.lessons,+$('roomDay').value,$('roomTime').value,$('roomEnd').value,S,T);if(result.error)return toast(result.error);const rows=result.rooms.filter(r=>!$('onlyFree').checked||!r.busy&&!r.unknown);download('кабинеты-интервал.csv',csv([['День','Начало','Конец (пусто — момент)','Кабинет','Статус'],...rows.map(r=>[S.DAYS[+$('roomDay').value],$('roomTime').value,$('roomEnd').value,r.room,r.busy?'Занят':r.unknown?'Есть занятия без времени':'Нет занятий по таблице'])]),'text/csv;charset=utf-8')};
renderFeatures();if(data){renderUseful();renderDaily()}
