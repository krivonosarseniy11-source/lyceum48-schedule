'use strict';
const H=window.SchoolStats;
let schoolTab='classes',schoolSource=null,schoolSnapshot=null,schoolCSV=[];
const schoolLabels={classes:'Все классы',parallels:'Различия параллелей',days:'Нагрузка школы по дням',teachers:'Учителя · нагрузка за неделю',rooms:'Кабинеты · занятость за неделю',subjects:'Предметы · часы по школе',today:'Учителя класса в школе'};
const schoolNumber=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
const schoolValue=r=>$('schoolUnit').value==='count'?r.count:$('schoolUnit').value==='minutes'?r.minutes:r.minutes/60;
const schoolUnitText=()=>$('schoolUnit').value==='count'?'уч. ч. / уроков':$('schoolUnit').value==='minutes'?'мин':'ч по 60 мин';
const schoolCell=r=>`${schoolNumber(schoolValue(r))}${r.unknown&&$('schoolUnit').value!=='count'?` <small>+ ${r.unknown} без времени</small>`:''}`;
function schoolTable(headers,rows,caption=''){
 return `<div class="compare-wrap"><table class="school-table">${caption?`<caption>${esc(caption)}</caption>`:''}<thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(cells=>'<tr>'+cells.map((c,i)=>i===0?`<th scope="row">${c}</th>`:`<td>${c}</td>`).join('')+'</tr>').join(''):`<tr><td colspan="${headers.length}">Данных нет.</td></tr>`}</tbody></table></div>`;
}
function schoolLink(mode,name,label=name,selectedDay=''){return `<button data-school-mode="${mode}" data-school-entity="${esc(name)}"${selectedDay!==''?` data-school-day="${selectedDay}"`:''}>${esc(label)}</button>`}
function renderSchool(){
 if(!data||schoolSource===data)return;
 const first=!schoolSource;schoolSource=data;
 const grades=[...new Set(data.classes.map(H.grade).filter(Boolean))].sort((a,b)=>+a-+b);options($('schoolGrade'),grades,$('schoolGrade').value||H.grade(mode==='class'?entity:storage.get('myClass')));
 options($('schoolTodayClass'),data.classes,$('schoolTodayClass').value||(mode==='class'?entity:storage.get('myClass')));
 if(first)$('schoolTodayDate').value=T.clock().date;
 schoolSnapshot=H.school(data,S,T,$('schoolSplit').value==='split');renderSchoolReport();
}
function renderSchoolReport(){
 if(!data||!schoolSnapshot)return;
 const snapshot=schoolSnapshot,total=snapshot.total;
 $('schoolTotals').innerHTML=[[snapshot.classes.length,'классов'],[total.count,'уроков / учебных часов'],[total.minutes,'минут занятий'],[schoolNumber(total.minutes/60),'часов по 60 минут'],[snapshot.teachers.length,'учителей'],[snapshot.rooms.length,'кабинетов / помещений']].map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('');
 document.querySelectorAll('[data-school-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.schoolTab===schoolTab));
 $('schoolUnitLabel').hidden=schoolTab==='today';$('schoolSubjectLabel').hidden=!['subjects','parallels'].includes(schoolTab);$('schoolGradeLabel').hidden=schoolTab!=='parallels';
 for(const id of ['schoolTodayClassLabel','schoolTodayDateLabel','schoolTodayNow','schoolTodayOnlyLabel'])$(id).hidden=schoolTab!=='today';
 $('schoolContext').textContent=schoolLabels[schoolTab]+' · '+(schoolTab==='today'?'расписание на дату':'полная неделя · сортировка по '+schoolUnitText());
 $('schoolChart').innerHTML='';$('schoolInsight').textContent='';$('schoolReport').innerHTML='';schoolCSV=[];
 const baseMethod='Учебный час здесь — один урок, без пересчёта в 45 минут. Время по 60 минут = сумма известных минут / 60. '+(total.unknown?`По школе ${total.unknown} слотов без времени; в минуты и часы по 60 минут они не входят. `:'');
 $('schoolMethod').textContent=baseMethod;
 if(schoolTab==='today'){renderSchoolToday();return}
 if(schoolTab==='parallels'){renderSchoolParallel();return}
 if(schoolTab==='days'){renderSchoolDays();return}
 const dimension={classes:'class',teachers:'teacher',rooms:'room',subjects:'subject'}[schoolTab];
 const rows=[...snapshot[schoolTab]].sort((a,b)=>schoolValue(b)-schoolValue(a)||b.count-a.count||a.name.localeCompare(b.name,'ru',{numeric:true}));
 const headers=['Место',{classes:'Класс',teachers:'Учитель',rooms:'Кабинет / помещение',subjects:'Предмет'}[schoolTab],'Уроки / уч. ч.','Минуты','Часы по 60 мин','Дней','Без времени'];
 if(schoolTab==='teachers'||schoolTab==='rooms')headers.push('Классов','Записей класс × урок');
 if(schoolTab==='rooms')headers.push('Занятость сетки 1–8');
 if(schoolTab==='subjects')headers.push('Классов');
 const max=Math.max(0,...rows.map(schoolValue)),leaders=rows.filter(r=>schoolValue(r)===max);
 $('schoolInsight').textContent=rows.length?`Лидирует: ${leaders.map(r=>r.name).join(', ')} · ${schoolNumber(max)} ${schoolUnitText()}. Показаны все: ${rows.length}.`:'Записей нет.';
 $('schoolReport').innerHTML=schoolTable(headers,rows.map((r,i)=>{
  const cells=[String(i+1),schoolLink(dimension,r.name),schoolNumber(r.count),schoolNumber(r.minutes),schoolNumber(r.minutes/60),r.days,r.unknown];
  if(schoolTab==='teachers'||schoolTab==='rooms')cells.push(r.classes,r.references);
  if(schoolTab==='rooms')cells.push(schoolNumber(new Set(r.lessons.filter(l=>l.number>=1&&l.number<=8).map(H.timeSlot)).size/48*100)+'%');
  if(schoolTab==='subjects')cells.push(r.classes);return cells;
 }));
 schoolCSV=[headers,...rows.map((r,i)=>{const cells=[i+1,r.name,r.count,r.minutes,schoolNumber(r.minutes/60),r.days,r.unknown];if(schoolTab==='teachers'||schoolTab==='rooms')cells.push(r.classes,r.references);if(schoolTab==='rooms')cells.push(schoolNumber(new Set(r.lessons.filter(l=>l.number>=1&&l.number<=8).map(H.timeSlot)).size/48*100)+'%');if(schoolTab==='subjects')cells.push(r.classes);return cells})];
 if(schoolTab==='teachers'||schoolTab==='rooms')$('schoolMethod').textContent+='Одновременные занятия нескольких классов считаются одним занятым уроком учителя или кабинета; число записей классов показано отдельно. Записи без учителя или кабинета не входят в соответствующий рейтинг. ';else $('schoolMethod').textContent+='Для класса один номер урока в один день считается один раз. ';
 if(schoolTab==='rooms')$('schoolMethod').textContent+='Занятость сетки = занятые слоты 1–8 / 48 (6 дней × 8 уроков). Спортзал включён как отдельное помещение. Это занятость по таблице первой смены, а не доступность помещения. ';
 if(schoolTab==='subjects')$('schoolMethod').textContent+=schoolSubjectMethod();
 renderSchoolRankingChart(rows.slice(0,10),dimension);
}
function schoolSubjectMethod(){return $('schoolSplit').value==='split'?'Каждому предмету подгруппы засчитывается полный урок. Сумма отдельных предметов может превышать общее число уроков классов.':'Совместные записи предметов сохранены как в таблице: например, «Английский язык / Информатика» — отдельная строка; её часы не прибавляются повторно к отдельным предметам.'}
function renderSchoolRankingChart(rows,dimension){
 const max=Math.max(1,...rows.map(schoolValue));$('schoolChart').innerHTML=rows.map(r=>`<button data-school-mode="${dimension}" data-school-entity="${esc(r.name)}"><span>${esc(r.name)}</span><i><b style="width:${schoolValue(r)/max*100}%"></b></i><strong>${schoolNumber(schoolValue(r))}</strong></button>`).join('');
}
function renderSchoolDays(){
 const rows=schoolSnapshot.days,max=Math.max(0,...rows.map(schoolValue)),leaders=rows.filter(r=>schoolValue(r)===max);
 $('schoolInsight').textContent=max?`Самый загруженный день школы: ${leaders.map(r=>S.DAYS[r.day]).join(', ')} · ${schoolNumber(max)} ${schoolUnitText()}.`:'Нагрузка по дням не найдена.';
 $('schoolChart').innerHTML=rows.map(r=>`<button data-school-mode="school" data-school-entity="" data-school-day="${r.day}"><span>${S.DAYS[r.day]}</span><i><b style="width:${schoolValue(r)/Math.max(1,max)*100}%"></b></i><strong>${schoolNumber(schoolValue(r))}</strong></button>`).join('');
 const headers=['День','Уроки / уч. ч.','Минуты','Часы по 60 мин','Классов','Без времени'];$('schoolReport').innerHTML=schoolTable(headers,rows.map(r=>[schoolLink('school','',S.DAYS[r.day],r.day),r.count,r.minutes,schoolNumber(r.minutes/60),r.classes,r.unknown]));schoolCSV=[headers,...rows.map(r=>[S.DAYS[r.day],r.count,r.minutes,schoolNumber(r.minutes/60),r.classes,r.unknown])];
 $('schoolMethod').textContent+='Нагрузка дня — сумма уроков всех классов. Одновременные уроки разных классов здесь складываются. При равенстве показаны все самые загруженные дни.';
}
function renderSchoolParallel(){
 const p=H.parallel(data,$('schoolGrade').value,S,T,$('schoolSplit').value==='split'),values=p.totals.map(schoolValue),max=values.length?Math.max(...values):0,min=values.length?Math.min(...values):0;
 $('schoolInsight').textContent=p.classes.length>1?`${$('schoolGrade').value}-я параллель · ${p.classes.join(', ')}. Разница недельной нагрузки: ${schoolNumber(max-min)} ${schoolUnitText()}.`:'В этой параллели один класс: различия между классами сравнить нельзя.';
 const totalHeaders=['Класс','Уроки / уч. ч.','Минуты','Часы по 60 мин','Учебных дней','Без времени'];
 const gradeRows=[...new Set(data.classes.map(H.grade).filter(Boolean))].sort((a,b)=>+a-+b).map(grade=>{const rows=schoolSnapshot.classes.filter(c=>H.grade(c.name)===grade),count=rows.reduce((n,r)=>n+r.count,0),minutes=rows.reduce((n,r)=>n+r.minutes,0);return {grade,classes:rows.length,count,minutes,average:rows.length?count/rows.length:0}});
 const gradeHeaders=['Параллель','Классов','Уроки / уч. ч. всего','Среднее уроков на класс','Минуты всего'];
 const gradeSummary=schoolTable(gradeHeaders,gradeRows.map(r=>[`<button data-school-grade="${r.grade}">${r.grade}-я параллель</button>`,r.classes,r.count,schoolNumber(r.average),r.minutes]),'Все параллели · общее и среднее на класс');
 const summary=schoolTable(totalHeaders,p.totals.map(r=>[schoolLink('class',r.name),r.count,r.minutes,schoolNumber(r.minutes/60),r.days,r.unknown]),'Нагрузка классов параллели');
 const matrixHeaders=['Предмет',...p.classes,'Разница макс. − мин.'];
 const matrix=p.subjects.map(r=>{const values=r.values.map(schoolValue),difference=values.length?Math.max(...values)-Math.min(...values):0;return [esc(r.name),...r.values.map(schoolCell),`<span class="${difference?'school-difference':''}">${schoolNumber(difference)}</span>`]});
 $('schoolReport').innerHTML=gradeSummary+summary+schoolTable(matrixHeaders,matrix,'Предметы параллели · '+schoolUnitText());
 schoolCSV=[gradeHeaders,...gradeRows.map(r=>[r.grade,r.classes,r.count,schoolNumber(r.average),r.minutes]),[],['Параллель',$('schoolGrade').value],totalHeaders,...p.totals.map(r=>[r.name,r.count,r.minutes,schoolNumber(r.minutes/60),r.days,r.unknown]),[],['Предмет · '+schoolUnitText(),...p.classes,'Разница макс. − мин.'],...p.subjects.map(r=>{const v=r.values.map(schoolValue);return [r.name,...v.map(schoolNumber),v.length?schoolNumber(Math.max(...v)-Math.min(...v)):0]})];
 $('schoolMethod').textContent+='В матрице 0 означает, что предмет не записан у класса. Разница сравнивает все классы этой параллели, включая нулевые значения. Разные названия предметов не объединяются автоматически. '+schoolSubjectMethod();
}
function renderSchoolToday(){
 if(!P.dateOK($('schoolTodayDate').value)){$('schoolReport').innerHTML='<p>Укажите корректную дату.</p>';return}
 const date=$('schoolTodayDate').value,cls=$('schoolTodayClass').value,result=H.teachersForClass(data,cls,date,S,T),teachers=$('schoolTodayOnly').checked?result.teachers.filter(t=>t.own.length):result.teachers;
 $('schoolContext').textContent=`${cls} класс · ${new Date(date+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · по расписанию первой смены`;
 $('schoolInsight').textContent=result.off?result.off:`У ${cls} сегодня ${new Set(result.classToday.map(H.classSlot)).size} уроков. Учителей класса с занятиями в школе: ${result.teachers.length}; с уроком у этого класса: ${result.teachers.filter(t=>t.own.length).length}.`;
 const headers=['Дата','Учитель','Урок','Время','Класс','Предмет (запись таблицы)','Кабинет','У выбранного класса'];schoolCSV=[headers];
 $('schoolReport').innerHTML=teachers.length?teachers.map(t=>{
  const ownNumbers=[...new Set(t.own.map(l=>l.number))].sort((a,b)=>a-b),ordered=[...t.all].sort((a,b)=>a.number-b.number||a.class.localeCompare(b.class,'ru',{numeric:true}));
  for(const l of ordered)schoolCSV.push([date,t.name,l.number,T.slot(l.number)?.label||'Время не указано',l.class,l.subject,l.room,l.class===cls?'Да':'Нет']);
  return `<details class="school-teacher-day"><summary>${esc(t.name)} <span>${t.count} уроков в школе · ${ownNumbers.length?'у '+esc(cls)+': '+ownNumbers.join(', '):'у '+esc(cls)+' уроков нет'}</span></summary>${schoolLink('teacher',t.name,'Открыть расписание учителя',result.day)}${schoolTable(['Урок','Время · МСК','Класс','Предмет (запись таблицы)','Кабинет'],ordered.map(l=>[String(l.number),T.slot(l.number)?.label||'Не указано',`<span class="${l.class===cls?'school-own-class':''}">${esc(l.class)}</span>`,esc(l.subject),esc(l.room||'Не указан')]))}</details>`;
 }).join(''):'<p class="tool-empty">По выбранным условиям уроков у учителей класса в этот день нет.</p>';
 if(result.missing.length)$('schoolReport').insertAdjacentHTML('beforeend',`<p class="tool-hint">У класса есть уроки без указанного учителя: ${result.missing.map(l=>l.number).join(', ')}. Они не включены в список учителей.</p>`);
 if(result.absent.length&&!result.off)$('schoolReport').insertAdjacentHTML('beforeend',`<details class="school-teacher-day"><summary>Без занятий в первой смене · ${result.absent.length}</summary><p>${esc(result.absent.join('; '))}</p></details>`);
 $('schoolMethod').textContent='По умолчанию показаны все учителя, встречающиеся в недельном расписании класса и имеющие занятия где-либо в школе на выбранную дату, даже если у этого класса сегодня не ведут. Раскройте имя, чтобы увидеть весь день учителя. Кабинет и предмет для записи с подгруппами показываются целиком: соответствие учителя конкретной подгруппе в источнике не установлено. Наличие уроков — данные расписания, а не подтверждение физического присутствия; каникулы учитываются.';
}
$('schoolPanel').addEventListener('click',e=>{
 const tab=e.target.closest('[data-school-tab]');if(tab){schoolTab=tab.dataset.schoolTab;renderSchoolReport();return}
 const gradeButton=e.target.closest('[data-school-grade]');if(gradeButton){$('schoolGrade').value=gradeButton.dataset.schoolGrade;renderSchoolReport();return}
 const button=e.target.closest('[data-school-mode]');if(!button||!data)return;
 const m=button.dataset.schoolMode,name=button.dataset.schoolEntity;clearFilters();view='week';
 if(m==='school'){$('searchAll').checked=true}else if(m==='subject'){$('searchAll').checked=true;if($('schoolSplit').value==='combined'){initialSubject=schoolSnapshot.subjects.find(r=>r.name===name)?.lessons[0]?.subject||''}else $('search').value='"'+name.replace(/"/g,'')+'"'}else{mode=m;entity=name}
 if(button.dataset.schoolDay!==undefined){day=+button.dataset.schoolDay;view='day'}populate();$('schedule').scrollIntoView({behavior:'smooth',block:'start'});
});
$('schoolUnit').onchange=renderSchoolReport;$('schoolGrade').onchange=renderSchoolReport;
$('schoolSplit').onchange=()=>{if(!data)return;schoolSnapshot=H.school(data,S,T,$('schoolSplit').value==='split');renderSchoolReport()};
['schoolTodayClass','schoolTodayDate','schoolTodayOnly'].forEach(id=>$(id).onchange=renderSchoolReport);
$('schoolTodayNow').onclick=()=>{$('schoolTodayDate').value=T.clock().date;renderSchoolReport()};
$('exportSchool').onclick=()=>{if(!schoolCSV.length)return toast('Нет данных для выгрузки');download('школа-'+schoolTab+'.csv',csv([['Раздел',schoolLabels[schoolTab]],...schoolCSV]),'text/csv;charset=utf-8')};
renderSchool();
