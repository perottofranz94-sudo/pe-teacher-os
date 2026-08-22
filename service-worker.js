const C='attivamente-v6-owner-2026-08-22-r2';
const A=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './primary_games.json',
  './assets/attivamente-brand.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(A)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;

  const u=new URL(e.request.url);
  const p=u.pathname;

  const alwaysFresh =
    e.request.mode==='navigate' ||
    p.endsWith('/index.html') ||
    p.endsWith('/app.js') ||
    p.endsWith('/styles.css') ||
    p.endsWith('/config.js') ||
    p.endsWith('/manifest.webmanifest') ||
    p.endsWith('/primary_games.json');

  if(alwaysFresh){
    e.respondWith(
      fetch(new Request(e.request,{cache:'no-store'}))
        .then(r=>{
          if(r && r.ok){
            const copy=r.clone();
            caches.open(C).then(c=>c.put(new Request(u.origin+p),copy)).catch(()=>{});
          }
          return r;
        })
        .catch(async ()=>{
          return (await caches.match(new Request(u.origin+p))) ||
                 (await caches.match(e.request)) ||
                 (e.request.mode==='navigate' ? caches.match('./index.html') : undefined);
        })
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(r=>{
        if(r && r.ok){
          const copy=r.clone();
          caches.open(C).then(c=>c.put(e.request,copy)).catch(()=>{});
        }
        return r;
      })
      .catch(()=>caches.match(e.request))
  );
});
