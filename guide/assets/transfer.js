/* Riad Kasbah La Moun, transfert privé aéroport.
   Prix par trajet selon l'heure : DAY_MAD de 8h00 à 19h59, NIGHT_MAD de 20h00 à 7h59.
   Avec un serveur (RT.API.base), la demande est enregistrée (/order), mise au calendrier du chauffeur et envoyée sur Telegram ;
   le client peut ensuite l'envoyer aussi sur WhatsApp. Sans serveur, le message part sur le WhatsApp du riad. */
(function () {
  "use strict";
  var esc = RT.esc;
  var DAY_MAD = 200, NIGHT_MAD = 300, DAY_START = 8, NIGHT_START = 20;

  var T = {
    fr: { title: "Riad Kasbah La Moun | Transfert", header: "Transfert privé", eyebrow: "Aéroport Marrakech-Ménara • Privé", h1: "Votre arrivée", intro: "Un chauffeur privé vous attend à l'aéroport et vous conduit jusqu'à la Kasbah.",
      sentTitle: "Demande envoyée", sentText: "L'équipe vous confirme le transfert sur WhatsApp. Et pour la suite de votre séjour ?", finish: "Terminer",
      dayLabel: "par trajet, de 8h à 20h", nightLabel: "par trajet, de 20h à 8h", priceWait: "Total selon l'heure du trajet", premium: "Véhicule Premium garanti, le chauffeur maîtrise le trajet.",
      price: "par trajet", priceTbc: "Tarif confirmé par l'équipe sur WhatsApp", arrival: "Transfert arrivée", arrivalSub: "Aéroport vers le riad",
      name: "Nom du client", namePh: "Nom et prénom", people: "Nombre de personnes", flight: "Numéro de vol", flightPh: "Ex. AT 800", date: "Date d'arrivée", time: "Heure d'arrivée",
      round: "Aller-retour", roundSub: "Ajouter le transfert retour vers l'aéroport", back: "Transfert retour", backSub: "Riad vers l'aéroport",
      backFlight: "Numéro de vol retour", backDate: "Date de départ", backTime: "Heure de départ du riad",
      trips: ["1 trajet", "2 trajets"], total: "Total", send: "Envoyer sur WhatsApp", missing: "À compléter : ", confirm: "L'équipe confirme votre transfert et son tarif sur WhatsApp.", add: "Ajouter", remove: "Retirer" },
    en: { title: "Riad Kasbah La Moun | Transfer", header: "Private transfer", eyebrow: "Marrakech Menara Airport • Private", h1: "Your arrival", intro: "A private driver meets you at the airport and drives you to the Kasbah.",
      sentTitle: "Request sent", sentText: "The team confirms your transfer on WhatsApp. And for the rest of your stay?", finish: "Done",
      dayLabel: "per trip, 8 am to 8 pm", nightLabel: "per trip, 8 pm to 8 am", priceWait: "Total depends on the time of travel", premium: "Premium vehicle guaranteed, our driver knows the way.",
      price: "per trip", priceTbc: "Price confirmed by the team on WhatsApp", arrival: "Arrival transfer", arrivalSub: "Airport to the riad",
      name: "Guest name", namePh: "First and last name", people: "Number of people", flight: "Flight number", flightPh: "e.g. AT 800", date: "Arrival date", time: "Arrival time",
      round: "Round trip", roundSub: "Add the return transfer to the airport", back: "Return transfer", backSub: "Riad to the airport",
      backFlight: "Return flight number", backDate: "Departure date", backTime: "Pick-up time at the riad",
      trips: ["1 trip", "2 trips"], total: "Total", send: "Send on WhatsApp", missing: "Please fill in: ", confirm: "The team confirms your transfer and its price on WhatsApp.", add: "Add", remove: "Remove" },
    es: { title: "Riad Kasbah La Moun | Traslado", header: "Traslado privado", eyebrow: "Aeropuerto Marrakech-Menara • Privado", h1: "Tu llegada", intro: "Un chófer privado te espera en el aeropuerto y te lleva hasta la Kasbah.",
      sentTitle: "Solicitud enviada", sentText: "El equipo te confirma el traslado por WhatsApp. ¿Y para el resto de tu estancia?", finish: "Terminar",
      dayLabel: "por trayecto, de 8:00 a 20:00", nightLabel: "por trayecto, de 20:00 a 8:00", priceWait: "Total según la hora del trayecto", premium: "Vehículo Premium garantizado, el chófer conoce el camino.",
      price: "por trayecto", priceTbc: "Precio confirmado por el equipo por WhatsApp", arrival: "Traslado de llegada", arrivalSub: "Del aeropuerto al riad",
      name: "Nombre del cliente", namePh: "Nombre y apellido", people: "Número de personas", flight: "Número de vuelo", flightPh: "Ej. AT 800", date: "Fecha de llegada", time: "Hora de llegada",
      round: "Ida y vuelta", roundSub: "Añadir el traslado de regreso al aeropuerto", back: "Traslado de regreso", backSub: "Del riad al aeropuerto",
      backFlight: "Número de vuelo de regreso", backDate: "Fecha de salida", backTime: "Hora de salida del riad",
      trips: ["1 trayecto", "2 trayectos"], total: "Total", send: "Enviar por WhatsApp", missing: "Completa: ", confirm: "El equipo confirma tu traslado y su precio por WhatsApp.", add: "Añadir", remove: "Quitar" },
    de: { title: "Riad Kasbah La Moun | Transfer", header: "Privater Transfer", eyebrow: "Flughafen Marrakesch-Menara • Privat", h1: "Ihre Ankunft", intro: "Ein privater Fahrer erwartet Sie am Flughafen und bringt Sie zur Kasbah.",
      sentTitle: "Anfrage gesendet", sentText: "Das Team bestätigt Ihren Transfer per WhatsApp. Und für den Rest Ihres Aufenthalts?", finish: "Fertig",
      dayLabel: "pro Fahrt, 8 bis 20 Uhr", nightLabel: "pro Fahrt, 20 bis 8 Uhr", priceWait: "Betrag je nach Uhrzeit der Fahrt", premium: "Premium-Fahrzeug garantiert, der Fahrer kennt den Weg.",
      price: "pro Fahrt", priceTbc: "Preis wird vom Team per WhatsApp bestätigt", arrival: "Ankunftstransfer", arrivalSub: "Flughafen zum Riad",
      name: "Name des Gastes", namePh: "Vor- und Nachname", people: "Anzahl Personen", flight: "Flugnummer", flightPh: "z. B. AT 800", date: "Ankunftsdatum", time: "Ankunftszeit",
      round: "Hin und zurück", roundSub: "Rücktransfer zum Flughafen hinzufügen", back: "Rücktransfer", backSub: "Riad zum Flughafen",
      backFlight: "Flugnummer Rückflug", backDate: "Abreisedatum", backTime: "Abfahrtszeit am Riad",
      trips: ["1 Fahrt", "2 Fahrten"], total: "Gesamt", send: "Per WhatsApp senden", missing: "Bitte ausfüllen: ", confirm: "Das Team bestätigt Transfer und Preis per WhatsApp.", add: "Hinzufügen", remove: "Entfernen" },
    ar: { title: "رياض قصبة لا مون | النقل", header: "نقل خاص", eyebrow: "مطار مراكش المنارة • خاص", h1: "وصولكم", intro: "سائق خاص في انتظاركم بالمطار لإيصالكم إلى القصبة.",
      sentTitle: "تم إرسال الطلب", sentText: "يؤكد الفريق نقلكم عبر واتساب. وماذا عن بقية إقامتكم؟", finish: "إنهاء",
      dayLabel: "للرحلة، من 8:00 إلى 20:00", nightLabel: "للرحلة، من 20:00 إلى 8:00", priceWait: "المجموع حسب وقت الرحلة", premium: "سيارة فاخرة مضمونة، والسائق يعرف الطريق جيداً.",
      price: "للرحلة", priceTbc: "يؤكد الفريق السعر عبر واتساب", arrival: "نقل الوصول", arrivalSub: "من المطار إلى الرياض",
      name: "اسم الضيف", namePh: "الاسم الكامل", people: "عدد الأشخاص", flight: "رقم الرحلة الجوية", flightPh: "مثال: AT 800", date: "تاريخ الوصول", time: "وقت الوصول",
      round: "ذهاب وإياب", roundSub: "إضافة نقل العودة إلى المطار", back: "نقل العودة", backSub: "من الرياض إلى المطار",
      backFlight: "رقم رحلة العودة", backDate: "تاريخ المغادرة", backTime: "وقت المغادرة من الرياض",
      trips: ["رحلة واحدة", "رحلتان"], total: "المجموع", send: "إرسال عبر واتساب", missing: "يرجى إكمال: ", confirm: "يؤكد الفريق النقل وسعره عبر واتساب.", add: "إضافة", remove: "حذف" }
  };
  var LANG_FR = { fr: "français", en: "anglais", es: "espagnol", de: "allemand", ar: "arabe" };

  var state = { name: "", phone: "", people: 1, flight: "", date: "", time: "", round: false, backFlight: "", backDate: "", backTime: "", error: "", busy: false };
  /* Pré-remplissage depuis le check-in en ligne (nom, voyageurs, dates, heure de départ). */
  var guest = RT.getGuest();
  if (guest) {
    state.name = ((guest.first || "") + " " + (guest.last || "")).trim(); state.phone = guest.mobile || ""; state.people = Math.max(1, Number(guest.people) || 1);
    state.date = guest.arrival || ""; state.backDate = guest.departure || ""; state.backTime = guest.checkout || "";
  }
  function trips() { return state.round ? 2 : 1; }
  /* Prix d'un trajet selon son heure ("HH:MM"), null si l'heure n'est pas encore saisie. */
  function legPrice(time) {
    var m = /^(\d{1,2}):/.exec(time || ""); if (!m) return null;
    var hour = Number(m[1]); return hour >= DAY_START && hour < NIGHT_START ? DAY_MAD : NIGHT_MAD;
  }
  function legs() { var l = [legPrice(state.time)]; if (state.round) l.push(legPrice(state.backTime)); return l; }
  function totalText(lang, t) {
    var l = legs(); if (l.some(function (x) { return x === null; })) return t.priceWait;
    return t.total + " : " + l.reduce(function (a, b) { return a + b; }, 0) + " " + RT.UI[lang].mad;
  }

  function field(key, label, type, extra) {
    return '<label class="field"><span>' + esc(label) + '</span><input type="' + type + '" data-key="' + key + '" value="' + esc(state[key]) + '"' + (extra || "") + "></label>";
  }
  var FLIGHT_ATTR = ' autocapitalize="characters" autocomplete="off" spellcheck="false"';

  function render(lang) {
    var t = T[lang], h = "";
    h += RT.subHeader(lang, t.header);
    h += RT.pageHero(t.eyebrow, t.h1, t.intro);
    h += '<div class="price-badges"><div class="price-badge"><strong><bdi>' + DAY_MAD + " " + esc(RT.UI[lang].mad) + "</bdi></strong><span>" + esc(t.dayLabel) + '</span></div><div class="price-badge night"><strong><bdi>' + NIGHT_MAD + " " + esc(RT.UI[lang].mad) + "</bdi></strong><span>" + esc(t.nightLabel) + '</span></div></div><p class="premium-line">' + esc(t.premium) + "</p>";
    h += '<form class="sheet form" novalidate>';
    h += '<div class="category"><p class="eyebrow">' + esc(t.arrivalSub) + "</p><h2>" + esc(t.arrival) + '</h2><div class="fields two">' +
      field("flight", t.flight, "text", ' placeholder="' + esc(t.flightPh) + '"' + FLIGHT_ATTR) +
      '<div class="field"><span>' + esc(t.people) + '</span><div class="stepper big"><button type="button" data-people="-1" aria-label="' + esc(t.remove) + '"' + (state.people > 1 ? "" : " disabled") + '>−</button><output data-people-out aria-live="polite">' + state.people + '</output><button type="button" data-people="1" aria-label="' + esc(t.add) + '">+</button></div></div>' +
      field("date", t.date, "date") + field("time", t.time, "time") + '</div><div class="fields' + (RT.stayToken() ? "" : " two") + '">' + field("name", t.name, "text", ' placeholder="' + esc(t.namePh) + '" autocomplete="name"') +
      (RT.stayToken() ? "" : field("phone", RT.UI[lang].phone, "tel", ' placeholder="' + esc(RT.UI[lang].phonePh) + '" autocomplete="tel" inputmode="tel"')) + "</div></div>";
    h += '<div class="category"><label class="switch-row"><span><strong>' + esc(t.round) + "</strong><small>" + esc(t.roundSub) + '</small></span><input type="checkbox" data-round' + (state.round ? " checked" : "") + '><i aria-hidden="true"></i></label>' +
      '<div class="return-block"' + (state.round ? "" : " hidden") + '><p class="eyebrow">' + esc(t.backSub) + "</p><h2>" + esc(t.back) + '</h2><div class="fields two">' +
      field("backFlight", t.backFlight, "text", ' placeholder="' + esc(t.flightPh) + '"' + FLIGHT_ATTR) + field("backDate", t.backDate, "date") + field("backTime", t.backTime, "time") + "</div></div>" +
      '<p class="note">' + esc(t.confirm) + "</p></div></form>";
    h += '<div class="submit-bar"><div><span data-trips>' + esc(t.trips[trips() - 1]) + '</span><strong data-total>' + esc(totalText(lang, t)) + '</strong><em class="form-error" data-error role="alert">' + esc(state.error) + "</em></div>" +
      '<button type="button" class="button button-solid" data-send' + (state.busy ? " disabled" : "") + ">" + esc(state.busy ? RT.UI[lang].sending : RT.API.base ? RT.UI[lang].sendApi : t.send) + "</button></div>";
    h += '<div class="bottom-action"><div class="button-stack">' + RT.contactButtons(lang) + "</div></div>";
    return h;
  }

  function when(d, tm) { return [d ? RT.frDate(d) : "", tm ? "à " + tm : ""].filter(Boolean).join(" "); }

  /* Message pour l'équipe, ordre fixe : transfert, vol, arrivée, personnes, nom. */
  function buildMessage(lang) {
    var L = ["Bonjour, je souhaite réserver un transfert privé avec le Riad Kasbah La Moun.", "", "*Transfert arrivée*",
      "Numéro de vol : " + state.flight.trim().toUpperCase(), "Arrivée : " + when(state.date, state.time),
      "Nombre de personnes : " + state.people, "Nom : " + state.name.trim()];
    if (state.round) L.push("", "*Transfert retour*", "Numéro de vol : " + state.backFlight.trim().toUpperCase(), "Départ du riad : " + when(state.backDate, state.backTime));
    var l = legs(), parts = ["arrivée " + l[0] + " MAD"];
    if (state.round) parts.push("retour " + l[1] + " MAD");
    L.push("", "Prix : " + parts.join(" + ") + (state.round ? " = " + (l[0] + l[1]) + " MAD" : "") + " (transfert privé, 200 MAD de 8h à 20h, 300 MAD de 20h à 8h)");
    if (lang !== "fr") L.push("Langue du client : " + LANG_FR[lang]);
    return L.join("\n");
  }

  function missing(t, ui) {
    var m = [];
    if (!state.flight.trim()) m.push(t.flight);
    if (!state.date) m.push(t.date);
    if (!state.time) m.push(t.time);
    if (!state.name.trim()) m.push(t.name);
    if (RT.API.base && !RT.stayToken() && !state.phone.trim()) m.push(ui.phone);
    if (state.round) { if (!state.backFlight.trim()) m.push(t.backFlight); if (!state.backDate) m.push(t.backDate); if (!state.backTime) m.push(t.backTime); }
    return m;
  }

  var root = document.getElementById("app");
  function refresh() {
    var lang = RT.getLang(), t = T[lang];
    var a = root.querySelector("[data-trips]"), b = root.querySelector("[data-total]"), e = root.querySelector("[data-error]"), s = root.querySelector("[data-send]");
    if (a) a.textContent = t.trips[trips() - 1];
    if (b) b.textContent = totalText(lang, t);
    if (e) e.textContent = state.error;
    if (s) { s.disabled = state.busy; s.textContent = state.busy ? RT.UI[lang].sending : RT.API.base ? RT.UI[lang].sendApi : t.send; }
  }
  function openWa(url) { var w = window.open(url, "_blank"); if (!w) { window.location.href = url; return false; } return true; }
  /* Fenêtre après envoi. orderId : référence renvoyée par le serveur (null en mode WhatsApp seul). */
  function sentModal(lang, t, orderId, url) {
    var ui = RT.UI[lang], h = '<button type="button" class="modal-close" data-close aria-label="×">×</button>' + RT.logoMark("modal-mark");
    if (orderId) {
      h += "<h2>" + esc(ui.saved) + "</h2><p>" + esc(ui.savedText) + '</p><p class="note">' + esc(ui.ref) + " : <b>" + esc(orderId) + "</b></p>";
    } else h += "<h2>" + esc(t.sentTitle) + "</h2><p>" + esc(t.sentText) + "</p>";
    h += RT.upsell(lang, guest && guest.purpose) + '<div class="modal-actions">';
    if (orderId && RT.API.alsoWhatsApp) h += '<a class="button button-solid" href="' + esc(url) + '" target="_blank" rel="noreferrer">' + esc(ui.alsoWa) + "</a>";
    if (orderId && RT.stayToken()) h += '<a class="button button-line" href="/mon-sejour/">' + esc(ui.myStay) + "</a>";
    h += '<a class="button button-line" href="/">' + esc(t.finish) + "</a></div>";
    RT.openModal(h);
  }
  root.addEventListener("click", function (ev) {
    var s = ev.target.closest && ev.target.closest("[data-people]");
    if (s) {
      state.people = Math.max(1, Math.min(20, state.people + Number(s.getAttribute("data-people"))));
      root.querySelector("[data-people-out]").textContent = state.people;
      root.querySelector('[data-people="-1"]').disabled = state.people <= 1;
      return;
    }
    if (ev.target.closest && ev.target.closest("[data-send]")) {
      if (state.busy) return;
      var lang = RT.getLang(), t = T[lang], ui = RT.UI[lang], m = missing(t, ui);
      if (m.length) { state.error = t.missing + m.join(", "); refresh(); return; }
      state.error = ""; refresh();
      var msg = buildMessage(lang), url = RT.waLink(msg);
      if (!RT.API.base) { if (openWa(url)) sentModal(lang, t, null, url); return; }
      state.busy = true; refresh();
      var l = legs();
      var items = [{ key: "transfer-in", labelFr: "Transfert arrivée (aéroport → riad)", qty: 1, unitPriceMad: l[0], durationMin: 90 }];
      if (state.round) items.push({ key: "transfer-out", labelFr: "Transfert retour (riad → aéroport)", qty: 1, unitPriceMad: l[1], durationMin: 90 });
      RT.api("/order", { stayToken: RT.stayToken(), guest: { name: state.name.trim(), phone: state.phone.trim() }, kind: "transfer", lang: lang, message: msg, items: items,
        details: { flight: state.flight.trim().toUpperCase(), date: state.date, time: state.time, people: state.people, name: state.name.trim(), round: state.round,
          backFlight: state.backFlight.trim().toUpperCase(), backDate: state.backDate, backTime: state.backTime } })
        .then(function (r) { state.busy = false; refresh(); sentModal(lang, t, r.orderId, url); },
          function () { state.busy = false; state.error = ui.errApi; refresh(); openWa(url); });
    }
  });
  function onField(ev) {
    var el = ev.target;
    if (el.hasAttribute && el.hasAttribute("data-round")) {
      state.round = el.checked;
      var b = root.querySelector(".return-block"); if (b) b.hidden = !state.round;
      state.error = ""; refresh(); return;
    }
    var k = el.getAttribute && el.getAttribute("data-key");
    if (!k) return;
    state[k] = el.value;
    state.error = ""; refresh();
  }
  root.addEventListener("input", onField);
  root.addEventListener("change", onField);
  root.addEventListener("submit", function (e) { e.preventDefault(); });

  RT.buildTransferMessage = buildMessage;
  RT.mount({ render: render, title: function (l) { return T[l].title; } });
})();
