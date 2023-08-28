self.addEventListener('install', ev => {
    self.skipWaiting();
    ev.waitUntil(caches.open('cache').then(cache => cache.addAll(List.essential)));
});
self.addEventListener('activate', ev => ev.waitUntil(clients.claim()));
//self.addEventListener('fetch', ev => ev.respondWith(
//    (async () => {
//
//        return Promise.resolve(self.cached ?? Head.fetch().then(html => self.cached = parseInt(html.match(/content=(\d+)/)?.[1] ?? 0)))
//        .then(() => new Date / 1000 > self.cached + 60*60*24*14 && updateFiles()) //14 days
//        .then(() => caches.match(url, {ignoreSearch: true}))
//        .then(cached => cached || goFetch(url))
//        .then(Head.add).catch(er => console.error(er));
//    })()
//));
const goFetch = url =>
    fetch(new Request(url, {mode: 'no-cors'})).then(async resp => {
        if (resp.status == 200 && is.internal(url) && is.cacheable(url))
            (await caches.open(is.parts(url) ? 'parts' : 'V6')).add(url.replace(/[?#].*$/, ''), resp.clone());
        return resp;
    });
    
const List = {
    sets: ["fury","endure","tolerance","will","focus","doom","fight","guard","enhance","shield","expert","javelin","resist","roar","grow","sage","limit","hunt","awaken","arena","affinity","recovery","resurrect","rage","overcome","punish","protect"]
}
Object.assign(List, {
    essential: [
        ...List.sets.map(s => `/rune/set/${s}.webp`),
        ...[0,3,4,5,6].map(s => `/rune/shape/${s}.webp`),
        '/rune/property.jpg', '/rune/simulator/darkstone.webp'
    ],
});