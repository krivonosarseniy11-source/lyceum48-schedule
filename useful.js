'use strict';
let usefulTab='week',usefulSource=null,usefulPreparedClass='',usefulCSV=[],usefulMeetingWindows=[];
const usefulTime=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const usefulDate=date=>new Date(date+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short'});
function renderUseful(){
 if(!data)return;const changed=usefulSource!==data;usefulSource=data;
 options($('usefulClass'),data.classes,$('usefulClass').value||storage.get('myClass')||(mode==='class'?entity:dailyClassName));
 if(!$('usefulWeek').value)$('usefulWeek').value=U.weekStart(T.clock().date);if(!$('meetingDate').value)$('meetingDate').value=T.clock().date;
 if(changed||usefulPreparedClass!==$('usefulClass').value){const preferred=usefulPreparedClass===$('usefulClass').value?$('meetingTeacher').value:S.teachers(data.lessons.find(l=>l.class===$('usefulClass').value&&l.teacher)||{teacher:''})[0];options($('meetingTeacher'),[...new Set(data.lessons.flatMap(S.teachers))].sort((a,b)=>a.localeCompare(b,'ru')),preferred);usefulPreparedClass=$('usefulClass').value}
 $('changesCount').textContent=lastScheduleChange?'· '+lastScheduleChange.changes.length:'';renderUsefulContent();
}
function renderUsefulContent(){
 if(!data)return;
 document.querySelectorAll('[data-useful-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.usefulTab===usefulTab));
 for(const id of ['usefulWeekLabel','usefulPrevWeek','usefulThisWeek','usefulNextWeek'])$(id).hidden=usefulTab!=='week';
 for(const id of ['meetingTeacherLabel','meetingDateLabel','meetingDurationLabel'])$(id).hidden=usefulTab!=='meeting';$('changesAllLabel').hidden=usefulTab!=='changes';
 usefulCSV=[];usefulMeetingWindows=[];
 if(usefulTab==='week')renderUsefulWeek();else if(usefulTab==='meeting')renderUsefulMeeting();else renderUsefulChanges();
}
function renderUsefulWeek(){
 if(!P.dateOK($('usefulWeek').value)){$('usefulSummary').textContent='Выберите неделю.';$('usefulContent').innerHTML='';return}
 const cls=$('usefulClass').value,start=U.weekStart($('usefulWeek').value);$('usefulWeek').value=start;
 const days=U.week(homework,cls,start),total=days.reduce((s,d)=>s+d.items.length,0),done=days.reduce((s,d)=>s+d.done,0),max=Math.max(0,...days.map(d=>d.open)),overdue=homework.filter(t=>t.class===cls&&!t.done&&t.due<T.clock().date).length;
 $('usefulSummary').textContent=`${cls} · ${usefulDate(start)} — ${usefulDate(D.addDays(start,6))} · выполнено ${done} из ${total}.`+(max?' Больше всего невыполненных: '+days.filter(d=>d.open===max).map(d=>usefulDate(d.date)).join(', ')+` (${max}).`:'');
 $('usefulContent').innerHTML=(overdue?`<button data-useful-overdue>Просроченные задания класса · ${overdue}</button>`:'')+`<div class="week-board">${days.map(d=>{const ls=D.lessonsOn(data.lessons.filter(l=>l.class===cls),d.date,T.holiday);return `<article class="week-day"><h3>${usefulDate(d.date)}</h3><small>${esc(T.holiday(d.date)||`${new Set(ls.map(l=>l.number)).size} уроков по таблице`)} · задания ${d.done}/${d.items.length}</small>${d.items.map(t=>`<label class="week-task ${t.done?'week-task-done':''}"><input type="checkbox" data-week-task="${esc(t.id)}" ${t.done?'checked':''}><span><strong>${esc(t.subject)}${t.priority==='high'?' · Важное':''}</strong><span>${esc(t.text)}</span></span></label>`).join('')||'<p class="tool-hint">Добавленных заданий нет.</p>'}<button data-week-add="${d.date}">＋ Задание на этот день</button></article>`}).join('')}</div>`;
 $('usefulMethod').textContent='Здесь только задания, которые вы добавили сами. Выходные и каникулы не скрывают задания с указанным сроком. Отметки выполнения общие с планировщиком и блоком «Мой день».';
 usefulCSV=[['Класс','Дата','Предмет','Задание','Приоритет','Выполнено'],...days.flatMap(d=>d.items.length?d.items.map(t=>[cls,d.date,t.subject,t.text,t.priority==='high'?'Важное':'Обычный',t.done?'Да':'Нет']):[[cls,d.date,'','Нет добавленных заданий','','']])];
}
function renderUsefulMeeting(){
 if(!P.dateOK($('meetingDate').value)){$('usefulSummary').textContent='Выберите корректную дату.';$('usefulContent').innerHTML='';return}
 const cls=$('usefulClass').value,teacher=$('meetingTeacher').value,date=$('meetingDate').value,minutes=+$('meetingDuration').value;
 if(!teacher){$('usefulSummary').textContent='В таблице нет имён учителей для выбора.';$('usefulContent').innerHTML='';return}
 const result=U.meeting(data.lessons.filter(l=>S.matches(l,{mode:'teacher',entity:teacher})),data.lessons.filter(l=>l.class===cls),date,minutes,T);usefulMeetingWindows=result.windows;
 $('usefulSummary').textContent=`${teacher} · ${cls} · ${usefulDate(date)} · ${minutes} мин. `+(result.reason||`Подходящих промежутков: ${result.windows.length}.`);
 $('usefulContent').innerHTML=result.windows.length?result.windows.map((w,i)=>`<article class="meeting-window"><strong>${usefulTime(w.start)}–${usefulTime(w.end)}</strong><span>Оба без уроков · ${w.end-w.start} минут</span><button data-meeting-copy="${i}">Скопировать вариант ${usefulTime(w.start)}–${usefulTime(w.proposedEnd)}</button></article>`).join(''):'<p class="tool-empty">Проверьте другую дату или длительность.</p>';
 $('usefulMethod').textContent='Ищем общее свободное время класса и учителя между первым и последним уроком учителя в первой смене, включая обычные перемены. Прошедшие промежутки не предлагаются. Это варианты по расписанию: встречу нужно согласовать с учителем. Если есть занятия без времени, достоверный поиск не выполняется.';
 usefulCSV=[['Дата','Учитель','Класс','Свободно с','Свободно до','Вариант начала','Вариант конца','Длительность встречи'],...result.windows.map(w=>[date,teacher,cls,usefulTime(w.start),usefulTime(w.end),usefulTime(w.start),usefulTime(w.proposedEnd),minutes])];
}
function renderUsefulChanges(){
 const cls=$('usefulClass').value,changes=lastScheduleChange?.changes.filter(c=>$('changesAll').checked||c.class===cls)||[];
 const stamp=date=>new Date(date).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
 $('usefulSummary').textContent=lastScheduleChange?`Сравнение копии от ${stamp(lastScheduleChange.from)} с таблицей от ${stamp(lastScheduleChange.date)} МСК · показано: ${changes.length}.`:'Изменений для сравнения пока нет. Нажмите «Обновить» у расписания, чтобы проверить таблицу.';
 const text=items=>items.map(l=>`${l.subject} · ${l.teacher||'Учитель не указан'} · ${l.room||'Кабинет не указан'}`).join('; '),type={added:'Добавлено',removed:'Удалено',changed:'Изменено'};
 $('usefulContent').innerHTML=changes.length?changes.map(c=>`<article class="change-item"><strong>${esc(c.class)} · ${S.DAYS[c.day]} · ${c.number} урок · ${type[c.type]}</strong><div><small>Было</small><p>${esc(c.before.length?text(c.before):'Записи не было')}</p></div><div><small>Стало</small><p>${esc(c.after.length?text(c.after):'Записи больше нет')}</p></div><button data-change-class="${esc(c.class)}" data-change-day="${c.day}" data-change-number="${c.number}">Открыть этот урок</button></article>`).join(''):'<p class="tool-empty">В последнем сохранённом сравнении для выбранных классов изменений нет.</p>';
 $('usefulMethod').textContent='Это последнее обнаруженное отличие успешно загруженной таблицы от ранее показанной копии на этом устройстве. Первая загрузка не считается изменением. Сравнение сохраняется между посещениями и не исчезает при повторном обновлении без отличий. Это изменения недельного шаблона, а не журнал оперативных замен.';
 usefulCSV=[['Класс','День','Урок','Изменение','Было','Стало','Предыдущая копия','Новая таблица'],...changes.map(c=>[c.class,S.DAYS[c.day],c.number,type[c.type],text(c.before),text(c.after),lastScheduleChange.from,lastScheduleChange.date])];
}
function usefulOpenPlanner(date,filter='open'){
 const cls=$('usefulClass').value;$('taskClass').value=cls;resetTaskForm();plannerSubjects();$('taskAllClasses').checked=false;$('taskFilter').value=filter;
 if(date){$('taskDue').value=date;const lesson=D.lessonsOn(data.lessons.filter(l=>l.class===cls),date,T.holiday)[0];if(lesson)$('taskSubject').value=lesson.subject}
 renderTasks();renderBag();if(date)$('taskText').focus();else $('plannerTitle').scrollIntoView({behavior:'smooth',block:'center'});
}
$('usefulPanel').addEventListener('click',async e=>{
 const tab=e.target.closest('[data-useful-tab]');if(tab){usefulTab=tab.dataset.usefulTab;renderUsefulContent();return}
 const add=e.target.closest('[data-week-add]');if(add){usefulOpenPlanner(add.dataset.weekAdd);return}
 if(e.target.closest('[data-useful-overdue]')){usefulOpenPlanner('','overdue');return}
 const change=e.target.closest('[data-change-class]');if(change){if(!data.classes.includes(change.dataset.changeClass))return toast('Этого класса нет в новой таблице. Посмотрите запись «Было».');clearFilters();mode='class';entity=change.dataset.changeClass;day=+change.dataset.changeDay;view='day';advanced.first=change.dataset.changeNumber;advanced.last=change.dataset.changeNumber;syncAdvancedUI();populate();$('schedule').scrollIntoView({behavior:'smooth',block:'start'});return}
 const copy=e.target.closest('[data-meeting-copy]');if(copy){const w=usefulMeetingWindows[+copy.dataset.meetingCopy];if(!w)return;const text=`Вариант встречи: ${$('meetingTeacher').value}, ${$('meetingDate').value}, ${usefulTime(w.start)}–${usefulTime(w.proposedEnd)}. По расписанию учитель и ${$('usefulClass').value} без уроков. Встречу нужно согласовать с учителем.`;try{await navigator.clipboard.writeText(text);toast('Вариант встречи скопирован')}catch{download('вариант-встречи.txt',text,'text/plain;charset=utf-8');toast('Вариант встречи сохранён в файл')}}
});
$('usefulContent').onchange=e=>{const id=e.target.dataset.weekTask;if(!id)return;const task=homework.find(t=>t.id===id);if(task){task.done=e.target.checked;saveHomework()}};
$('usefulClass').onchange=renderUseful;$('usefulWeek').onchange=renderUsefulContent;
['meetingTeacher','meetingDate','meetingDuration','changesAll'].forEach(id=>$(id).onchange=renderUsefulContent);
$('usefulPrevWeek').onclick=()=>{if(P.dateOK($('usefulWeek').value)){$('usefulWeek').value=D.addDays($('usefulWeek').value,-7);renderUsefulContent()}};
$('usefulNextWeek').onclick=()=>{if(P.dateOK($('usefulWeek').value)){$('usefulWeek').value=D.addDays($('usefulWeek').value,7);renderUsefulContent()}};
$('usefulThisWeek').onclick=()=>{$('usefulWeek').value=U.weekStart(T.clock().date);renderUsefulContent()};
$('exportUseful').onclick=()=>{if(!usefulCSV.length)return toast('Нет данных для выгрузки');download('помощник-'+usefulTab+'.csv',csv(usefulCSV),'text/csv;charset=utf-8')};
setInterval(()=>{if(data&&!document.hidden&&usefulTab==='meeting')renderUsefulContent()},60000);
renderUseful();
