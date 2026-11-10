'use strict';
const CACHE='lyceum48-shell-v7';
const SHELL=['./','index.html','style.css?v=1.7.0','app.js?v=1.7.0','parser.js?v=1.7.0','timing.js?v=1.7.0','extras.js?v=1.7.0','planner-core.js?v=1.7.0','planner.js?v=1.7.0','search-core.js?v=1.7.0','search-tools.js?v=1.7.0','daily-core.js?v=1.7.0','daily.js?v=1.7.0','school-core.js?v=1.7.0','school.js?v=1.7.0','snapshot.json','manifest.webmanifest','assets/logo.png','assets/lyceum.webp','assets/icon192.png','assets/icon512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lyceum48-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request,{cache:'no-cache'});if(response.ok)await cache.put(event.request.mode==='navigate'?'index.html':event.request,response.clone());return response}catch{const cached=await cache.match(event.request,{ignoreSearch:true});if(cached)return cached;if(event.request.mode==='navigate')return cache.match('index.html');return Response.error()}})());
});
