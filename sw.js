const C="astra6-v7";
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./style.css?v=5","./app.js?v=5","./manifest.json"])).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;if(new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))})