'use strict';
const S=window.Schedule,$=id=>document.getElementById(id);
const SHEET='1tGzeVcjc4gKja-uegpOFkvOW61I50SP3zPipSCfTxqY';
const SOURCE=`https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?gid=82782917&headers=0`;
const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const params=new URLSearchParams(location.search);
const schoolDay=()=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Moscow',weekday:'short'}).format(new Date()));
let mode=['class','teacher','room'].includes(params.get('mode'))?params.get('mode'):'class';
let entity=params.get('entity')||storage.get('myClass')||'5А',day=Math.max(0,schoolDay()-1),view='day',data=null,refreshing=false;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countText=n=>`${n} ${n%10===1&&n%100!==11?'занятие':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'занятия':'занятий'}`;
document.documentElement.dataset.theme=storage.get('theme')||'light';
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2800)}
function options(select,items,value,empty){select.innerHTML=(empty?`<option value="">${empty}</option>`:'')+items.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');select.value=items.includes(value)?value:(empty?'':items[0]||'')}
function populate(){
 const old=entity, vals=mode==='class'?data.classes:[...new Set(data.lessons.flatMap(mode==='teacher'?S.teachers:S.rooms))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
 options($('entity'),vals,old);entity=$('entity').value;
 $('entityLabel').textContent={class:'Выберите класс',teacher:'Выберите учителя',room:'Выберите кабинет'}[mode];
 $('remember').hidden=mode!=='class';
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',b.dataset.mode===mode)});
 const subjects=[...new Set(data.lessons.filter(l=>S.matches(l,{mode,entity})).map(l=>l.subject))].sort((a,b)=>a.localeCompare(b,'ru'));
 options($('subject'),subjects,$('subject').value,'Все предметы');
 render();
}
function render(){
 if(!data)return;
 const criteria={mode,entity,search:$('search').value,subject:$('subject').value};
 const all=data.lessons.filter(l=>S.matches(l,criteria));
 $('title').textContent=mode==='class'?`${entity} класс`:mode==='teacher'?entity:`Кабинет ${entity}`;
 $('remember').textContent=storage.get('myClass')===entity?'★ Мой класс':'☆ Сделать моим классом';
 $('clear').hidden=!criteria.search;
 $('days').innerHTML=S.DAYS.map((d,i)=>`<button data-day="${i}" class="${day===i&&view==='day'?'active':''}" aria-pressed="${day===i&&view==='day'}"><span>${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</span><small>${all.filter(l=>l.day===i).length}</small></button>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view)});
 const days=view==='week'?[0,1,2,3,4,5,6]:[day];
 $('summary').textContent=`${view==='week'?'Вся неделя':S.DAYS[day]} · ${countText(view==='week'?all.length:all.filter(l=>l.day===day).length)}${criteria.search||criteria.subject?' по вашему запросу':''}`;
 $('schedule').dataset.printTitle=$('title').textContent+' · '+(view==='week'?'Вся неделя':S.DAYS[day]);
 const card=l=>`<article class="lesson" style="--accent:${color(l.subject)}"><div class="lesson-number">${l.number}<small>УРОК</small></div><div class="lesson-content"><div class="lesson-tags">${mode!=='class'?`<button data-class="${esc(l.class)}">${esc(l.class)} класс</button>`:''}${l.teacher.includes('/')||(/\//.test(l.subject))?'<span>По подгруппам</span>':''}</div><h3>${esc(l.subject)}</h3><div class="teachers">${S.teachers(l).map(t=>`<button data-teacher="${esc(t)}">${esc(t)}</button>`).join('<span> / </span>')||'<span>Учитель не указан</span>'}</div></div><div class="room">${S.rooms(l).map(r=>`<button data-room="${esc(r)}">${r==='Спортзал'?'Спортзал':esc(r)}<small>${r==='Спортзал'?'физкультура':'кабинет'}</small></button>`).join('')||'<span class="unknown">—<small>не указан</small></span>'}</div></article>`;
 $('schedule').className=view==='week'?'week':'';
 $('schedule').innerHTML=days.map(d=>{const ls=all.filter(l=>l.day===d).sort((a,b)=>a.number-b.number||a.class.localeCompare(b.class,'ru',{numeric:true}));return `<section class="day-group">${view==='week'?`<h3 class="day-heading">${S.DAYS[d]} <span>${ls.length}</span></h3>`:''}${ls.length?ls.map(card).join(''):`<div class="empty"><div>☀</div><h3>${criteria.search||criteria.subject?'Ничего не нашлось':'Уроков в таблице нет'}</h3><p>${criteria.search||criteria.subject?'Попробуйте другой запрос или сбросьте фильтры.':'Для выбранного дня и расписания занятия не указаны.'}</p></div>`}</section>`}).join('');
 const u=new URL(location.href);u.searchParams.set('mode',mode);u.searchParams.set('entity',entity);history.replaceState(null,'',u);
}
function color(s){if(/математ|геометр|физик/i.test(s))return '#d5a744';if(/русск|литерат/i.test(s))return '#8089bf';if(/физическ.*культур/i.test(s))return '#64a88a';if(/англий/i.test(s))return '#d68d76';return '#8eaeaf'}
function accept(payload,date,kind){data=S.parse(payload);populate();$('status').textContent=`${kind} · ${new Date(date).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} МСК`;$('status').classList.toggle('warning',kind!=='Из таблицы');}
function loadLive(){return new Promise((resolve,reject)=>{
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
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;entity=mode==='class'?(storage.get('myClass')||'5А'):'';$('search').value='';$('subject').value='';if(data)populate()});
$('entity').onchange=()=>{entity=$('entity').value;$('subject').value='';populate()};
$('search').oninput=render;$('subject').onchange=render;
$('clear').onclick=()=>{$('search').value='';render();$('search').focus()};
$('reset').onclick=()=>{$('search').value='';$('subject').value='';render()};
$('days').onclick=e=>{const b=e.target.closest('[data-day]');if(b){day=+b.dataset.day;view='day';render()}};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
$('today').onclick=()=>{day=(schoolDay()+6)%7;view='day';render()};
$('remember').onclick=()=>{storage.set('myClass',entity);render();toast(`${entity} — ваш класс на этом устройстве`)};
$('schedule').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.class){mode='class';entity=b.dataset.class}else if(b.dataset.teacher){mode='teacher';entity=b.dataset.teacher}else if(b.dataset.room){mode='room';entity=b.dataset.room}else return;$('search').value='';$('subject').value='';populate()};
$('refresh').onclick=refresh;$('print').onclick=()=>window.print();
$('theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;storage.set('theme',theme)};
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Ссылка на расписание скопирована')}catch{toast('Скопируйте ссылку из адресной строки')}};
try{const x=JSON.parse(storage.get('scheduleCache'));if(x)accept(x.payload,x.date,'Сохранённая копия')}catch{}
refresh();setInterval(refresh,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
