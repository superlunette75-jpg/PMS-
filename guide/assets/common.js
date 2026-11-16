/* Riad Kasbah La Moun, guide d'arrivée : fonctions communes à toutes les pages.
   Chaque page fournit render(lang) qui renvoie le HTML de <main>. */
(function () {
  "use strict";

  var LANGS = { fr: "Français", en: "English", es: "Español", de: "Deutsch", ar: "العربية" };
  var STORAGE_KEY = "kasbah-la-moun-language";

  /* Coordonnées. Modifier ici pour toutes les pages.
     whatsapp : reçoit les réservations des formulaires. */
  var CONTACT = {
    whatsapp: "+212669159387", whatsappLabel: "+212 669 159 387",
    phones: [["Nicolas", "+212669159387", "+212 669 159 387"], ["Mouna", "+212661357335", "+212 661 357 335"]],
    email: "contact@kasbahlamoun.com",
    instagram: "kasbahlamoun",
    site: "https://www.kasbahlamoun.com"
  };

  /* Serveur (Supabase). base : URL des fonctions, ex. "https://xxxx.supabase.co/functions/v1".
     Tant qu'elle est vide, les formulaires passent par WhatsApp seul (mode démo, rien n'est enregistré).
     alsoWhatsApp : après l'enregistrement, proposer au client d'envoyer aussi sa demande sur WhatsApp. */
  var API = { base: "https://xysskjvpotmpekmtgzhp.supabase.co/functions/v1", alsoWhatsApp: true };
  /* Dîner à la Kasbah : prix par personne en MAD. Modifier ici pour toutes les pages. */
  var DINNER_MAD = 495;
  function api(path, body, method) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    var opts = { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json" }, signal: ctrl ? ctrl.signal : undefined };
    if (body) opts.body = JSON.stringify(body);
    return fetch(API.base.replace(/\/$/, "") + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        window.clearTimeout(timer);
        if (!r.ok || j.ok === false) { var e = new Error(j.message || "api"); e.code = j.code || "http_" + r.status; e.data = j; throw e; }
        return j;
      });
    }, function (err) { window.clearTimeout(timer); var e = new Error("network"); e.code = "network"; e.cause = err; throw e; });
  }
  function stayToken() { var g = getGuest(); return g && g.stayToken ? g.stayToken : ""; }
  var GUEST_KEY = "kasbah-la-moun-guest";
  function getGuest() {
    try { var g = JSON.parse(window.localStorage.getItem(GUEST_KEY) || "null"); return g && typeof g === "object" ? g : null; } catch (e) { return null; }
  }
  function saveGuest(g) { try { window.localStorage.setItem(GUEST_KEY, JSON.stringify(g)); } catch (e) { /* ignoré */ } }

  var UI = {
    fr: { language: "Langue", back: "Guide", call: "Appeler", whatsapp: "WhatsApp", email: "E-mail", book: "Réserver", bookForm: "Réserver via le formulaire", contactTeam: "Votre demande part directement sur WhatsApp, l'équipe vous confirme.", mad: "MAD", onRequest: "Sur demande", min: "min",
      phone: "Mobile (WhatsApp)", phonePh: "+33 6 12 34 56 78", errPhone: "Indiquez votre numéro WhatsApp.", sending: "Envoi…", sendApi: "Envoyer ma demande", perPerson: "par personne", introApi: "Choisissez, puis envoyez : l'équipe reçoit votre demande et vous la confirme.",
      saved: "Demande enregistrée", savedText: "L'équipe a reçu votre demande et vous confirme très vite sur WhatsApp.", ref: "Référence", alsoWa: "Envoyer aussi sur WhatsApp", myStay: "Mes demandes", errApi: "Enregistrement impossible pour le moment : votre demande s'ouvre dans WhatsApp.",
      slot: "Créneau", slotPick: "Choisissez vos soins et une date pour voir les créneaux libres.", slotNone: "Aucun créneau libre ce jour-là. Essayez une autre date.", slotLoading: "Recherche des créneaux…", errSlot: "Choisissez un créneau.", slotTaken: "Ce créneau vient d'être pris. Choisissez-en un autre." },
    en: { language: "Language", back: "Guide", call: "Call", whatsapp: "WhatsApp", email: "Email", book: "Book", bookForm: "Book with the form", contactTeam: "Your request goes straight to WhatsApp and the team confirms.", mad: "MAD", onRequest: "Upon request", min: "min",
      phone: "Mobile (WhatsApp)", phonePh: "+44 7700 900123", errPhone: "Please enter your WhatsApp number.", sending: "Sending…", sendApi: "Send my request", perPerson: "per person", introApi: "Choose, then send: the team receives your request and confirms it.",
      saved: "Request received", savedText: "The team has your request and will confirm shortly on WhatsApp.", ref: "Reference", alsoWa: "Also send on WhatsApp", myStay: "My requests", errApi: "We could not save your request right now: it opens in WhatsApp instead.",
      slot: "Time slot", slotPick: "Choose your treatments and a date to see free slots.", slotNone: "No free slot that day. Try another date.", slotLoading: "Looking for free slots…", errSlot: "Please choose a time slot.", slotTaken: "That slot was just taken. Please choose another." },
    es: { language: "Idioma", back: "Guía", call: "Llamar", whatsapp: "WhatsApp", email: "Correo", book: "Reservar", bookForm: "Reservar con el formulario", contactTeam: "Tu solicitud llega directamente por WhatsApp y el equipo la confirma.", mad: "MAD", onRequest: "Bajo petición", min: "min",
      phone: "Móvil (WhatsApp)", phonePh: "+34 612 34 56 78", errPhone: "Indica tu número de WhatsApp.", sending: "Enviando…", sendApi: "Enviar mi solicitud", perPerson: "por persona", introApi: "Elige y envía: el equipo recibe tu solicitud y te la confirma.",
      saved: "Solicitud recibida", savedText: "El equipo ha recibido tu solicitud y te la confirmará muy pronto por WhatsApp.", ref: "Referencia", alsoWa: "Enviar también por WhatsApp", myStay: "Mis solicitudes", errApi: "No se pudo guardar la solicitud ahora mismo: se abre en WhatsApp.",
      slot: "Horario", slotPick: "Elige tus tratamientos y una fecha para ver los horarios libres.", slotNone: "No hay horarios libres ese día. Prueba otra fecha.", slotLoading: "Buscando horarios…", errSlot: "Elige un horario.", slotTaken: "Ese horario acaba de ocuparse. Elige otro." },
    de: { language: "Sprache", back: "Guide", call: "Anrufen", whatsapp: "WhatsApp", email: "E-Mail", book: "Buchen", bookForm: "Mit dem Formular buchen", contactTeam: "Ihre Anfrage geht direkt per WhatsApp, das Team bestätigt.", mad: "MAD", onRequest: "Auf Anfrage", min: "Min.",
      phone: "Mobil (WhatsApp)", phonePh: "+49 151 23456789", errPhone: "Bitte geben Sie Ihre WhatsApp-Nummer ein.", sending: "Senden…", sendApi: "Anfrage senden", perPerson: "pro Person", introApi: "Auswählen und senden: das Team erhält Ihre Anfrage und bestätigt sie.",
      saved: "Anfrage eingegangen", savedText: "Das Team hat Ihre Anfrage und bestätigt in Kürze per WhatsApp.", ref: "Referenz", alsoWa: "Auch per WhatsApp senden", myStay: "Meine Anfragen", errApi: "Die Anfrage konnte gerade nicht gespeichert werden: sie öffnet sich in WhatsApp.",
      slot: "Zeitfenster", slotPick: "Wählen Sie Behandlungen und ein Datum, um freie Zeiten zu sehen.", slotNone: "An diesem Tag ist nichts frei. Versuchen Sie ein anderes Datum.", slotLoading: "Freie Zeiten werden gesucht…", errSlot: "Bitte wählen Sie ein Zeitfenster.", slotTaken: "Dieses Zeitfenster wurde gerade vergeben. Bitte wählen Sie ein anderes." },
    ar: { language: "اللغة", back: "الدليل", call: "اتصال", whatsapp: "واتساب", email: "البريد الإلكتروني", book: "احجز", bookForm: "احجز عبر الاستمارة", contactTeam: "يصل طلبكم مباشرة عبر واتساب ويؤكده الفريق.", mad: "درهم", onRequest: "عند الطلب", min: "دقيقة",
      phone: "الهاتف (واتساب)", phonePh: "+212 6 12 34 56 78", errPhone: "يرجى كتابة رقم واتساب.", sending: "جارٍ الإرسال…", sendApi: "إرسال طلبي", perPerson: "للشخص", introApi: "اختاروا ثم أرسلوا: يستلم الفريق طلبكم ويؤكده.",
      saved: "تم استلام الطلب", savedText: "استلم الفريق طلبكم وسيؤكده قريباً عبر واتساب.", ref: "المرجع", alsoWa: "الإرسال أيضاً عبر واتساب", myStay: "طلباتي", errApi: "تعذّر حفظ الطلب الآن: سيُفتح في واتساب.",
      slot: "الموعد", slotPick: "اختاروا العلاجات وتاريخاً لعرض المواعيد المتاحة.", slotNone: "لا مواعيد متاحة في هذا اليوم. جرّبوا تاريخاً آخر.", slotLoading: "جارٍ البحث عن المواعيد…", errSlot: "اختاروا موعداً.", slotTaken: "حُجز هذا الموعد للتو. اختاروا موعداً آخر." }
  };

  function getLang() {
    try { var s = window.localStorage.getItem(STORAGE_KEY); if (s && LANGS[s]) return s; } catch (e) { /* stockage indisponible */ }
    return "fr";
  }
  function saveLang(l) { try { window.localStorage.setItem(STORAGE_KEY, l); } catch (e) { /* ignoré */ } }

  function esc(v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function pad(n) { return String(n).padStart(2, "0"); }

  /* Logo officiel : mandala seul (assets/logo-mark.png) et logo complet avec la devise (assets/logo.png). */
  function logoMark(cls) {
    return '<img class="' + (cls || "mark") + '" src="/assets/logo-mark.png" alt="" width="360" height="360">';
  }
  function wordmark() {
    return '<img class="logo-full" src="/assets/logo.png" alt="Riad Kasbah La Moun, the art of hospitality" width="1400" height="657">';
  }

  function picker(lang) {
    var label = UI[lang].language;
    return '<label class="language-picker"><span>' + esc(label) + '</span><select aria-label="' + esc(label) + '" data-language>' +
      Object.keys(LANGS).map(function (c) { return '<option value="' + c + '"' + (c === lang ? " selected" : "") + ">" + LANGS[c] + "</option>"; }).join("") + "</select></label>";
  }

  function subHeader(lang, title) {
    return '<header class="sub-header"><a href="/" class="back">← ' + esc(UI[lang].back) + "</a><span>" + esc(title) + "</span>" + picker(lang) + "</header>";
  }

  /* En-tête de page secondaire : mandala, sur-titre, titre, texte, puces d'ancres. */
  function pageHero(eyebrow, title, text, chips) {
    return '<section class="page-hero">' + logoMark("hero-mark") + '<p class="eyebrow">' + esc(eyebrow) + "</p><h1>" + esc(title) + "</h1>" +
      (text ? '<p class="page-intro">' + esc(text) + "</p>" : "") +
      (chips && chips.length ? '<nav class="chip-nav">' + chips.map(function (c) { return '<a href="#' + c[0] + '">' + esc(c[1]) + "</a>"; }).join("") + "</nav>" : "") + "</section>";
  }

  function waLink(text) { return "https://wa.me/" + CONTACT.whatsapp.replace("+", "") + (text ? "?text=" + encodeURIComponent(text) : ""); }

  function contactButtons(lang) {
    var t = UI[lang];
    return '<a class="button button-line" href="' + waLink() + '" target="_blank" rel="noreferrer">' + esc(t.whatsapp) + " <bdi>" + CONTACT.whatsappLabel + "</bdi></a>" +
      CONTACT.phones.map(function (p) { return '<a class="button button-line" href="tel:' + p[1] + '">' + esc(t.call) + " " + p[0] + "</a>"; }).join("") +
      '<a class="button button-line" href="mailto:' + CONTACT.email + '">' + esc(t.email) + " <bdi>" + CONTACT.email + "</bdi></a>";
  }

  /* Bloc de bas de page. custom (facultatif) : { title, text, cta } pour remplacer les textes par défaut. */
  function bottomAction(lang, question, anchor, custom) {
    var t = UI[lang], c = custom || {};
    return '<div class="bottom-action"><p>' + esc(c.title || question) + "</p><strong>" + esc(c.text || t.contactTeam) + '</strong><div class="button-stack"><a class="button button-solid" href="/reserver/' + (anchor ? "#" + anchor : "") + '">' + esc(c.cta || t.bookForm) + ' <span aria-hidden="true">→</span></a></div><div class="button-stack">' + contactButtons(lang) + "</div></div>";
  }

  function bookFab(lang, anchor) {
    return '<a class="book-fab" href="/reserver/#' + anchor + '"><span aria-hidden="true">◆</span>' + esc(UI[lang].book) + "</a>";
  }

  /* Barre d'onglets (téléphone). */
  var TABS = [
    { href: "/", icon: "home", label: { fr: "Accueil", en: "Home", es: "Inicio", de: "Start", ar: "الرئيسية" } },
    { href: "/transfert/", icon: "car", label: { fr: "Transfert", en: "Transfer", es: "Traslado", de: "Transfer", ar: "النقل" } },
    { href: "/restaurant/", icon: "food", label: { fr: "Table", en: "Dining", es: "Mesa", de: "Küche", ar: "المطعم" } },
    { href: "/spa/", icon: "lotus", label: { fr: "Spa", en: "Spa", es: "Spa", de: "Spa", ar: "السبا" } },
    { href: "/marrakech/", icon: "compass", label: { fr: "Marrakech", en: "Marrakech", es: "Marrakech", de: "Marrakesch", ar: "مراكش" } }
  ];
  var ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
    car: '<path d="M4 16.5v-3.2L6.2 8h11.6l2.2 5.3v3.2z"/><path d="M4 13.3h16"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/>',
    food: '<path d="M7 3v18"/><path d="M4.5 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M17 21V3c-2.4 1.6-3.2 5-3.2 8H17"/>',
    lotus: '<path d="M12 20c-3.6 0-7.5-2.6-8.5-7.5 4.2 0 8 2.7 8.5 7.5z"/><path d="M12 20c3.6 0 7.5-2.6 8.5-7.5-4.2 0-8 2.7-8.5 7.5z"/><path d="M12 20c-2.2-3.3-2.2-9.3 0-14 2.2 4.7 2.2 10.7 0 14z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16.5 6.5l2.5 2.5M14 9l2 2"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + "</svg>";
  }
  function tabBar(lang) {
    var path = window.location.pathname.replace(/index\.html$/, "");
    if (path.slice(-1) !== "/") path += "/";
    return '<nav class="tab-bar" aria-label="Navigation">' + TABS.map(function (tab) {
      var on = tab.href === path;
      return '<a href="' + tab.href + '"' + (on ? ' class="active" aria-current="page"' : "") + ">" + icon(tab.icon) + "<span>" + esc(tab.label[lang]) + "</span></a>";
    }).join("") + "</nav>";
  }

  function copyText(v) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(v).catch(function () { legacyCopy(v); });
    legacyCopy(v); return Promise.resolve();
  }
  function legacyCopy(v) {
    var a = document.createElement("textarea"); a.value = v; a.style.position = "fixed"; a.style.opacity = "0";
    document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (e) { /* ignoré */ } document.body.removeChild(a);
  }

  function frDate(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : v; }

  function mount(options) {
    var root = document.getElementById("app");
    var lang = getLang();
    function draw(refocus) {
      var dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang; document.documentElement.dir = dir; root.dir = dir;
      if (options.title) document.title = options.title(lang);
      root.innerHTML = options.render(lang) + tabBar(lang);
      if (refocus) { var s = root.querySelector("[data-language]"); if (s) s.focus(); }
    }
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.matches && t.matches("[data-language]") && LANGS[t.value]) { lang = t.value; saveLang(lang); draw(true); }
    });
    root.addEventListener("click", function (e) {
      var card = e.target.closest ? e.target.closest("[data-copy]") : null;
      if (!card) return;
      var a = card.querySelector(".copy-action");
      copyText(card.getAttribute("data-copy"));
      if (a) { a.textContent = card.getAttribute("data-copied"); window.setTimeout(function () { a.textContent = card.getAttribute("data-action"); }, 1800); }
    });
    draw(false);
  }

  /* Fenêtre (pop-up) façon feuille d'appli. html : contenu ; onClose : appelé à la fermeture.
     Tout élément [data-close] ferme la fenêtre ; un clic sur le fond ou Échap aussi. */
  function openModal(html, onClose) {
    closeModal();
    var wrap = document.createElement("div");
    wrap.className = "modal-backdrop"; wrap.setAttribute("data-modal", "");
    wrap.dir = document.documentElement.dir || "ltr";
    wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" tabindex="-1">' + html + "</div>";
    document.body.appendChild(wrap); document.body.classList.add("modal-open");
    function done() { document.removeEventListener("keydown", onKey); if (onClose) onClose(); }
    function onKey(e) { if (e.key === "Escape") { closeModal(); done(); } }
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap || (e.target.closest && e.target.closest("[data-close]"))) { closeModal(); done(); }
    });
    document.addEventListener("keydown", onKey);
    var first = wrap.querySelector(".button") || wrap.querySelector(".modal");
    window.setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }, 30);
    return wrap;
  }
  function closeModal() {
    var m = document.querySelector("[data-modal]"); if (m) m.parentNode.removeChild(m);
    document.body.classList.remove("modal-open");
  }

  /* Suggestions de séjour (dîner, spa, guide), réordonnées selon le motif du séjour du check-in. */
  var UPSELL = {
    fr: { kicker: "Pour un séjour encore plus doux", honeymoon: "Pour votre lune de miel", birthday: "Pour votre anniversaire",
      dinner: ["Dîner à la Kasbah", "Sur réservation, 495 MAD par personne."], birthdayDinner: ["Une table pour célébrer", "Dîner à la Kasbah, sur réservation, 495 MAD par personne."],
      spa: ["Hammam et massages", "Un spa privatisé pour deux, dès 400 MAD."], honeymoonSpa: ["Rituel signature La Moun", "Deux heures de soins à deux, dans le spa privatisé."],
      guide: ["Guide privé", "Marrakech, derrière ses portes. Dès 700 MAD."] },
    en: { kicker: "To make your stay even sweeter", honeymoon: "For your honeymoon", birthday: "For your birthday",
      dinner: ["Dinner at the Kasbah", "On reservation, 495 MAD per person."], birthdayDinner: ["A table to celebrate", "Dinner at the Kasbah, on reservation, 495 MAD per person."],
      spa: ["Hammam and massages", "A private spa for two, from 400 MAD."], honeymoonSpa: ["La Moun signature ritual", "Two hours of treatments together, in the private spa."],
      guide: ["Private guide", "Marrakech, behind its doors. From 700 MAD."] },
    es: { kicker: "Para una estancia aún más dulce", honeymoon: "Para vuestra luna de miel", birthday: "Para tu cumpleaños",
      dinner: ["Cena en la Kasbah", "Bajo reserva, 495 MAD por persona."], birthdayDinner: ["Una mesa para celebrar", "Cena en la Kasbah, bajo reserva, 495 MAD por persona."],
      spa: ["Hammam y masajes", "Un spa privado para dos, desde 400 MAD."], honeymoonSpa: ["Ritual firma La Moun", "Dos horas de tratamientos en pareja, en el spa privado."],
      guide: ["Guía privado", "Marrakech, tras sus puertas. Desde 700 MAD."] },
    de: { kicker: "Für einen noch schöneren Aufenthalt", honeymoon: "Für Ihre Flitterwochen", birthday: "Zu Ihrem Geburtstag",
      dinner: ["Abendessen in der Kasbah", "Auf Reservierung, 495 MAD pro Person."], birthdayDinner: ["Ein Tisch zum Feiern", "Abendessen in der Kasbah, auf Reservierung, 495 MAD pro Person."],
      spa: ["Hammam und Massagen", "Ein privates Spa für zwei, ab 400 MAD."], honeymoonSpa: ["Signature-Ritual La Moun", "Zwei Stunden Behandlungen zu zweit, im privaten Spa."],
      guide: ["Privater Guide", "Marrakesch, hinter seinen Türen. Ab 700 MAD."] },
    ar: { kicker: "لإقامة أكثر راحة", honeymoon: "لشهر العسل", birthday: "لعيد ميلادكم",
      dinner: ["عشاء في القصبة", "بالحجز، 495 درهم للشخص."], birthdayDinner: ["طاولة للاحتفال", "عشاء في القصبة، بالحجز، 495 درهم للشخص."],
      spa: ["حمام وتدليك", "سبا خاص لشخصين، ابتداءً من 400 درهم."], honeymoonSpa: ["طقس لا مون المميز", "ساعتان من العلاجات لشخصين في السبا الخاص."],
      guide: ["مرشد خاص", "مراكش خلف أبوابها. ابتداءً من 700 درهم."] }
  };
  function upsell(lang, purpose) {
    var u = UPSELL[lang];
    var dinner = { href: "/reserver/#diner", icon: "food", x: purpose === "birthday" ? u.birthdayDinner : u.dinner };
    var spa = { href: purpose === "honeymoon" ? "/reserver/#spa" : "/spa/", icon: "lotus", x: purpose === "honeymoon" ? u.honeymoonSpa : u.spa };
    var guide = { href: "/reserver/#guide", icon: "compass", x: u.guide };
    var list = purpose === "honeymoon" ? [spa, dinner, guide] : [dinner, spa, guide];
    return '<div class="upsell"><p class="eyebrow">' + esc(u[purpose] || u.kicker) + "</p>" + list.map(function (o) {
      return '<a class="upsell-item" href="' + o.href + '">' + icon(o.icon) + "<span><strong>" + esc(o.x[0]) + "</strong><small>" + esc(o.x[1]) + '</small></span><b aria-hidden="true">→</b></a>';
    }).join("") + "</div>";
  }

  var RT = window.RT || {};
  RT.upsell = upsell;
  RT.API = API; RT.DINNER_MAD = DINNER_MAD; RT.api = api; RT.stayToken = stayToken; RT.getGuest = getGuest; RT.saveGuest = saveGuest; RT.openModal = openModal; RT.closeModal = closeModal;
  RT.LANGS = LANGS; RT.CONTACT = CONTACT; RT.UI = UI; RT.esc = esc; RT.pad = pad; RT.picker = picker;
  RT.subHeader = subHeader; RT.pageHero = pageHero; RT.bottomAction = bottomAction; RT.contactButtons = contactButtons;
  RT.bookFab = bookFab; RT.waLink = waLink; RT.icon = icon; RT.logoMark = logoMark; RT.wordmark = wordmark;
  RT.getLang = getLang; RT.frDate = frDate; RT.tabBar = tabBar;
  RT.mount = function (o) { if (!RT.noMount) mount(o); };
  window.RT = RT;
})();
