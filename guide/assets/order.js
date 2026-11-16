/* Riad Kasbah La Moun, réservation : spa, dîner, conciergerie.
   Les soins et leurs prix viennent de spa.js (chargé avant) : un prix changé là-bas est à jour ici.
   À l'envoi, le message est écrit en français pour l'équipe. Avec un serveur (RT.API.base) : une commande par section
   (spa, dîner, conciergerie) est enregistrée via /order, le spa sur un créneau libre (/availability) ; le client peut ensuite
   envoyer aussi le message sur WhatsApp. Sans serveur : le message s'ouvre directement dans WhatsApp. */
(function () {
  "use strict";
  var esc = RT.esc;
  function L(fr, en, es, de, ar) { return { fr: fr, en: en, es: es, de: de, ar: ar }; }

  var T = {
    fr: { title: "Riad Kasbah La Moun | Réserver", header: "Réservation", eyebrow: "Spa, dîner et conciergerie", h1: "Réserver", intro: "Choisissez, puis envoyez : votre demande s'ouvre dans WhatsApp, prête à partir vers l'équipe.",
      you: "Vos informations", name: "Nom", namePh: "Votre nom", suite: "Suite", suitePh: "Nom ou numéro de la suite",
      sections: ["Spa", "Dîner", "Conciergerie"], spaWhen: "Date souhaitée", time: "Heure", dinnerDate: "Date du dîner", dinnerTime: "Heure souhaitée", guests: "Convives", allergies: "Allergies, préférences", allergiesPh: "Allergies, régime, occasion particulière",
      request: "Votre demande", pick: "Choisir", reqDate: "Date souhaitée", people: "Personnes", details: "Précisions", detailsPh: "Ce que vous aimeriez, vos horaires, vos questions",
      notes: "Autre chose ?", notesPh: "Une précision pour l'équipe", total: "Total estimé", items: "demandes", send: "Envoyer sur WhatsApp",
      errName: "Indiquez votre nom.", errEmpty: "Choisissez au moins un soin, un dîner ou une demande.", errDinner: "Indiquez la date du dîner.",
      disclaimer: "Le total est indicatif. L'équipe confirme chaque réservation sur WhatsApp.", add: "Ajouter", remove: "Retirer" },
    en: { title: "Riad Kasbah La Moun | Book", header: "Booking", eyebrow: "Spa, dinner and concierge", h1: "Book", intro: "Choose, then send: your request opens in WhatsApp, ready to go to the team.",
      you: "Your details", name: "Name", namePh: "Your name", suite: "Suite", suitePh: "Suite name or number",
      sections: ["Spa", "Dinner", "Concierge"], spaWhen: "Preferred date", time: "Time", dinnerDate: "Dinner date", dinnerTime: "Preferred time", guests: "Guests", allergies: "Allergies, preferences", allergiesPh: "Allergies, diet, special occasion",
      request: "Your request", pick: "Select", reqDate: "Preferred date", people: "People", details: "Details", detailsPh: "What you would like, your timing, your questions",
      notes: "Anything else?", notesPh: "A note for the team", total: "Estimated total", items: "requests", send: "Send on WhatsApp",
      errName: "Please enter your name.", errEmpty: "Choose at least one treatment, a dinner or a request.", errDinner: "Please enter the dinner date.",
      disclaimer: "The total is an estimate. The team confirms each booking on WhatsApp.", add: "Add", remove: "Remove" },
    es: { title: "Riad Kasbah La Moun | Reservar", header: "Reserva", eyebrow: "Spa, cena y conserjería", h1: "Reservar", intro: "Elige y envía: tu solicitud se abre en WhatsApp, lista para enviarla al equipo.",
      you: "Tus datos", name: "Nombre", namePh: "Tu nombre", suite: "Suite", suitePh: "Nombre o número de la suite",
      sections: ["Spa", "Cena", "Conserjería"], spaWhen: "Fecha deseada", time: "Hora", dinnerDate: "Fecha de la cena", dinnerTime: "Hora deseada", guests: "Comensales", allergies: "Alergias, preferencias", allergiesPh: "Alergias, dieta, ocasión especial",
      request: "Tu solicitud", pick: "Elegir", reqDate: "Fecha deseada", people: "Personas", details: "Detalles", detailsPh: "Lo que te gustaría, tus horarios, tus preguntas",
      notes: "¿Algo más?", notesPh: "Una nota para el equipo", total: "Total estimado", items: "solicitudes", send: "Enviar por WhatsApp",
      errName: "Indica tu nombre.", errEmpty: "Elige al menos un tratamiento, una cena o una solicitud.", errDinner: "Indica la fecha de la cena.",
      disclaimer: "El total es orientativo. El equipo confirma cada reserva por WhatsApp.", add: "Añadir", remove: "Quitar" },
    de: { title: "Riad Kasbah La Moun | Buchen", header: "Buchung", eyebrow: "Spa, Abendessen und Concierge", h1: "Buchen", intro: "Auswählen und senden: Ihre Anfrage öffnet sich in WhatsApp, bereit für das Team.",
      you: "Ihre Angaben", name: "Name", namePh: "Ihr Name", suite: "Suite", suitePh: "Name oder Nummer der Suite",
      sections: ["Spa", "Abendessen", "Concierge"], spaWhen: "Gewünschtes Datum", time: "Uhrzeit", dinnerDate: "Datum des Abendessens", dinnerTime: "Gewünschte Uhrzeit", guests: "Personen", allergies: "Allergien, Vorlieben", allergiesPh: "Allergien, Ernährung, besonderer Anlass",
      request: "Ihre Anfrage", pick: "Auswählen", reqDate: "Gewünschtes Datum", people: "Personen", details: "Details", detailsPh: "Ihre Wünsche, Zeiten, Fragen",
      notes: "Sonst noch etwas?", notesPh: "Eine Notiz für das Team", total: "Geschätzter Betrag", items: "Anfragen", send: "Per WhatsApp senden",
      errName: "Bitte geben Sie Ihren Namen ein.", errEmpty: "Wählen Sie mindestens eine Behandlung, ein Abendessen oder eine Anfrage.", errDinner: "Bitte geben Sie das Datum des Abendessens ein.",
      disclaimer: "Der Betrag ist ein Richtwert. Das Team bestätigt jede Buchung per WhatsApp.", add: "Hinzufügen", remove: "Entfernen" },
    ar: { title: "رياض قصبة لا مون | الحجز", header: "الحجز", eyebrow: "السبا، العشاء والكونسيرج", h1: "احجز", intro: "اختاروا ثم أرسلوا: يُفتح طلبكم في واتساب جاهزاً للإرسال إلى الفريق.",
      you: "معلوماتكم", name: "الاسم", namePh: "اسمكم", suite: "الجناح", suitePh: "اسم الجناح أو رقمه",
      sections: ["السبا", "العشاء", "الكونسيرج"], spaWhen: "التاريخ المفضل", time: "الوقت", dinnerDate: "تاريخ العشاء", dinnerTime: "الوقت المفضل", guests: "عدد الأشخاص", allergies: "الحساسية والتفضيلات", allergiesPh: "حساسية، نظام غذائي، مناسبة خاصة",
      request: "طلبكم", pick: "اختر", reqDate: "التاريخ المفضل", people: "الأشخاص", details: "تفاصيل", detailsPh: "ما ترغبون فيه، مواعيدكم، أسئلتكم",
      notes: "شيء آخر؟", notesPh: "ملاحظة للفريق", total: "المجموع التقريبي", items: "طلبات", send: "إرسال عبر واتساب",
      errName: "يرجى كتابة اسمكم.", errEmpty: "اختاروا جلسة أو عشاء أو طلباً على الأقل.", errDinner: "يرجى تحديد تاريخ العشاء.",
      disclaimer: "المجموع تقريبي. يؤكد الفريق كل حجز عبر واتساب.", add: "إضافة", remove: "حذف" }
  };
  var LANG_FR = { fr: "français", en: "anglais", es: "espagnol", de: "allemand", ar: "arabe" };

  /* Demandes de conciergerie (page Notre Marrakech). id = ancre qui présélectionne la demande (/reserver/#guide). */
  var REQUESTS = [
    { id: "guide", t: L("Guide privé « Marrakech, derrière ses portes », demi-journée (700 MAD)", "Private guide \u201cMarrakech, behind its doors\u201d, half day (700 MAD)", "Guía privado «Marrakech, tras sus puertas», medio día (700 MAD)", "Privater Guide \u201eMarrakesch, hinter seinen Türen\u201c, halber Tag (700 MAD)", "مرشد خاص «مراكش خلف أبوابها»، نصف يوم (700 درهم)") },
    { id: "guide-journee", t: L("Guide privé « Marrakech, derrière ses portes », journée (1 000 MAD)", "Private guide \u201cMarrakech, behind its doors\u201d, full day (1,000 MAD)", "Guía privado «Marrakech, tras sus puertas», día completo (1000 MAD)", "Privater Guide \u201eMarrakesch, hinter seinen Türen\u201c, ganzer Tag (1.000 MAD)", "مرشد خاص «مراكش خلف أبوابها»، يوم كامل (1000 درهم)") },
    { id: "zat", t: L("Journée dans la vallée du Zat (tarif selon le nombre de participants)", "Day in the Zat Valley (price depends on group size)", "Día en el valle del Zat (precio según el número de participantes)", "Tag im Zat-Tal (Preis je nach Teilnehmerzahl)", "يوم في وادي الزات (السعر حسب عدد المشاركين)") },
    { id: "table", t: L("Réserver une table en ville", "Book a table in town", "Reservar una mesa en la ciudad", "Einen Tisch in der Stadt reservieren", "حجز طاولة في المدينة") },
    { id: "autre", t: L("Autre demande", "Other request", "Otra solicitud", "Andere Anfrage", "طلب آخر") }
  ];

  /* Catalogue spa : un élément par durée. */
  var ITEMS = {}, GROUPS = [];
  (RT.SPA || []).forEach(function (cat, ci) {
    var g = { title: cat.title, items: [] };
    cat.items.forEach(function (it, ii) {
      it.opts.forEach(function (o, oi) {
        var id = "s" + ci + "-" + ii + "-" + oi;
        ITEMS[id] = { price: o[1], min: o[0], label: function (l) { return it[l][0] + " • " + o[0] + " " + RT.UI[l].min; }, labelFr: it.fr[0] + " " + o[0] + " min" };
        g.items.push(id);
      });
    });
    GROUPS.push(g);
  });

  var state = { qty: {}, name: "", phone: "", suite: "", spaDate: "", spaTime: "", spaSlot: "", dinnerOn: false, dinnerDate: "", dinnerTime: "", guests: 2, allergies: "", request: "", reqDate: "", people: 2, details: "", notes: "", error: "", busy: false };
  var slots = { status: "idle", list: [], key: "" }; /* créneaux spa libres renvoyés par le serveur */
  var guest = RT.getGuest(); /* nom et numéro repris du check-in en ligne */
  if (guest) { state.name = ((guest.first || "") + " " + (guest.last || "")).trim(); state.phone = guest.mobile || ""; }

  function spaCount() { return Object.keys(state.qty).reduce(function (n, id) { return n + state.qty[id]; }, 0); }
  function spaTotal() { return Object.keys(state.qty).reduce(function (s, id) { return s + ITEMS[id].price * state.qty[id]; }, 0); }
  function spaMinutes() { return Object.keys(state.qty).reduce(function (s, id) { return s + ITEMS[id].min * state.qty[id]; }, 0); }

  /* Créneaux spa : chargés dès qu'il y a des soins et une date ; redessinés sans toucher au reste du formulaire. */
  function slotsHtml(lang) {
    var ui = RT.UI[lang];
    if (!RT.API.base) return "";
    if (!spaCount() || !state.spaDate) return '<p class="slot-hint">' + esc(ui.slotPick) + "</p>";
    if (slots.status === "loading") return '<p class="slot-hint">' + esc(ui.slotLoading) + "</p>";
    if (slots.status === "error") return '<p class="slot-hint">' + esc(ui.errApi) + "</p>";
    if (!slots.list.length) return '<p class="slot-hint">' + esc(ui.slotNone) + "</p>";
    return '<div class="slots">' + slots.list.map(function (s) {
      return '<button type="button" class="slot' + (s.label === state.spaSlot ? " on" : "") + '" data-slot="' + esc(s.label) + '">' + esc(s.label) + "</button>";
    }).join("") + "</div>";
  }
  function drawSlots() { var box = root.querySelector("[data-slots]"); if (box) box.innerHTML = slotsHtml(RT.getLang()); }
  var slotTimer = null;
  function loadSlots() {
    if (!RT.API.base) return;
    if (!spaCount() || !state.spaDate) { slots = { status: "idle", list: [], key: "" }; state.spaSlot = ""; drawSlots(); return; }
    var key = state.spaDate + "|" + spaMinutes();
    if (key === slots.key && slots.status === "ready") { drawSlots(); return; }
    slots = { status: "loading", list: [], key: key }; drawSlots();
    window.clearTimeout(slotTimer);
    slotTimer = window.setTimeout(function () {
      RT.api("/availability?kind=spa&date=" + encodeURIComponent(state.spaDate) + "&duration=" + spaMinutes()).then(function (r) {
        if (slots.key !== key) return;
        slots = { status: "ready", list: r.slots || [], key: key };
        if (!slots.list.some(function (s) { return s.label === state.spaSlot; })) state.spaSlot = "";
        drawSlots();
      }, function () { if (slots.key === key) { slots = { status: "error", list: [], key: key }; drawSlots(); } });
    }, 250);
  }
  function count() { return spaCount() + (state.dinnerOn ? 1 : 0) + (state.request !== "" ? 1 : 0); }
  function dinnerTotal() { return state.dinnerOn ? state.guests * RT.DINNER_MAD : 0; }
  function grandTotal() { return spaTotal() + dinnerTotal(); }
  function money(v, lang) { return v.toLocaleString("fr-FR").replace(/ /g, " ") + " " + RT.UI[lang].mad; }

  function stepper(attr, value, min, t) {
    return '<div class="stepper" ' + attr + '><button type="button" data-step="-1" aria-label="' + esc(t.remove) + '"' + (value > min ? "" : " disabled") + '>−</button><output aria-live="polite">' + value + '</output><button type="button" data-step="1" aria-label="' + esc(t.add) + '">+</button></div>';
  }
  function field(label, control, cls) { return '<label class="field' + (cls ? " " + cls : "") + '"><span>' + esc(label) + "</span>" + control + "</label>"; }
  function input(key, type, ph) { return '<input type="' + type + '" data-key="' + key + '" value="' + esc(state[key]) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + ">"; }
  function textarea(key, ph) { return '<textarea data-key="' + key + '" rows="3" placeholder="' + esc(ph) + '">' + esc(state[key]) + "</textarea>"; }

  function render(lang) {
    var t = T[lang], h = "";
    h += RT.subHeader(lang, t.header);
    h += RT.pageHero(t.eyebrow, t.h1, RT.API.base ? RT.UI[lang].introApi : t.intro, [["spa", t.sections[0]], ["diner", t.sections[1]], ["conciergerie", t.sections[2]]]);
    h += '<form class="sheet form" novalidate>';
    h += '<div class="category"><p class="eyebrow">01</p><h2>' + esc(t.you) + '</h2><div class="fields two">' + field(t.name, input("name", "text", t.namePh)) + field(t.suite, input("suite", "text", t.suitePh)) +
      (RT.API.base && !RT.stayToken() ? field(RT.UI[lang].phone, '<input type="tel" data-key="phone" value="' + esc(state.phone) + '" placeholder="' + esc(RT.UI[lang].phonePh) + '" autocomplete="tel" inputmode="tel">') : "") + "</div></div>";

    h += '<div class="category" id="spa"><p class="eyebrow">02</p><h2>' + esc(t.sections[0]) + "</h2>";
    h += GROUPS.map(function (g, gi) {
      var open = gi === 0 || g.items.some(function (id) { return state.qty[id]; });
      return '<details class="fold"' + (open ? " open" : "") + "><summary>" + esc(g.title[lang]) + "</summary>" + g.items.map(function (id) {
        var it = ITEMS[id], q = state.qty[id] || 0;
        return '<div class="pick' + (q ? " picked" : "") + '"><div><strong>' + esc(it.label(lang)) + '</strong><b class="price">' + money(it.price, lang) + "</b></div>" + stepper('data-id="' + id + '"', q, 0, t) + "</div>";
      }).join("") + "</details>";
    }).join("");
    if (RT.API.base) h += '<div class="fields two">' + field(t.spaWhen, input("spaDate", "date")) + '<div class="field"><span>' + esc(RT.UI[lang].slot) + '</span><div class="slot-box" data-slots>' + slotsHtml(lang) + "</div></div></div></div>";
    else h += '<div class="fields two">' + field(t.spaWhen, input("spaDate", "date")) + field(t.time, input("spaTime", "time")) + "</div></div>";

    h += '<div class="category" id="diner"><p class="eyebrow">03</p><h2>' + esc(t.sections[1]) + "</h2>" +
      '<label class="switch-row"><span><strong>' + esc(t.sections[1]) + "</strong><small>" + RT.DINNER_MAD + " " + esc(RT.UI[lang].mad) + " " + esc(RT.UI[lang].perPerson) + '</small></span><input type="checkbox" data-dinner' + (state.dinnerOn ? " checked" : "") + '><i aria-hidden="true"></i></label>' +
      '<div class="reveal" data-dinner-block' + (state.dinnerOn ? "" : " hidden") + '><div class="fields two">' + field(t.dinnerDate, input("dinnerDate", "date")) + field(t.dinnerTime, input("dinnerTime", "time")) +
      '<div class="field"><span>' + esc(t.guests) + "</span>" + stepper('data-count="guests"', state.guests, 1, t) + "</div></div>" +
      '<div class="fields">' + field(t.allergies, textarea("allergies", t.allergiesPh)) + "</div></div></div>";

    h += '<div class="category" id="conciergerie"><p class="eyebrow">04</p><h2>' + esc(t.sections[2]) + '</h2><div class="fields">' +
      field(t.request, '<select data-key="request"><option value="">' + esc(t.pick) + "</option>" + REQUESTS.map(function (r, i) { return '<option value="' + i + '"' + (String(state.request) === String(i) ? " selected" : "") + ">" + esc(r.t[lang]) + "</option>"; }).join("") + "</select>") +
      '</div><div class="fields two">' + field(t.reqDate, input("reqDate", "date")) + '<div class="field"><span>' + esc(t.people) + "</span>" + stepper('data-count="people"', state.people, 1, t) + "</div></div>" +
      '<div class="fields">' + field(t.details, textarea("details", t.detailsPh)) + "</div></div>";

    h += '<div class="category"><p class="eyebrow">05</p><h2>' + esc(t.notes) + '</h2><div class="fields">' + field(t.notes, textarea("notes", t.notesPh), "sr-label") + '</div><p class="note">' + esc(t.disclaimer) + "</p></div>";
    h += "</form>";

    h += '<div class="submit-bar"><div><span data-count-label>' + count() + " " + esc(t.items) + "</span><strong>" + esc(t.total) + ' : <b data-total>' + money(grandTotal(), lang) + '</b></strong><em class="form-error" data-error role="alert">' + esc(state.error) + "</em></div>" +
      '<button type="button" class="button button-solid" data-send' + (state.busy ? " disabled" : "") + ">" + esc(state.busy ? RT.UI[lang].sending : RT.API.base ? RT.UI[lang].sendApi : t.send) + "</button></div>";
    h += '<div class="bottom-action"><div class="button-stack">' + RT.contactButtons(lang) + "</div></div>";
    return h;
  }

  function when(d, tm) { return [d ? RT.frDate(d) : "", tm ? "à " + tm : ""].filter(Boolean).join(" "); }

  function buildMessage(lang) {
    var M = ["Bonjour, voici ma demande depuis le guide du Riad Kasbah La Moun.", "", "Nom : " + state.name.trim()];
    if (state.suite.trim()) M.push("Suite : " + state.suite.trim());
    if (lang !== "fr") M.push("Langue du client : " + LANG_FR[lang]);
    if (spaCount()) {
      var w = when(state.spaDate, RT.API.base ? state.spaSlot : state.spaTime);
      M.push("", "*SPA*" + (w ? " (" + w + ")" : ""));
      GROUPS.forEach(function (g) { g.items.forEach(function (id) { var q = state.qty[id]; if (q) M.push("- " + q + " x " + ITEMS[id].labelFr + " : " + ITEMS[id].price * q + " MAD"); }); });
      M.push("Total spa estimé : " + spaTotal() + " MAD");
    }
    if (state.dinnerOn) {
      M.push("", "*DÎNER*", "Date : " + when(state.dinnerDate, state.dinnerTime), "Convives : " + state.guests + " x " + RT.DINNER_MAD + " MAD = " + dinnerTotal() + " MAD");
      if (state.allergies.trim()) M.push("Allergies, préférences : " + state.allergies.trim());
    }
    if (state.request !== "") {
      M.push("", "*CONCIERGERIE*", "Demande : " + REQUESTS[state.request].t.fr);
      if (state.reqDate) M.push("Date : " + RT.frDate(state.reqDate));
      M.push("Personnes : " + state.people);
      if (state.details.trim()) M.push("Précisions : " + state.details.trim());
    }
    if (state.notes.trim()) M.push("", "Remarques : " + state.notes.trim());
    return M.join("\n");
  }

  var root = document.getElementById("app");
  function refresh() {
    var lang = RT.getLang(), t = T[lang];
    var c = root.querySelector("[data-count-label]"), tt = root.querySelector("[data-total]"), e = root.querySelector("[data-error]"), s = root.querySelector("[data-send]");
    if (c) c.textContent = count() + " " + t.items;
    if (tt) tt.textContent = money(grandTotal(), lang);
    if (e) e.textContent = state.error;
    if (s) { s.disabled = state.busy; s.textContent = state.busy ? RT.UI[lang].sending : RT.API.base ? RT.UI[lang].sendApi : t.send; }
  }
  function openWa(url) { var w = window.open(url, "_blank"); if (!w) { window.location.href = url; return false; } return true; }

  /* Les commandes à enregistrer : une par section remplie. */
  function buildOrders(lang) {
    var list = [], base = { stayToken: RT.stayToken(), guest: { name: state.name.trim(), phone: state.phone.trim(), suite: state.suite.trim() }, lang: lang, message: buildMessage(lang), notes: state.notes.trim() };
    function mk(kind, items, details) { var o = {}; for (var k in base) o[k] = base[k]; o.kind = kind; o.items = items; o.details = details; return o; }
    if (spaCount()) {
      var items = [];
      GROUPS.forEach(function (g) { g.items.forEach(function (id) { var q = state.qty[id]; if (q) items.push({ key: id, labelFr: ITEMS[id].labelFr, qty: q, unitPriceMad: ITEMS[id].price, durationMin: ITEMS[id].min }); }); });
      list.push(mk("spa", items, { date: state.spaDate, slot: state.spaSlot, people: 2 }));
    }
    if (state.dinnerOn) list.push(mk("dinner", [{ key: "dinner", labelFr: "Dîner à la Kasbah", qty: state.guests, unitPriceMad: RT.DINNER_MAD }], { date: state.dinnerDate, time: state.dinnerTime, guests: state.guests, allergies: state.allergies.trim() }));
    if (state.request !== "") {
      var r = REQUESTS[state.request];
      list.push(mk("concierge", [], { requestId: r.id, labelFr: r.t.fr, date: state.reqDate, people: state.people, details: state.details.trim() }));
    }
    return list;
  }
  function sentModal(lang, refs, url) {
    var ui = RT.UI[lang], t = T[lang];
    var h = '<button type="button" class="modal-close" data-close aria-label="×">×</button>' + RT.logoMark("modal-mark") +
      "<h2>" + esc(ui.saved) + "</h2><p>" + esc(ui.savedText) + '</p><p class="note">' + esc(ui.ref) + " : <b>" + refs.map(esc).join(", ") + "</b></p>" +
      '<div class="modal-actions">' + (RT.API.alsoWhatsApp ? '<a class="button button-solid" href="' + esc(url) + '" target="_blank" rel="noreferrer">' + esc(ui.alsoWa) + "</a>" : "") +
      (RT.stayToken() ? '<a class="button button-line" href="/mon-sejour/">' + esc(ui.myStay) + "</a>" : "") + '<a class="button button-line" href="/">' + esc(RT.UI[lang].back) + "</a></div>";
    RT.openModal(h, function () { window.location.href = "/"; });
  }
  function sendAll(lang) {
    var ui = RT.UI[lang], orders = buildOrders(lang), refs = [], url = RT.waLink(buildMessage(lang));
    state.busy = true; refresh();
    function next(i) {
      if (i >= orders.length) { state.busy = false; refresh(); sentModal(lang, refs, url); return; }
      RT.api("/order", orders[i]).then(function (r) { refs.push(r.orderId); next(i + 1); }, function (err) {
        state.busy = false;
        if (err.code === "slot_taken") { state.error = ui.slotTaken; state.spaSlot = ""; slots.key = ""; refresh(); loadSlots(); return; }
        if (err.code === "full" || err.code === "when" || err.code === "guest" || err.code === "items") { state.error = err.message || ui.errApi; refresh(); return; }
        state.error = refs.length ? err.message || ui.errApi : ui.errApi; refresh();
        if (!refs.length) openWa(url); /* rien n'a été enregistré : la demande part sur WhatsApp */
      });
    }
    next(0);
  }

  root.addEventListener("click", function (ev) {
    var btn = ev.target.closest && ev.target.closest("[data-step]");
    if (btn) {
      var box = btn.closest(".stepper"), d = Number(btn.getAttribute("data-step")), q, min;
      if (box.hasAttribute("data-id")) {
        var id = box.getAttribute("data-id"); min = 0;
        q = Math.max(0, Math.min(10, (state.qty[id] || 0) + d));
        if (q) state.qty[id] = q; else delete state.qty[id];
        box.closest(".pick").classList.toggle("picked", !!q);
        loadSlots();
      } else {
        var key = box.getAttribute("data-count"); min = 1;
        q = state[key] = Math.max(1, Math.min(30, state[key] + d));
      }
      box.querySelector("output").textContent = q;
      box.querySelector('[data-step="-1"]').disabled = q <= min;
      state.error = ""; refresh();
      return;
    }
    var slotBtn = ev.target.closest && ev.target.closest("[data-slot]");
    if (slotBtn) { state.spaSlot = slotBtn.getAttribute("data-slot"); state.error = ""; refresh(); drawSlots(); return; }
    if (ev.target.closest && ev.target.closest("[data-send]")) {
      if (state.busy) return;
      var lang = RT.getLang(), t = T[lang], ui = RT.UI[lang];
      if (!state.name.trim()) { state.error = t.errName; refresh(); var f = root.querySelector('[data-key="name"]'); if (f) f.focus(); return; }
      if (RT.API.base && !RT.stayToken() && !state.phone.trim()) { state.error = ui.errPhone; refresh(); var p = root.querySelector('[data-key="phone"]'); if (p) p.focus(); return; }
      if (!count()) { state.error = t.errEmpty; refresh(); return; }
      if (RT.API.base && spaCount() && (!state.spaDate || !state.spaSlot)) { state.error = ui.errSlot; refresh(); return; }
      if (state.dinnerOn && !state.dinnerDate) { state.error = t.errDinner; refresh(); return; }
      state.error = ""; refresh();
      if (!RT.API.base) { openWa(RT.waLink(buildMessage(lang))); return; }
      sendAll(lang);
    }
  });
  function onField(ev) {
    var el = ev.target;
    if (el.hasAttribute && el.hasAttribute("data-dinner")) {
      state.dinnerOn = el.checked;
      var b = root.querySelector("[data-dinner-block]"); if (b) b.hidden = !state.dinnerOn;
      state.error = ""; refresh(); return;
    }
    var k = el.getAttribute && el.getAttribute("data-key");
    if (!k) return;
    state[k] = el.value;
    if (k === "request") refresh();
    if (k === "spaDate") loadSlots();
    if (state.error) { state.error = ""; refresh(); }
  }
  root.addEventListener("input", onField);
  root.addEventListener("change", onField);
  root.addEventListener("submit", function (e) { e.preventDefault(); });

  /* #diner ouvre directement la réservation du dîner ; #spa ou #conciergerie fait défiler. */
  function focusHash() {
    var id = (window.location.hash || "").slice(1);
    /* #guide, #zat, #table : présélectionne la demande de conciergerie. */
    var req = REQUESTS.map(function (r) { return r.id; }).indexOf(id);
    if (req >= 0) {
      state.request = String(req);
      var sel = root.querySelector('[data-key="request"]'); if (sel) sel.value = state.request;
      refresh(); id = "conciergerie";
    }
    var el = id && document.getElementById(id);
    if (!el) return;
    if (id === "diner" && !state.dinnerOn) { var c = el.querySelector("[data-dinner]"); if (c) { c.checked = true; onField({ target: c }); } }
    el.scrollIntoView();
  }

  RT.buildOrderMessage = buildMessage; RT.orderState = state;
  RT.mount({ render: render, title: function (l) { return T[l].title; } });
  window.addEventListener("hashchange", focusHash);
  window.setTimeout(focusHash, 0);
})();
