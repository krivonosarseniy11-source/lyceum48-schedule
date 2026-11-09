'use strict';
const advancedInputs={teacher:'filterTeacher',room:'filterRoom',first:'filterFirst',last:'filterLast',start:'filterStart',end:'filterEnd',missing:'filterMissing'};
let searchData=null,analysisData=null,analysisReport=[];
let savedSearches=readLocal('savedSearches',[]);
if(!Array.isArray(savedSearches))savedSearches=[];
savedSearches=savedSearches.filter(s=>s&&typeof s.name==='string'&&s.name.length<=60&&typeof s.query==='string'&&s.query.length<4000).slice(0,10);
function syncAdvancedUI(){
 for(const [key,id] of Object.entries(advancedInputs)){
  const el=$(id),value=advanced[key];
  if(el.tagName==='SELECT'&&value&&![...el.options].some(o=>o.value===value))el.add(new Option(value,value));el.value=value;
 }
 $('filterDays').querySelectorAll('input').forEach(el=>el.checked=advanced.days.includes(+el.value));
 $('advancedCount').textContent=Q.active(advanced)?'· есть условия':'';
 if(Q.active(advanced))$('advancedSearch').open=true;
 const reversedNumbers=advanced.first&&advanced.last&&+advanced.first>+advanced.last,reversedTime=advanced.start&&advanced.end&&advanced.start>=advanced.end;
 $('filterWarning').textContent=reversedNumbers?'Начальный номер урока больше конечного — результатов не будет.':reversedTime?'Начало диапазона должно быть раньше конца — результатов не будет.':'';
}
function advancedChanged(){
 const p=new URLSearchParams();for(const [key,id] of Object.entries(advancedInputs))p.set(key,$(id).value);
 p.set('sdays',[...$('filterDays').querySelectorAll('input:checked')].map(el=>el.value).join(','));advanced=Q.readParams(p);syncAdvancedUI();render();
}
for(const id of Object.values(advancedInputs))$(id).addEventListener('change',advancedChanged);
$('filterDays').onchange=advancedChanged;
$('clearAdvanced').onclick=()=>{advanced=Q.readParams(new URLSearchParams());syncAdvancedUI();render()};
function renderSavedSearches(){
 $('savedSearches').innerHTML=savedSearches.map((s,i)=>`<div><button data-saved-search="${i}" title="${esc(s.query)}">${esc(s.name)}</button><button data-delete-search="${i}" aria-label="Удалить поиск ${esc(s.name)}">×</button></div>`).join('');
}
function persistSearches(next){try{localStorage.setItem('savedSearches',JSON.stringify(next));savedSearches=next;renderSavedSearches();return true}catch{toast('Не удалось сохранить поиски в браузере');return false}}
$('saveSearch').onclick=()=>{
 if(!data)return toast('Дождитесь загрузки расписания');const name=$('searchName').value.trim();if(!name){$('searchName').focus();return toast('Введите название поиска')}
 const next=savedSearches.filter(s=>s.name!==name);if(next.length>=10)return toast('Можно сохранить до 10 поисков');next.push({name,query:location.search});if(persistSearches(next)){$('searchName').value='';toast('Поиск сохранён на этом устройстве')}
};
$('savedSearches').onclick=e=>{
 const remove=e.target.closest('[data-delete-search]');if(remove){persistSearches(savedSearches.filter((_,i)=>i!==+remove.dataset.deleteSearch));return}
 const b=e.target.closest('[data-saved-search]');if(!b||!data)return;const p=new URLSearchParams(savedSearches[+b.dataset.savedSearch].query);
 mode=['class','teacher','room'].includes(p.get('mode'))?p.get('mode'):'class';entity=p.get('entity')||'';day=/^[0-5]$/.test(p.get('day'))?+p.get('day'):0;view=p.get('view')==='week'?'week':'day';advanced=Q.readParams(p);$('search').value=p.get('q')||'';$('atTime').value=T.minute(p.get('time'))!==null?p.get('time'):'';$('searchAll').checked=p.get('all')==='1';$('subject').value='';initialSubject=p.get('subject')||'';syncAdvancedUI();populate();$('title').scrollIntoView({behavior:'smooth',block:'center'});
};
function renderSearchTools(){
 if(!data)return;
 if(searchData!==data){
  searchData=data;
  const sorted=values=>[...new Set(values)].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
  options($('filterTeacher'),sorted(data.lessons.flatMap(S.teachers)),advanced.teacher,'Любой учитель');options($('filterRoom'),sorted(data.lessons.flatMap(S.rooms)),advanced.room,'Любой кабинет');syncAdvancedUI();
  $('searchSuggestions').innerHTML=sorted([...data.classes,...data.lessons.map(l=>l.subject),...data.lessons.flatMap(S.teachers),...data.lessons.flatMap(S.rooms)]).map(v=>`<option value="${esc(v)}"></option>`).join('');
 }
 if(analysisData!==data){analysisData=data;if(!$('analysisEntity').options.length){$('analysisMode').value=mode;populateAnalysis(entity)}else populateAnalysis($('analysisEntity').value)}
}
function populateAnalysis(preferred=''){
 if(!data)return;const m=$('analysisMode').value,values=m==='class'?data.classes:[...new Set(data.lessons.flatMap(m==='teacher'?S.teachers:S.rooms))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));options($('analysisEntity'),values,preferred);renderAnalysis();
}
const formatMinute=m=>m===null?'—':String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
function renderAnalysis(){
 if(!data)return;const m=$('analysisMode').value,selected=$('analysisEntity').value,ls=data.lessons.filter(l=>S.matches(l,{mode:m,entity:selected}));
 analysisReport=Q.analyze(ls,S,T);const occupied=analysisReport.reduce((s,d)=>s+d.numbers.length,0),minutes=analysisReport.reduce((s,d)=>s+d.minutes,0),windows=analysisReport.reduce((s,d)=>s+d.windows.length,0),windowMinutes=analysisReport.reduce((s,d)=>s+d.windowMinutes,0),active=analysisReport.filter(d=>d.numbers.length),longest=Math.max(0,...analysisReport.map(d=>d.longest)),unknown=analysisReport.reduce((s,d)=>s+d.unknown,0);
 $('analysisContext').textContent=`${m==='class'?'Класс':m==='teacher'?'Учитель':'Кабинет'}: ${selected} · полная неделя · ${ls.length} записей`;
 const metrics=[[occupied,'занятых уроков'],[`${Math.floor(minutes/60)} ч ${minutes%60} мин`,'учебного времени'],[windows,'окон между уроками'],[windowMinutes,'минут в окнах по звонкам'],[longest,'уроков подряд · максимум'],[active.length,'учебных дней']];
 $('analysisMetrics').innerHTML=metrics.map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('');
 const max=Math.max(0,...active.map(d=>d.numbers.length)),min=active.length?Math.min(...active.map(d=>d.numbers.length)):0;
 $('analysisInsights').textContent=active.length?`Больше всего уроков: ${active.filter(d=>d.numbers.length===max).map(d=>S.DAYS[d.day]).join(', ')} (${max}). Меньше всего в учебные дни: ${active.filter(d=>d.numbers.length===min).map(d=>S.DAYS[d.day]).join(', ')} (${min}).${unknown?' Слотов без известного времени: '+unknown+'. Они не входят в минуты и границы дня.':''}`:'По этому выбору занятий нет.';
 $('analysisHeatmap').innerHTML=analysisReport.map(d=>`<tr><th scope="row">${['Пн','Вт','Ср','Чт','Пт','Сб'][d.day]}</th>${Array.from({length:8},(_,i)=>{const lessons=d.records.filter(l=>l.number===i+1);return `<td><button class="${lessons.length>1?'heat-busy':lessons.length?'heat-filled':'heat-empty'}" data-analysis-day="${d.day}" data-analysis-number="${i+1}" title="${esc(lessons.map(l=>`${l.subject} · ${l.class}`).join('; ')||'Нет записи')}" aria-label="${S.DAYS[d.day]}, ${i+1} урок: ${lessons.length} записей">${lessons.length||'—'}</button></td>`}).join('')}</tr>`).join('');
 $('analysisRows').innerHTML=analysisReport.map(d=>`<tr><th scope="row"><button data-analysis-day="${d.day}">${S.DAYS[d.day]}</button></th><td>${d.numbers.length}</td><td>${formatMinute(d.start)} — ${formatMinute(d.end)}</td><td>${d.minutes}${d.unknown?` <small>+ ${d.unknown} без времени</small>`:''}</td><td>${d.windows.length?`${d.windows.join(', ')} · ${d.windowMinutes} мин`:'—'}</td><td>${d.longest}</td><td>${d.changes}</td></tr>`).join('');
 const overlaps=m==='class'?[]:analysisReport.flatMap(d=>d.conflicts.map(c=>({...c,day:d.day})));
 $('overlapCount').textContent=`· ${overlaps.length}`;
 $('analysisOverlaps').innerHTML=overlaps.length?overlaps.map(c=>`<button class="overlap-item" data-analysis-day="${c.day}" data-analysis-number="${c.number}"><strong>${S.DAYS[c.day]} · ${c.number} урок</strong><span>${esc(c.lessons.map(l=>`${l.class} · ${l.subject}`).join('; '))}</span></button>`).join(''):`<p class="tool-empty">${m==='class'?'Выберите учителя или кабинет для проверки совпадений между классами.':'Совпадений между разными классами не найдено.'}</p>`;
}
$('analysisMode').onchange=()=>populateAnalysis();$('analysisEntity').onchange=renderAnalysis;
$('analyzeSelected').onclick=()=>{if(!data)return;$('analysisMode').value=mode;populateAnalysis(entity)};
function openAnalysisLesson(e){const b=e.target.closest('[data-analysis-day]');if(!b||!data)return;clearFilters();mode=$('analysisMode').value;entity=$('analysisEntity').value;day=+b.dataset.analysisDay;view='day';if(b.dataset.analysisNumber){advanced.first=b.dataset.analysisNumber;advanced.last=b.dataset.analysisNumber;syncAdvancedUI()}populate();$('schedule').scrollIntoView({behavior:'smooth',block:'start'})}
['analysisHeatmap','analysisRows','analysisOverlaps'].forEach(id=>$(id).onclick=openAnalysisLesson);
$('exportAnalysis').onclick=()=>{if(!data)return;download('анализ-недели.csv',csv([['Режим','Выбор','День','Занятых уроков','Начало','Конец','Минуты занятий','Окна (номера)','Минуты окон','Максимум подряд','Смен кабинета','Слотов без времени'],...analysisReport.map(d=>[$('analysisMode').selectedOptions[0].textContent,$('analysisEntity').value,S.DAYS[d.day],d.numbers.length,formatMinute(d.start),formatMinute(d.end),d.minutes,d.windows.join(', '),d.windowMinutes,d.longest,d.changes,d.unknown])]),'text/csv;charset=utf-8')};
syncAdvancedUI();renderSavedSearches();renderSearchTools();
