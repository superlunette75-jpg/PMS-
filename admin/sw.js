/* Service worker minimal : rend l'appli installable (Android), sans aucun cache (les données restent toujours à jour). */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function () { /* réseau seulement */ });
