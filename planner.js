'use strict';
const P=window.Planner;
let homework=[];
try{homework=P.tasks(readLocal('homework',[]))}catch{}
let editingTask=null,plannerReady=false;
const bagChecks=readLocal('bagChecks',{});
const safeBagChecks=bagChecks&&typeof bagChecks==='object'&&!Array.isArray(bagChecks)?bagChecks:{};
function saveHomework(){storage.set('homework',JSON.stringify(homework));renderTasks();renderBag()}
function plannerClasses(){
 if(!data)return;
 const preferred=mode==='class'?entity:storage.get('myClass')||data.classes[0];
 for(const id of ['taskClass','compareA','compareB'])options($(id),data.classes,$(id).value||(id==='compareB'?data.classes.find(c=>c!==preferred):preferred));
 if(!plannerReady){$('taskDue').value=T.clock().date;const d=new Date(T.clock().date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);$('bagDate').value=d.toISOString().slice(0,10);$('compareDay').innerHTML=S.DAYS.slice(0,6).map((d,i)=>`<option value="${i}">${d}</option>`).join('');$('compareDay').value=day;plannerReady=true}
 plannerSubjects();renderTasks();renderBag();renderComparison();
}
function plannerSubjects(){if(!data)return;options($('taskSubject'),[...new Set(data.lessons.filter(l=>l.class===$('taskClass').value).map(l=>l.subject))].sort((a,b)=>a.localeCompare(b,'ru')),$('taskSubject').value)}
function renderTasks(){
 const today=T.clock().date,tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 const scope=homework.filter(t=>$('taskAllClasses').checked||t.class===$('taskClass').value),filter=$('taskFilter').value;
 const shown=scope.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done&&(filter==='open'||filter==='overdue'&&t.due<today||filter==='soon'&&t.due>=today&&t.due<=tomorrow.toISOString().slice(0,10)))).sort((a,b)=>a.due.localeCompare(b.due)||(a.priority==='high'?-1:0)-(b.priority==='high'?-1:0)||a.subject.localeCompare(b.subject,'ru'));
 $('taskSummary').textContent=`Осталось: ${scope.filter(t=>!t.done).length} · Просрочено: ${scope.filter(t=>!t.done&&t.due<today).length} · Показано: ${shown.length}`;
 $('taskList').innerHTML=shown.length?shown.map(t=>`<article class="task-item ${t.done?'task-done':''}" data-task-id="${esc(t.id)}"><label class="task-check"><input type="checkbox" data-task-done ${t.done?'checked':''}><span class="sr">Выполнено: ${esc(t.subject)}</span></label><div><strong>${esc(t.subject)} · ${esc(t.class)}</strong><small class="${!t.done&&t.due<today?'overdue':''}">${new Date(t.due+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}${!t.done&&t.due<today?' · Просрочено':''}${t.priority==='high'?' · Важное':''}</small><p>${esc(t.text)}</p></div><div class="task-actions"><button type="button" data-task-edit>Изменить</button><button type="button" data-task-delete>Удалить</button></div></article>`).join(''):'<p class="tool-empty">В этом списке пока нет заданий.</p>';
}
function resetTaskForm(){editingTask=null;$('taskText').value='';$('taskPriority').value='normal';$('saveTask').textContent='＋ Добавить задание';$('cancelTask').hidden=true}
$('taskForm').onsubmit=e=>{
 e.preventDefault();const text=$('taskText').value.trim();if(!text)return $('taskText').focus();
 if(!P.dateOK($('taskDue').value))return toast('Укажите корректную дату');
 if(!editingTask&&homework.length>=2000)return toast('Сохранено 2000 заданий. Удалите ненужные записи');
 const task={id:editingTask||crypto.randomUUID(),class:$('taskClass').value,subject:$('taskSubject').value,text,due:$('taskDue').value,priority:$('taskPriority').value,done:homework.find(t=>t.id===editingTask)?.done||false};
 try{P.tasks([task])}catch{return toast('Проверьте класс, предмет и текст задания')}
 if(editingTask)homework=homework.map(t=>t.id===editingTask?task:t);else homework.push(task);resetTaskForm();saveHomework();toast('Задание сохранено');
};
$('cancelTask').onclick=resetTaskForm;
$('taskClass').onchange=()=>{resetTaskForm();plannerSubjects();renderTasks();renderBag()};
$('nextLessonDate').onclick=()=>{if(!data)return;const date=P.nextDate(data.lessons.filter(l=>l.class===$('taskClass').value),$('taskSubject').value,T.clock().date,T.holiday);if(date){$('taskDue').value=date;toast('Срок — ближайший следующий урок по календарю')}else toast('Следующий урок в учебном календаре не найден')};
['taskFilter','taskAllClasses'].forEach(id=>$(id).onchange=renderTasks);
$('taskList').onchange=e=>{if(!e.target.matches('[data-task-done]'))return;const task=homework.find(t=>t.id===e.target.closest('[data-task-id]').dataset.taskId);if(task){task.done=e.target.checked;saveHomework()}};
$('taskList').onclick=e=>{
 const item=e.target.closest('[data-task-id]');if(!item)return;const task=homework.find(t=>t.id===item.dataset.taskId);if(!task)return;
 if(e.target.closest('[data-task-edit]')){editingTask=task.id;$('taskClass').value=task.class;plannerSubjects();if(!$('taskSubject').querySelector(`option[value="${CSS.escape(task.subject)}"]`)){const option=new Option(task.subject,task.subject);$('taskSubject').add(option)}$('taskSubject').value=task.subject;$('taskDue').value=task.due;$('taskPriority').value=task.priority;$('taskText').value=task.text;$('saveTask').textContent='Сохранить изменения';$('cancelTask').hidden=false;$('taskText').focus()}
 if(e.target.closest('[data-task-delete]')){homework=homework.filter(t=>t.id!==task.id);if(editingTask===task.id)resetTaskForm();saveHomework();toast('Задание удалено')}
};
function renderBag(){
 if(!data||!P.dateOK($('bagDate').value))return;
 const date=$('bagDate').value,cls=$('taskClass').value,weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7,off=T.holiday(date);
 const lessons=off?[]:data.lessons.filter(l=>l.class===cls&&l.day===weekday).sort((a,b)=>a.number-b.number),subjects=[...new Set(lessons.map(l=>l.subject))];
 $('bagHint').textContent=`${cls} · ${off||S.DAYS[weekday]||'Воскресенье'} · ${subjects.length} предметов. Отметки сохраняются для этой даты.`;
 $('bagList').innerHTML=subjects.map((subject,i)=>{const key=JSON.stringify([date,cls,subject]),tasks=homework.filter(t=>t.class===cls&&t.subject===subject&&t.due===date&&!t.done);return `<label class="bag-item"><input type="checkbox" data-bag-key="${esc(key)}" ${safeBagChecks[key]?'checked':''}><span><strong>${esc(subject)}</strong>${tasks.map(t=>`<small>${esc(t.text)}</small>`).join('')}</span></label>`}).join('')||'<p class="tool-empty">По недельному расписанию занятий нет.</p>';
}
$('bagDate').onchange=renderBag;
$('bagList').onchange=e=>{const key=e.target.dataset.bagKey;if(!key)return;if(e.target.checked)safeBagChecks[key]=true;else delete safeBagChecks[key];storage.set('bagChecks',JSON.stringify(safeBagChecks))};
function renderComparison(){
 if(!data)return;const a=$('compareA').value,b=$('compareB').value,rows=P.compare(data.lessons,a,b,+$('compareDay').value),free=rows.filter(r=>!r.a.length&&!r.b.length).map(r=>r.number);
 $('compareHeadingA').textContent=a;$('compareHeadingB').textContent=b;
 $('compareSummary').textContent=(a===b?'Выбран один и тот же класс. ':'')+(free.length?`Нет занятий у обоих: ${free.join(', ')} урок.`:'Общих свободных уроков по таблице нет.');
 const cell=ls=>ls.length?ls.map(l=>`<strong>${esc(l.subject)}</strong><small>${esc(l.teacher||'Учитель не указан')} · ${esc(l.room||'Кабинет не указан')}</small>`).join(''):'<span>Нет занятий</span>';
 $('compareRows').innerHTML=rows.map(r=>`<tr class="${!r.a.length&&!r.b.length?'common-free':''}"><th scope="row">${r.number}<small>${T.slot(r.number).label}</small></th><td>${cell(r.a)}</td><td>${cell(r.b)}</td></tr>`).join('');
}
['compareA','compareB','compareDay'].forEach(id=>$(id).onchange=renderComparison);
$('copySchedule').onclick=async()=>{const lessons=filteredLessons().filter(l=>view==='week'||l.day===day).sort((a,b)=>a.day-b.day||a.number-b.number||a.class.localeCompare(b.class,'ru'));if(!lessons.length)return toast('Нет уроков для копирования');const text=[$('title').textContent,...lessons.map(l=>`${S.DAYS[l.day]} · ${l.number}. ${T.slot(l.number)?.label||'Время не указано'} · ${l.subject} · ${l.class} · ${l.teacher||'Учитель не указан'} · ${l.room||'Кабинет не указан'}`)].join('\n');try{await navigator.clipboard.writeText(text);toast('Расписание скопировано текстом')}catch{download('расписание.txt',text,'text/plain;charset=utf-8');toast('Текст сохранён в файл')}};
$('backupExport').onclick=()=>{download('лицей48-личные-данные.json',JSON.stringify({app:'lyceum48',version:1,exportedAt:new Date().toISOString(),tasks:homework,notes,favorites,myClass:storage.get('myClass')||''},null,2),'application/json');$('backupStatus').textContent='Копия скачана. Файл содержит ваши личные заметки и задания.'};
$('backupImport').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>3*1024*1024)throw Error('Максимальный размер копии — 3 МБ');const imported=P.backup(JSON.parse(await file.text()));
  const ids=new Set(homework.map(t=>t.id)),added=imported.tasks.filter(t=>!ids.has(t.id));if(homework.length+added.length>2000)throw Error('После объединения получится больше 2000 заданий');
  const mergedNotes={...imported.notes,...notes},mergedFavorites=[...favorites];
  for(const f of imported.favorites)if(mergedFavorites.length<8&&!mergedFavorites.some(v=>v.mode===f.mode&&v.entity===f.entity))mergedFavorites.push(f);
  const updates={homework:JSON.stringify([...homework,...added]),lessonNotes:JSON.stringify(mergedNotes),favorites:JSON.stringify(mergedFavorites)};
  if(!storage.get('myClass')&&imported.myClass)updates.myClass=imported.myClass;
  const previous=Object.fromEntries(Object.keys(updates).map(k=>[k,localStorage.getItem(k)]));
  try{for(const [k,v] of Object.entries(updates))localStorage.setItem(k,v)}catch(error){for(const [k,v] of Object.entries(previous))try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{}throw Error('Не удалось сохранить копию: проверьте свободное место и доступ к хранилищу')}
  homework.push(...added);notes=mergedNotes;favorites=mergedFavorites;render();renderTasks();renderBag();$('backupStatus').textContent=`Данные объединены. Добавлено заданий: ${added.length}. Текущие записи сохранены.`;
 }catch(error){$('backupStatus').textContent='Копия не загружена. '+(error instanceof SyntaxError?'Файл не является корректным JSON.':error.message)}finally{e.target.value=''}
};
// Data can arrive from the local cache before this script, or asynchronously later.
const originalRenderExtras=renderExtras;
renderExtras=function(all){originalRenderExtras(all);if(!plannerReady&&data)plannerClasses()};
if(data)plannerClasses();
