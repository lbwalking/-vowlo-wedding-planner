const CACHE='vowlo-v4.0.0-rc.1';
const ASSETS=['./','./index.html','./styles.css?v=4.0.0-rc.1','./app.js?v=4.0.0-rc.1','./model.js?v=4.0.0-rc.1','./cloud.js?v=4.0.0-rc.1','./config.js?v=4.0.0-rc.1','./v4-ui.js?v=4.0.0-rc.1','./vendor/supabase-2.117.2.js','./manifest.json','./icon-192.png','./icon-512.png'];
const allowed=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();if(event.data?.type==='PRIVACY_CHECK')event.ports[0]?.postMessage({privateNetworkBypass:true});});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('vowlo-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||request.headers.has('Authorization'))return;
 // Never intercept Supabase, cache account data, or use HTML as a failed script response.
 if(request.mode==='navigate'){
  event.respondWith(caches.open(CACHE).then(cache=>cache.match('./index.html')));return;
 }
 if(!allowed.has(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
});
