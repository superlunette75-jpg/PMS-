/* Service worker de l'appli équipe : la rend installable et reçoit les notifications push.
   Aucun cache : les données restent toujours à jour. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function () { /* réseau seulement */ });

self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: "La Moun", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "La Moun", {
    body: d.body || "", icon: "icon-192.png", badge: "badge-72.png", tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || "" }, lang: "fr"
  }));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = new URL(self.registration.scope).href + (e.notification.data && e.notification.data.url ? e.notification.data.url : "");
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(self.registration.scope) === 0 && "focus" in list[i]) { list[i].navigate(target).catch(function () {}); return list[i].focus(); }
    }
    return self.clients.openWindow(target);
  }));
});
