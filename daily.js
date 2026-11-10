'use strict';
const D=window.Daily;
let dailyPeriod='tomorrow',dailyDate='',dailyLessons=[],dailyClassLessons=[],dailyClassName='',nextSubjectLesson=null;
function dailyFormat(m){return m===null?'Время не указано':String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
const savedCommute=storage.get('commuteMinutes');
if(savedCommute!==null&&/^\d+$/.test(savedCommute)&&+savedCommute<=180)$('commuteMinutes').value=savedCommute;
function renderDaily(){
 if(!data)return;
 const old=$('dailyClass').value||storage.get('dailyClass')||storage.get('myClass')||(mode==='class'?entity:'');options($('dailyClass'),data.classes,old);
 const selected=$('dailyClass').value,changed=selected!==dailyClassName;dailyClassName=selected;dailyClassLessons=data.lessons.filter(l=>l.class===selected);
 const today=T.clock().date;dailyDate=dailyPeriod==='today'?today:dailyPeriod==='tomorrow'?D.addDays(today,1):D.nextDay(dailyClassLessons,today,T.holiday);
 document.querySelectorAll('[data-daily-period]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.dailyPeriod===dailyPeriod));
 dailyLessons=dailyDate?D.lessonsOn(dailyClassLessons,dailyDate,T.holiday):[];
 $('dailyDate').textContent=dailyDate?new Date(dailyDate+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+dailyClassName+' класс':'Следующий учебный день не найден в календаре 2026–2027';
 const bounds=D.bounds(dailyLessons,T.slot);
 $('dailyTimes').innerHTML=dailyLessons.length?`<div><small>Первый урок</small><strong>${dailyFormat(bounds.start)}</strong></div><div><small>Конец занятий</small><strong>${dailyFormat(bounds.end)}</strong></div><div><small>Уроков</small><strong>${bounds.count}</strong></div>`:`<p>${esc(dailyDate?T.holiday(dailyDate)||'По расписанию занятий нет.':'Занятий нет.')}</p>`;
 if(bounds.unknown)$('dailyTimes').insertAdjacentHTML('beforeend','<small class="daily-unknown">Есть занятия без известного времени.</small>');
 $('dailyOpen').disabled=!dailyLessons.length;$('dailyCopy').disabled=!dailyLessons.length;$('dailyBag').disabled=!dailyDate;
 renderDeparture();renderDailyTasks();
 const previous=changed?'':$('nextSubjectSelect').value;
 options($('nextSubjectSelect'),[...new Set(dailyClassLessons.map(l=>l.subject))].sort((a,b)=>a.localeCompare(b,'ru')),previous);renderNextSubject();
}
function renderDeparture(){
 const input=$('commuteMinutes'),valid=input.value!==''&&input.validity.valid&&Number.isInteger(+input.value);
 const departure=valid?D.departure(D.bounds(dailyLessons,T.slot).start,+input.value):null;
 $('leaveHome').textContent=!valid?'Укажите время дороги от 0 до 180 минут.':departure?`Выйти в ${departure.time}${departure.dayOffset<0?' накануне':''} · приехать за 10 минут до первого урока.`:'Время выхода появится, когда известно начало первого урока.';
}
$('commuteMinutes').oninput=()=>{renderDeparture();if($('commuteMinutes').value!==''&&$('commuteMinutes').validity.valid){try{localStorage.setItem('commuteMinutes',$('commuteMinutes').value)}catch{toast('Время дороги не сохранено: хранилище браузера недоступно')}}};
$('dailyClass').onchange=()=>{storage.set('dailyClass',$('dailyClass').value);renderDaily()};
document.querySelectorAll('[data-daily-period]').forEach(b=>b.onclick=()=>{dailyPeriod=b.dataset.dailyPeriod;renderDaily()});
function openDailyDate(date,number=''){
 if(!date||!data)return;clearFilters();mode='class';entity=dailyClassName;day=D.weekday(date);view='day';if(number){advanced.first=String(number);advanced.last=String(number);syncAdvancedUI()}populate();$('schedule').scrollIntoView({behavior:'smooth',block:'start'});
}
$('dailyOpen').onclick=()=>openDailyDate(dailyDate);
$('dailyCopy').onclick=async()=>{if(!dailyLessons.length)return;const text=D.dayText(dailyClassName,dailyDate,dailyLessons,T.slot);try{await navigator.clipboard.writeText(text);toast('День скопирован — можно отправить в чат')}catch{download('расписание-'+dailyDate+'.txt',text,'text/plain;charset=utf-8');toast('Расписание дня сохранено в текстовый файл')}};
function openDailyTasks(filter){
 if(!data)return;$('taskClass').value=dailyClassName;resetTaskForm();plannerSubjects();$('taskAllClasses').checked=false;$('taskFilter').value=filter;renderTasks();renderBag();$('plannerTitle').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderDailyTasks(){
 const tasks=homework.filter(t=>t.class===dailyClassName&&t.due===dailyDate&&!t.done).sort((a,b)=>(a.priority==='high'?-1:0)-(b.priority==='high'?-1:0)||a.subject.localeCompare(b.subject,'ru'));
 $('dailyTaskCount').textContent='· '+tasks.length;
 $('dailyTasks').innerHTML=tasks.length?tasks.map(t=>`<label class="daily-task"><input type="checkbox" data-daily-task="${esc(t.id)}"><span><strong>${esc(t.subject)}${t.priority==='high'?' · Важное':''}</strong><span>${esc(t.text)}</span></span></label>`).join(''):'<p class="tool-hint">Невыполненных заданий на эту дату нет.</p>';
 if(typeof featureEventsForDay==='function')$('dailyTasks').insertAdjacentHTML('beforeend',featureEventsForDay(dailyClassName,dailyDate));
 const overdue=homework.filter(t=>t.class===dailyClassName&&!t.done&&t.due<T.clock().date).length;$('dailyOverdue').hidden=!overdue;$('dailyOverdue').textContent='Просроченные · '+overdue;
}
$('dailyTasks').onchange=e=>{const id=e.target.dataset.dailyTask;if(!id)return;const task=homework.find(t=>t.id===id);if(task){task.done=e.target.checked;saveHomework();toast('Задание выполнено')}};
$('dailyAllTasks').onclick=()=>openDailyTasks('open');$('dailyOverdue').onclick=()=>openDailyTasks('overdue');
$('dailyBag').onclick=()=>{if(!dailyDate||!data)return;$('taskClass').value=dailyClassName;resetTaskForm();plannerSubjects();renderTasks();$('bagDate').value=dailyDate;renderBag();document.querySelector('.packing').open=true;document.querySelector('.packing').scrollIntoView({behavior:'smooth',block:'center'})};
function renderNextSubject(){
 const subject=$('nextSubjectSelect').value,lessons=dailyClassLessons.filter(l=>l.subject===subject),state=T.live(lessons);nextSubjectLesson=state.next;
 $('nextSubjectResult').textContent=(state.current.length?'Сейчас идёт этот предмет. ':'')+(state.next?`${new Date(state.next.date+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})} · ${T.slot(state.next.lessons[0].number).label} · ${state.next.lessons.map(l=>l.room?'каб. '+l.room:'Кабинет не указан').join('; ')}`:'Следующий урок с известным временем не найден в учебном календаре.')+(lessons.some(l=>!T.slot(l.number))?' Есть уроки без времени — проверьте недельную таблицу.':'');
 $('openNextSubject').hidden=!state.next;
}
$('nextSubjectSelect').onchange=renderNextSubject;
$('openNextSubject').onclick=()=>{if(nextSubjectLesson)openDailyDate(nextSubjectLesson.date,nextSubjectLesson.lessons[0].number)};
$('schedule').addEventListener('click',e=>{
 const b=e.target.closest('[data-quick-task-class]');if(!b||!data)return;resetTaskForm();$('taskClass').value=b.dataset.quickTaskClass;plannerSubjects();$('taskSubject').value=b.dataset.quickTaskSubject;
 const date=P.nextDate(data.lessons.filter(l=>l.class===$('taskClass').value),$('taskSubject').value,T.clock().date,T.holiday);$('taskDue').value=date||T.clock().date;renderTasks();renderBag();$('taskText').focus();if(!date)toast('Следующий урок не найден — укажите срок задания');
});
let dailyClockDate=T.clock().date;
setInterval(()=>{const date=T.clock().date;if(date!==dailyClockDate){dailyClockDate=date;renderDaily()}else if(data&&$('nextSubject').open)renderNextSubject()},60000);
renderDaily();
// Keep anchor targets below the wrapping quick-navigation bar on narrow screens.
const dailyNavigationObserver=new ResizeObserver(entries=>document.documentElement.style.setProperty('--quick-offset',Math.ceil(entries[0].target.getBoundingClientRect().height+12)+'px'));
dailyNavigationObserver.observe(document.querySelector('.quick-actions'));
