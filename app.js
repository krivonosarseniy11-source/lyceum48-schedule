'use strict';
const S=window.Schedule,T=window.Timing,Q=window.SearchTools,U=window.Useful,$=id=>document.getElementById(id);
const SHEET='1tGzeVcjc4gKja-uegpOFkvOW61I50SP3zPipSCfTxqY';
const SOURCE=`https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?gid=82782917&headers=0`;
const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const params=new URLSearchParams(location.search);
let advanced=Q.readParams(params),scheduleDataDate='',lastScheduleChange=null;
try{const saved=JSON.parse(storage.get('scheduleChanges'));if(U.validChange(saved))lastScheduleChange=saved}catch{}
function matchesLesson(l,criteria){return S.matches(l,{...criteria,search:''})&&Q.queryMatch(l,criteria.search||'',S.rooms)&&Q.filter(l,advanced,S,T)}
const displayDay=d=>d===6?0:d;
const selectedLabel=()=>mode==='class'?`${entity} класс`:mode==='teacher'?entity:`Кабинет ${entity}`;
let initialSubject=params.get('subject')||'';
const schoolDay=()=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Moscow',weekday:'short'}).format(new Date()));
let mode=['class','teacher','room'].includes(params.get('mode'))?params.get('mode'):'class';
let entity=params.get('entity')||storage.get('myClass')||'5А',day=params.has('day')&&/^[0-5]$/.test(params.get('day'))?+params.get('day'):displayDay((schoolDay()+6)%7),view=(params.get('view')||storage.get('view'))==='week'?'week':'day',data=null,refreshing=false;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plural=(n,one,few,many)=>n%10===1&&n%100!==11?one:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?few:many;
const countText=n=>`${n} ${plural(n,'занятие','занятия','занятий')}`;
document.documentElement.dataset.theme=storage.get('theme')||'light';
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2800)}
function options(select,items,value,empty){select.innerHTML=(empty?`<option value="">${empty}</option>`:'')+items.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');select.value=items.includes(value)?value:(empty?'':items[0]||'')}
function populate(){
 const old=entity, vals=mode==='class'?data.classes:[...new Set(data.lessons.flatMap(mode==='teacher'?S.teachers:S.rooms))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
 options($('entity'),vals,old);entity=$('entity').value;
 $('entityLabel').textContent={class:'Выберите класс',teacher:'Выберите учителя',room:'Выберите кабинет'}[mode];
 $('remember').hidden=mode!=='class';
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',b.dataset.mode===mode)});
 const subjects=[...new Set(data.lessons.filter(l=>S.matches(l,{mode,entity:$('searchAll').checked?'':entity})).map(l=>l.subject))].sort((a,b)=>a.localeCompare(b,'ru'));
 options($('subject'),subjects,$('subject').value||initialSubject,'Все предметы');
 initialSubject='';render();
}
function render(){
 if(!data)return;
 const criteria={mode,entity:$('searchAll').checked?'':entity,search:$('search').value,subject:$('subject').value};
 const all=data.lessons.filter(l=>matchesLesson(l,criteria)&&T.atTime(l,$('atTime').value));
 $('title').textContent=$('searchAll').checked?'Вся первая смена':selectedLabel();
 $('remember').textContent=storage.get('myClass')===entity?'★ Мой класс':'☆ Сделать моим классом';
 $('clear').hidden=!criteria.search;
 $('days').innerHTML=S.DAYS.slice(0,6).map((d,i)=>`<button data-day="${i}" class="${day===i&&view==='day'?'active':''}" aria-pressed="${day===i&&view==='day'}"><span>${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</span><small>${all.filter(l=>l.day===i).length}</small></button>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view)});
 const days=view==='week'?[0,1,2,3,4,5]:[day];
 $('summary').textContent=`${view==='week'?'Вся неделя':S.DAYS[day]} · ${countText(view==='week'?all.length:all.filter(l=>l.day===day).length)}${criteria.search||criteria.subject||$('atTime').value||Q.active(advanced)?` по вашему запросу${$('atTime').value?' · '+$('atTime').value+' МСК':''}`:''}`;
 $('schedule').dataset.printTitle=$('title').textContent+' · '+(view==='week'?'Вся неделя':S.DAYS[day]);
 const card=l=>`<article class="lesson" data-lesson-day="${l.day}" data-lesson-number="${l.number}" style="--accent:${color(l.subject)}"><div class="lesson-number">${l.number}<small>УРОК</small></div><div class="lesson-content"><div class="lesson-time">${T.slot(l.number)?.label||'Время не указано'} <span class="current-label">Сейчас идёт</span></div><div class="lesson-tags">${mode!=='class'||$('searchAll').checked?`<button data-class="${esc(l.class)}">${esc(l.class)} класс</button>`:''}${l.teacher.includes('/')||(/\//.test(l.subject))?'<span>По подгруппам</span>':''}</div><h3>${esc(l.subject)}</h3><div class="teachers">${S.teachers(l).map(t=>`<button data-teacher="${esc(t)}">${esc(t)}</button>`).join('<span> / </span>')||'<span>Учитель не указан</span>'}</div>${typeof lessonNote==='function'?lessonNote(l):''}</div><div class="room">${S.rooms(l).map(r=>`<button data-room="${esc(r)}">${r==='Спортзал'?'Спортзал':esc(r)}<small>${r==='Спортзал'?'физкультура':'кабинет'}</small></button>`).join('')||'<span class="unknown">—<small>не указан</small></span>'}</div></article>`;
 $('schedule').className=view==='week'?'week':'';
 $('schedule').innerHTML=days.map(d=>{const ls=all.filter(l=>l.day===d).sort((a,b)=>a.number-b.number||a.class.localeCompare(b.class,'ru',{numeric:true}));return `<section class="day-group">${view==='week'?`<h3 class="day-heading">${S.DAYS[d]} <span>${ls.length}</span></h3>`:''}${ls.length?ls.map(card).join(''):`<div class="empty"><div>☀</div><h3>${criteria.search||criteria.subject||$('atTime').value||Q.active(advanced)?'Ничего не нашлось':'Уроков в таблице нет'}</h3><p>${criteria.search||criteria.subject||$('atTime').value||Q.active(advanced)?'Попробуйте другой запрос или сбросьте фильтры.':'Для выбранного дня и расписания занятия не указаны.'}</p></div>`}</section>`}).join('');
 const u=new URL(location.href);const state={mode,entity,day,view,q:$('search').value,subject:$('subject').value,time:$('atTime').value,all:$('searchAll').checked?'1':'',...Q.params(advanced)};for(const [k,v] of Object.entries(state)){if(v!==''&&v!==false)u.searchParams.set(k,v);else u.searchParams.delete(k)}history.replaceState(null,'',u);storage.set('view',view);
 renderStats();tick();if(typeof renderExtras==='function')renderExtras(all);if(typeof renderSearchTools==='function')renderSearchTools();if(typeof renderDaily==='function')renderDaily();if(typeof renderSchool==='function')renderSchool();if(typeof renderUseful==='function')renderUseful();
}
function renderStats(){
 if(!data)return;
 const scope=$('statsScope').value,period=$('statsPeriod').value,dimension=$('statsDimension').value;
 const ls=data.lessons.filter(l=>matchesLesson(l,{mode,entity:scope==='selected'&&!$('searchAll').checked?entity:'',search:$('search').value,subject:$('subject').value})&&T.atTime(l,$('atTime').value)&&(period==='week'||l.day===day));
 const rows=T.stats(ls,dimension,S),known=ls.filter(l=>T.slot(l.number)),minutes=known.reduce((sum,l)=>{const s=T.slot(l.number);return sum+s.end-s.start},0);
 $('statsContext').textContent=`${scope==='selected'?$('title').textContent:'Вся первая смена'} · ${period==='week'?'недельный шаблон':S.DAYS[day]}${$('search').value||$('subject').value||$('atTime').value||Q.active(advanced)?' · с учётом фильтров':''}`;
 const metrics=[[ls.length,['занятие','занятия','занятий']],[new Set(ls.map(l=>l.class)).size,['класс','класса','классов']],[new Set(ls.flatMap(S.teachers)).size,['учитель','учителя','учителей']],[new Set(ls.flatMap(S.rooms)).size,['кабинет','кабинета','кабинетов']],[minutes,['учебная минута','учебные минуты','учебных минут']],[new Set(ls.map(l=>l.subject.replace(/\s*\/\s*/g,'/'))).size,['предмет','предмета','предметов']]];
 $('statsMetrics').innerHTML=metrics.map(([v,t])=>`<div><strong>${v.toLocaleString('ru-RU')}</strong><span>${Array.isArray(t)?plural(v,...t):t}</span></div>`).join('');
 $('statsGroupHeading').textContent={subject:'Предмет',teacher:'Учитель',room:'Кабинет',time:'Время',class:'Класс'}[dimension];
 if(typeof renderLoadChart==='function')renderLoadChart(ls);
 $('statsRows').innerHTML=rows.length?rows.map(g=>`<tr><th scope="row">${esc(g.name)}</th><td>${g.count}</td><td>${g.minutes}${g.unknown?` <small>+ ${g.unknown} без времени</small>`:''}</td><td>${g.days}</td><td>${g.classes}</td></tr>`).join(''):'<tr><td colspan="5">Нет занятий по выбранным условиям.</td></tr>';
}
function tick(){
 const c=T.clock();$('liveClock').textContent=new Date().toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' МСК';
 if(!data)return;
 const ls=data.lessons.filter(l=>S.matches(l,{mode,entity})),state=T.live(ls);
 const names=items=>items.map(l=>`${l.subject}${mode==='class'?'':` · ${l.class}`}${l.room?` · каб. ${l.room}`:''}`).join('; ');
 const label=esc(selectedLabel());
 if(state.current.length){$('liveState').innerHTML=`<small>${label} · ${state.current[0].number} урок сейчас</small><strong>${esc(names(state.current))}</strong><span>${state.current[0].number===8?'До конца занятий':'До перемены'} <b>${T.duration(state.remaining)}</b></span>`;}
 else{$('liveState').innerHTML=`<small>${label}</small><strong>${state.off|| (c.day===6?'Выходной':state.next?.date===c.date?(c.seconds<8*3600?'До начала занятий':'Сейчас урока нет'):'На сегодня уроков со временем нет')}</strong><span>${state.unknown.length?'Есть занятия без указанного времени — проверьте расписание.':'Обратный отсчёт учитывает выбранный класс, учителя или кабинет.'}</span>`;}
 $('liveNext').innerHTML=state.next?`<small>Следующий урок · ${new Date(state.next.date+'T12:00:00Z').toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short'})} · ${T.slot(state.next.lessons[0].number).label}</small><strong>${esc(names(state.next.lessons))}</strong><span>До урока <b>${T.duration(state.next.seconds)}</b></span>`:'<small>Следующий урок</small><strong>Не найден в календаре 2026–2027</strong>';
 document.querySelectorAll('[data-lesson-day]').forEach(el=>{const s=T.slot(+el.dataset.lessonNumber);el.classList.toggle('is-current',!state.off&&+el.dataset.lessonDay===c.day&&!!s&&c.seconds>=s.start*60&&c.seconds<s.end*60)});
}
function color(s){if(/математ|геометр|физик/i.test(s))return '#d5a744';if(/русск|литерат/i.test(s))return '#8089bf';if(/физическ.*культур/i.test(s))return '#64a88a';if(/англий/i.test(s))return '#d68d76';return '#8eaeaf'}
function accept(payload,date,kind){const next=S.parse(payload),changed=!data||JSON.stringify(next)!==JSON.stringify(data);if(data&&changed&&kind==='Из таблицы'){const changes=U.diff(data.lessons,next.lessons);if(changes.length){lastScheduleChange={date,from:scheduleDataDate,changes};storage.set('scheduleChanges',JSON.stringify(lastScheduleChange))}}scheduleDataDate=date;data=next;if(changed)populate();$('status').textContent=`${kind} · ${new Date(date).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} МСК`;$('status').classList.toggle('warning',kind!=='Из таблицы');if(typeof renderUseful==='function')renderUseful();}
function loadLive(){return new Promise((resolve,reject)=>{
 if(!navigator.onLine){reject(new Error('Нет соединения'));return}
 const cb='scheduleCallback'+Date.now(),script=document.createElement('script');let timer;
 const cleanup=()=>{clearTimeout(timer);script.remove();delete window[cb]};
 window[cb]=payload=>{cleanup();resolve(payload)};script.onerror=()=>{cleanup();reject(new Error('Сеть недоступна'))};
 timer=setTimeout(()=>{cleanup();reject(new Error('Таблица не ответила'))},15000);
 script.src=SOURCE+`&tqx=out:json;responseHandler:${cb}&_=${Date.now()}`;document.head.append(script);
})}
async function refresh(){if(refreshing)return;refreshing=true;$('refresh').disabled=true;$('refresh').textContent='↻ Загрузка…';
 try{const payload=await loadLive();const date=new Date().toISOString();accept(payload,date,'Из таблицы');storage.set('scheduleCache',JSON.stringify({payload,date}));}
 catch(e){if(!data){try{const res=await fetch('snapshot.json');if(!res.ok)throw Error();const x=await res.json();accept(x.payload,x.date,'Сохранённая копия — обновление недоступно')}catch{$('schedule').innerHTML='<div class="empty"><h3>Не удалось загрузить расписание</h3><p>Проверьте интернет и нажмите «Обновить» или откройте исходную таблицу.</p></div>';$('status').textContent='Ошибка загрузки'}}else{$('status').textContent=$('status').textContent.replace(/^Из таблицы/,'Копия — обновление недоступно');$('status').classList.add('warning')}}
 finally{refreshing=false;$('refresh').disabled=false;$('refresh').textContent='↻ Обновить'}
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{clearFilters();mode=b.dataset.mode;entity=mode==='class'?(storage.get('myClass')||'5А'):'';$('search').value='';$('subject').value='';if(data)populate()});
$('entity').onchange=()=>{$('searchAll').checked=false;entity=$('entity').value;clearFilters();populate()};
$('search').oninput=render;$('subject').onchange=render;
$('clear').onclick=()=>{$('search').value='';render();$('search').focus()};
$('reset').onclick=()=>{clearFilters();if(data)populate()};
$('atTime').oninput=render;
$('nowTime').onclick=()=>{$('atTime').value=T.clock().time;day=displayDay(T.clock().day);view='day';render()};
$('clearTime').onclick=()=>{$('atTime').value='';render()};
['statsScope','statsPeriod','statsDimension'].forEach(id=>$(id).onchange=renderStats);
$('bellTable').innerHTML='<table><thead><tr><th>Урок</th><th>Начало</th><th>Конец</th><th>Перемена после</th></tr></thead><tbody>'+T.BELLS.map(([a,b],i)=>`<tr><td>${i+1}</td><td>${a}</td><td>${b}</td><td>${T.BELLS[i+1]?T.minute(T.BELLS[i+1][0])-T.minute(b)+' мин':'—'}</td></tr>`).join('')+'</tbody></table>';
setInterval(tick,1000);tick();
$('days').onclick=e=>{const b=e.target.closest('[data-day]');if(b){day=+b.dataset.day;view='day';render()}};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
$('today').onclick=()=>{day=displayDay((schoolDay()+6)%7);view='day';render()};
$('remember').onclick=()=>{storage.set('myClass',entity);render();toast(`${entity} — ваш класс на этом устройстве`)};
$('schedule').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.class){mode='class';entity=b.dataset.class}else if(b.dataset.teacher){mode='teacher';entity=b.dataset.teacher}else if(b.dataset.room){mode='room';entity=b.dataset.room}else return;clearFilters();populate()};
$('refresh').onclick=refresh;$('print').onclick=()=>window.print();
$('theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;storage.set('theme',theme)};
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Ссылка на расписание скопирована')}catch{toast('Скопируйте ссылку из адресной строки')}};
$('search').value=params.get('q')||'';$('atTime').value=T.minute(params.get('time'))!==null?params.get('time'):'';$('searchAll').checked=params.get('all')==='1';
try{const x=JSON.parse(storage.get('scheduleCache'));if(x)accept(x.payload,x.date,'Сохранённая копия')}catch{}
refresh();setInterval(refresh,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
