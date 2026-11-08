/* Hamster Tower's service worker. It does one thing: show the alerts the server sends (the Arena opening, the quest reminder) and open
   the game when one is tapped. It keeps no pages and touches no request, so the game always loads from the network */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
/* only a page of this site is ever opened from an alert */
const local = path => {
  try { const u = new URL(path || '/', self.location.origin); return u.origin === self.location.origin ? u.href : self.location.origin + '/'; } catch (e) { return self.location.origin + '/'; }
};
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(String(m.title || 'Hamster Tower'), {
    body: String(m.body || ''), icon: '/brand/icon-192.png', badge: '/brand/icon-180.png', tag: String(m.tag || 'alert'), data: { url: local(m.url) },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = local(e.notification.data && e.notification.data.url);
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const game = open.find(c => new URL(c.url).origin === self.location.origin);
    return game ? game.focus() : self.clients.openWindow(url);
  })());
});
/* the browser renewed its address by itself: the server hears about the new one, and forgets the old */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    const old = e.oldSubscription;
    const sub = e.newSubscription || (old && old.options ? await self.registration.pushManager.subscribe(old.options) : null);
    const post = (path, body) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (sub) await post('/api/push/subscribe', sub.toJSON());
    if (old && (!sub || old.endpoint !== sub.endpoint)) await post('/api/push/unsubscribe', { endpoint: old.endpoint });
  })().catch(() => {}));
});
