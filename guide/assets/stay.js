/* Riad Kasbah La Moun, « Mon séjour » : les demandes du client et leur statut, lues sur le serveur (/order?stay=<jeton>).
   Le jeton vient du check-in en ligne (localStorage). Rafraîchi toutes les 60 secondes. */
(function () {
  "use strict";
  var esc = RT.esc;
  var T = {
    fr: { title: "Riad Kasbah La Moun | Mon séjour", header: "Mon séjour", eyebrow: "Vos demandes", h1: "Mon séjour", intro: "Transfert, spa, dîner, conciergerie : suivez ici la confirmation de chaque demande.",
      noToken: "Faites d'abord votre check-in en ligne : vos demandes apparaîtront ensuite ici.", checkin: "Faire mon check-in", empty: "Aucune demande pour l'instant.", add: "Réserver", loading: "Chargement…", error: "Impossible de charger vos demandes. Vérifiez votre connexion.",
      stay: "Séjour du {a} au {d}", suite: "Suite", total: "Total", refresh: "Actualiser", kinds: { transfer: "Transfert", spa: "Spa", dinner: "Dîner", concierge: "Conciergerie" },
      status: { pending: "En attente de confirmation", confirmed: "Confirmé", declined: "Non disponible", cancelled: "Annulé", done: "Terminé" } },
    en: { title: "Riad Kasbah La Moun | My stay", header: "My stay", eyebrow: "Your requests", h1: "My stay", intro: "Transfer, spa, dinner, concierge: follow the confirmation of each request here.",
      noToken: "Complete your online check-in first: your requests will then appear here.", checkin: "Do my check-in", empty: "No request yet.", add: "Book", loading: "Loading…", error: "Could not load your requests. Check your connection.",
      stay: "Stay from {a} to {d}", suite: "Suite", total: "Total", refresh: "Refresh", kinds: { transfer: "Transfer", spa: "Spa", dinner: "Dinner", concierge: "Concierge" },
      status: { pending: "Awaiting confirmation", confirmed: "Confirmed", declined: "Not available", cancelled: "Cancelled", done: "Done" } },
    es: { title: "Riad Kasbah La Moun | Mi estancia", header: "Mi estancia", eyebrow: "Tus solicitudes", h1: "Mi estancia", intro: "Traslado, spa, cena, conserjería: sigue aquí la confirmación de cada solicitud.",
      noToken: "Haz primero tu check-in online: tus solicitudes aparecerán aquí.", checkin: "Hacer mi check-in", empty: "Ninguna solicitud por ahora.", add: "Reservar", loading: "Cargando…", error: "No se pudieron cargar tus solicitudes. Revisa tu conexión.",
      stay: "Estancia del {a} al {d}", suite: "Suite", total: "Total", refresh: "Actualizar", kinds: { transfer: "Traslado", spa: "Spa", dinner: "Cena", concierge: "Conserjería" },
      status: { pending: "Pendiente de confirmación", confirmed: "Confirmado", declined: "No disponible", cancelled: "Cancelado", done: "Realizado" } },
    de: { title: "Riad Kasbah La Moun | Mein Aufenthalt", header: "Mein Aufenthalt", eyebrow: "Ihre Anfragen", h1: "Mein Aufenthalt", intro: "Transfer, Spa, Abendessen, Concierge: verfolgen Sie hier die Bestätigung jeder Anfrage.",
      noToken: "Machen Sie zuerst Ihren Online-Check-in: Ihre Anfragen erscheinen dann hier.", checkin: "Check-in starten", empty: "Noch keine Anfrage.", add: "Buchen", loading: "Laden…", error: "Ihre Anfragen konnten nicht geladen werden. Prüfen Sie Ihre Verbindung.",
      stay: "Aufenthalt vom {a} bis {d}", suite: "Suite", total: "Gesamt", refresh: "Aktualisieren", kinds: { transfer: "Transfer", spa: "Spa", dinner: "Abendessen", concierge: "Concierge" },
      status: { pending: "Wartet auf Bestätigung", confirmed: "Bestätigt", declined: "Nicht verfügbar", cancelled: "Storniert", done: "Erledigt" } },
    ar: { title: "رياض قصبة لا مون | إقامتي", header: "إقامتي", eyebrow: "طلباتكم", h1: "إقامتي", intro: "النقل، السبا، العشاء، الكونسيرج: تابعوا هنا تأكيد كل طلب.",
      noToken: "أكملوا تسجيل الوصول أولاً: ستظهر طلباتكم هنا بعد ذلك.", checkin: "سجّل وصولي", empty: "لا طلبات حتى الآن.", add: "احجز", loading: "جارٍ التحميل…", error: "تعذّر تحميل طلباتكم. تحقّقوا من الاتصال.",
      stay: "إقامة من {a} إلى {d}", suite: "الجناح", total: "المجموع", refresh: "تحديث", kinds: { transfer: "النقل", spa: "السبا", dinner: "العشاء", concierge: "الكونسيرج" },
      status: { pending: "في انتظار التأكيد", confirmed: "مؤكد", declined: "غير متاح", cancelled: "ملغى", done: "منجز" } }
  };
  var LOCALE = { fr: "fr-FR", en: "en-GB", es: "es-ES", de: "de-DE", ar: "ar-MA" };
  var data = { status: "loading", stay: null, orders: [] };

  function fmtWhen(iso, lang) {
    try { return new Intl.DateTimeFormat(LOCALE[lang] || "fr-FR", { timeZone: "Africa/Casablanca", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); }
    catch (e) { return iso; }
  }
  function money(v, lang) { return (v || 0).toLocaleString("fr-FR").replace(/ /g, " ") + " " + RT.UI[lang].mad; }

  function render(lang) {
    var t = T[lang], h = "";
    h += RT.subHeader(lang, t.header);
    h += RT.pageHero(t.eyebrow, t.h1, t.intro);
    h += '<section class="sheet">';
    if (!RT.stayToken() || !RT.API.base) {
      h += '<div class="callout">' + RT.icon("key") + "<div><p>" + esc(t.noToken) + '</p></div><a class="button button-solid" href="/checkin/">' + esc(t.checkin) + ' <span aria-hidden="true">→</span></a></div>';
    } else if (data.status === "loading") h += '<p class="note">' + esc(t.loading) + "</p>";
    else if (data.status === "error") h += '<p class="note">' + esc(t.error) + "</p>";
    else {
      if (data.stay) h += '<p class="stay-line">' + esc(t.stay.replace("{a}", RT.frDate(data.stay.arrival)).replace("{d}", RT.frDate(data.stay.departure))) + (data.stay.suite ? " · " + esc(t.suite) + " " + esc(data.stay.suite) : "") + "</p>";
      if (!data.orders.length) h += '<p class="note">' + esc(t.empty) + "</p>";
      h += '<div class="stay-list">' + data.orders.map(function (o) {
        return '<article class="stay-card"><div class="stay-head"><strong>' + esc(t.kinds[o.kind] || o.kind) + '</strong><span class="status ' + esc(o.status) + '">' + esc(t.status[o.status] || o.status) + "</span></div>" +
          (o.when || []).map(function (w) { return '<p class="stay-when">' + RT.icon("calendar") + "<span>" + esc(w.title) + " · " + esc(fmtWhen(w.start, lang)) + "</span></p>"; }).join("") +
          (o.items && o.items.length ? "<ul>" + o.items.map(function (i) { return "<li>" + i.qty + " x " + esc(i.label) + (i.price ? " · " + money(i.price * i.qty, lang) : "") + "</li>"; }).join("") + "</ul>" : "") +
          (o.totalMad ? "<p><b>" + esc(t.total) + " : " + money(o.totalMad, lang) + "</b></p>" : "") +
          '<small class="stay-ref">' + esc(RT.UI[lang].ref) + " " + esc(o.id) + "</small></article>";
      }).join("") + "</div>";
      h += '<div class="button-stack"><a class="button button-solid" href="/reserver/">' + esc(t.add) + '</a><button type="button" class="button button-line" data-refresh>' + esc(t.refresh) + "</button></div>";
    }
    h += "</section>";
    h += '<div class="bottom-action"><div class="button-stack">' + RT.contactButtons(lang) + "</div></div>";
    return h;
  }

  var root = document.getElementById("app");
  function redraw() { var lang = RT.getLang(); root.innerHTML = render(lang) + RT.tabBar(lang); }
  function load() {
    if (!RT.stayToken() || !RT.API.base) return;
    data.status = data.orders.length ? data.status : "loading";
    RT.api("/order?stay=" + encodeURIComponent(RT.stayToken())).then(function (r) { data = { status: "ready", stay: r.stay, orders: r.orders || [] }; redraw(); },
      function (err) { if (err.code === "http_404") { var g = RT.getGuest() || {}; delete g.stayToken; RT.saveGuest(g); } data.status = "error"; redraw(); });
  }
  root.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-refresh]")) load(); });
  RT.mount({ render: render, title: function (l) { return T[l].title; } });
  load();
  window.setInterval(load, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) load(); });
})();
