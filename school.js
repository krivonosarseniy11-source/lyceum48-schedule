'use strict';
const H=window.SchoolStats;
let schoolTab='classes',schoolSource=null,schoolSnapshot=null,schoolCSV=[];
const schoolLabels={audit:'Проверка исходной таблицы',classes:'Все классы',parallels:'Различия параллелей',days:'Нагрузка школы по дням',teachers:'Учителя · нагрузка за неделю',rooms:'Кабинеты · занятость за неделю',subjects:'Предметы · часы по школе',today:'Учителя класса в школе'};
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
 const grades=schoolComparisonGradeList();options($('schoolGrade'),grades,$('schoolGrade').value||H.grade(mode==='class'?entity:storage.get('myClass')));for(const option of $('schoolGrade').options)if(!data.classes.some(c=>H.grade(c)===option.value))option.textContent=option.value+' — нет данных';
 options($('schoolTodayClass'),data.classes,$('schoolTodayClass').value||(mode==='class'?entity:storage.get('myClass')));
 if(first)$('schoolTodayDate').value=T.clock().date;
 schoolSnapshot=H.school(data,S,T,$('schoolSplit').value==='split');renderSchoolReport();
}
function renderSchoolReport(){
 if(!data||!schoolSnapshot)return;
 const snapshot=schoolSnapshot,total=snapshot.total;
 $('schoolTotals').innerHTML=[[snapshot.classes.length,'классов'],[total.count,'уроков / учебных часов'],[total.minutes,'минут занятий'],[schoolNumber(total.minutes/60),'часов по 60 минут'],[snapshot.teachers.length,'учителей'],[snapshot.rooms.length,'кабинетов / помещений']].map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('');
 document.querySelectorAll('[data-school-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.schoolTab===schoolTab));
 $('schoolUnitLabel').hidden=['today','audit'].includes(schoolTab);$('auditControls').hidden=schoolTab!=='audit';$('schoolSubjectLabel').hidden=!['subjects','parallels'].includes(schoolTab);$('schoolGradeLabel').hidden=schoolTab!=='parallels'||$('schoolCompareMode').value!=='classes';$('schoolComparisonControls').hidden=schoolTab!=='parallels';
 for(const id of ['schoolTodayClassLabel','schoolTodayDateLabel','schoolTodayNow','schoolTodayOnlyLabel'])$(id).hidden=schoolTab!=='today';
 $('schoolContext').textContent=schoolLabels[schoolTab]+' · '+(schoolTab==='today'?'расписание на дату':'полная неделя · сортировка по '+schoolUnitText());
 $('schoolChart').innerHTML='';$('schoolInsight').textContent='';$('schoolReport').innerHTML='';schoolCSV=[];
 const baseMethod='Учебный час здесь — один урок, без пересчёта в 45 минут. Время по 60 минут = сумма известных минут / 60. '+(total.unknown?`По школе ${total.unknown} слотов без времени; в минуты и часы по 60 минут они не входят. `:'');
 $('schoolMethod').textContent=baseMethod;
 if(schoolTab==='audit'){if(typeof renderAudit==='function')renderAudit();return}
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
let schoolComparedGrades=null,schoolComparedClasses={};
function schoolComparisonGradeList(){return [...new Set([...Array.from({length:7},(_,i)=>String(i+5)),...data.classes.map(H.grade).filter(Boolean)])].sort((a,b)=>+a-+b)}
function schoolComparisonChoices(){
 const between=$('schoolCompareMode').value==='grades',grade=$('schoolGrade').value,availableGrades=[...new Set(data.classes.map(H.grade))];
 if(schoolComparedGrades===null)schoolComparedGrades=[...availableGrades];
 const choices=between?schoolComparisonGradeList():data.classes.filter(c=>H.grade(c)===grade).sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
 if(!between&&!Object.hasOwn(schoolComparedClasses,grade))schoolComparedClasses[grade]=[...choices];
 const selected=between?schoolComparedGrades:schoolComparedClasses[grade];
 $('schoolCompareLegend').textContent=between?'Выберите параллели для сравнения':'Выберите классы '+grade+'-й параллели';
 $('schoolCompareChoices').innerHTML=choices.map(id=>{const available=between?availableGrades.includes(id):true;return `<label class="${available?'':'school-no-data'}"><input type="checkbox" value="${esc(id)}" ${selected.includes(id)?'checked':''}><span>${esc(between?id+'-я':id)}${available?'':' · нет данных'}</span></label>`}).join('');
 $('schoolCompareBasisLabel').hidden=!between;
 const missing=schoolComparisonGradeList().filter(g=>!availableGrades.includes(g));
 $('schoolCompareAvailability').textContent=between?(missing.length?'В исходной таблице нет '+missing.join(', ')+'-х классов. Их можно отметить, но значения будут «Нет данных», а не нули.':'Показаны все доступные параллели из исходной таблицы.'):(choices.length?'Выбрано классов: '+selected.filter(c=>choices.includes(c)).length+' из '+choices.length+'.':'В исходной таблице нет классов этой параллели.');
 return choices.filter(id=>selected.includes(id));
}
function renderSchoolParallel(){
 if(typeof renderComparisonPresets==='function')renderComparisonPresets();
 const between=$('schoolCompareMode').value==='grades',selected=schoolComparisonChoices(),report=H.compare(data,between?'grades':'classes',selected,S,T,$('schoolSplit').value==='split'),items=report.items;
 $('schoolContext').textContent=(between?'Сравнение параллелей':'Сравнение классов '+$('schoolGrade').value+'-й параллели')+' · полная неделя';
 if(!items.length){$('schoolInsight').textContent='Отметьте хотя бы две параллели или два класса для сравнения.';$('schoolReport').innerHTML='<p class="tool-empty">Выбор пуст. Данные не подменяются общими итогами школы.</p>';$('schoolMethod').textContent='Сравнение использует только исходную таблицу первой смены.';return}
 const available=items.filter(i=>i.available),basis=between&&$('schoolCompareBasis').value==='average',dimension=$('schoolCompareDimension').value;
 const spread=values=>{const numbers=values.filter(v=>v!==null);return numbers.length<2?null:Math.max(...numbers)-Math.min(...numbers)},show=v=>v===null?'Нет данных':schoolNumber(v),difference=v=>v===null?'—':schoolNumber(v);
 const headers=['Показатель',...items.map(i=>i.label),'Разница макс. − мин.'];
 const specs=[['Классов в таблице',i=>i.classCount],['Уроки / учебные часы — всего',i=>i.count],['Минуты занятий — всего',i=>i.minutes],['Часы по 60 минут — всего',i=>i.minutes/60],['Разных предметов',i=>i.subjectCount],['Разных учителей',i=>i.teacherCount],['Разных кабинетов / помещений',i=>i.roomCount],['Учебных дней',i=>i.days],['Слотов без времени',i=>i.unknown]];
 if(between)specs.push(['Уроков в среднем на класс',i=>i.count/i.classCount],['Минут в среднем на класс',i=>i.minutes/i.classCount],['Часов по 60 минут в среднем на класс',i=>i.minutes/60/i.classCount],['Предметов в среднем у класса',i=>i.avgSubjects],['Учителей в среднем у класса',i=>i.avgTeachers],['Кабинетов в среднем у класса',i=>i.avgRooms]);
 const summary=specs.map(([name,get])=>{const values=items.map(i=>i.available?get(i):null);return {name,values,delta:spread(values)}});
 const matrix=report.matrices[dimension].map(r=>{const values=r.values.map((v,index)=>v===null?null:schoolValue(v)/(basis?items[index].classCount:1));return {...r,numbers:values,delta:spread(values)}});
 const onlyDiff=$('schoolOnlyDifferences').checked,shown=onlyDiff?matrix.filter(r=>r.delta!==null&&r.delta>1e-9):matrix,changed=matrix.filter(r=>r.delta!==null&&r.delta>1e-9).length;
 const summaryRows=summary.map(r=>[esc(r.name),...r.values.map(show),`<span class="${r.delta?'school-difference':''}">${difference(r.delta)}</span>`]);
 const dimensionNames={subject:'Предметы',teacher:'Учителя',room:'Кабинеты',day:'Дни недели'},matrixHeaders=[dimensionNames[dimension],...items.map(i=>i.label),'Разница макс. − мин.'];
 const matrixRows=shown.map(r=>[dimension==='subject'||dimension==='day'?esc(r.name):schoolLink(dimension,r.name),...r.numbers.map((v,index)=>`${show(v)}${r.values[index]?.unknown&&$('schoolUnit').value!=='count'?` <small>+ ${r.values[index].unknown} слотов без времени</small>`:''}`),`<span class="${r.delta?'school-difference':''}">${difference(r.delta)}</span>`]);
 const unit=schoolUnitText()+(basis?' в среднем на класс':' всего');
 $('schoolReport').innerHTML=schoolTable(headers,summaryRows,'Общие показатели: число предметов, учителей и кабинетов — уникальные значения')+schoolTable(matrixHeaders,matrixRows,dimensionNames[dimension]+' · '+unit)+(onlyDiff&&!shown.length?'<p class="tool-hint">Для сравнения нужны две группы с данными. Если они выбраны, различий по этому срезу нет.</p>':'');
 const loads=available.map(i=>schoolValue(i)/(basis?i.classCount:1)),loadDelta=spread(loads),unknown=available.reduce((n,i)=>n+i.unknown,0);
 $('schoolInsight').textContent=(available.length>=2?`Сравниваются: ${available.map(i=>i.label).join(', ')}. Разница нагрузки: ${schoolNumber(loadDelta)} ${unit}. `:'Нужно хотя бы две группы с данными для вычисления различий. ')+`В срезе «${dimensionNames[dimension]}» строк с различиями: ${changed} из ${matrix.length}.`+(items.some(i=>!i.available)?' Группы без данных не участвуют в разнице.':'');
 $('schoolChart').innerHTML=available.map((i,index)=>`<div><span>${esc(i.label)}</span><i><b style="width:${loads[index]/Math.max(1,...loads)*100}%"></b></i><strong>${schoolNumber(loads[index])}</strong></div>`).join('');
 const method='Данные первой смены за неделю. Между параллелями можно сравнить итоги и среднее на класс; общие показатели подписаны отдельно. Учителя, кабинеты и предметы считаются без повторения имён; пустые поля учителя и кабинета не увеличивают их количество; среднее их числа вычисляется по отдельным классам. В подробной матрице учителей и кабинетов считаются уроки классов: одно совместное занятие двух классов даёт две записи нагрузки классов. Разница — максимум минус минимум среди выбранных групп с данными. Ноль означает отсутствие записи в имеющемся расписании; «Нет данных» — отсутствие всей группы в источнике. Длительность без известных звонков не входит в минуты и часы по 60 минут. '+schoolSubjectMethod();
 $('schoolMethod').textContent=method+(unknown?' Слотов без времени в выбранных группах: '+unknown+'.':'');
 schoolCSV=[['Режим',between?'Между параллелями':'Классы внутри '+$('schoolGrade').value+'-й параллели'],['Подробный срез',dimensionNames[dimension]],['Единица подробностей',unit],['Предметы подгрупп',$('schoolSplit').selectedOptions[0].textContent],headers,...summary.map(r=>[r.name,...r.values.map(show),difference(r.delta)]),[],matrixHeaders,...shown.map(r=>[r.name,...r.numbers.map(show),difference(r.delta)]),[],['Методика',method]];
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
 const gradeButton=e.target.closest('[data-school-grade]');if(gradeButton){$('schoolGrade').value=gradeButton.dataset.schoolGrade;$('schoolCompareMode').value='classes';renderSchoolReport();return}
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
$('schoolCompareMode').onchange=renderSchoolReport;$('schoolCompareBasis').onchange=renderSchoolReport;$('schoolCompareDimension').onchange=renderSchoolReport;$('schoolOnlyDifferences').onchange=renderSchoolReport;
$('schoolCompareChoices').onchange=()=>{const selected=[...$('schoolCompareChoices').querySelectorAll('input:checked')].map(el=>el.value);if($('schoolCompareMode').value==='grades')schoolComparedGrades=selected;else schoolComparedClasses[$('schoolGrade').value]=selected;renderSchoolReport()};
$('schoolCompareAll').onclick=()=>{if(!data)return;if($('schoolCompareMode').value==='grades')schoolComparedGrades=[...new Set(data.classes.map(H.grade))];else schoolComparedClasses[$('schoolGrade').value]=data.classes.filter(c=>H.grade(c)===$('schoolGrade').value);renderSchoolReport()};
$('schoolCompareNone').onclick=()=>{if($('schoolCompareMode').value==='grades')schoolComparedGrades=[];else schoolComparedClasses[$('schoolGrade').value]=[];renderSchoolReport()};
renderSchool();
