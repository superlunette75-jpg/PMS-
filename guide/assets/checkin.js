/* Riad Kasbah La Moun, check-in en ligne (reprend la fiche client papier).
   Envoi : fonction /checkin du serveur (RT.API.base), qui enregistre le séjour, recopie la fiche dans la Google Sheet
   et prévient la réception. Le serveur renvoie un jeton de séjour, gardé sur le téléphone pour les commandes suivantes.
   Sans serveur configuré, la fiche part sur WhatsApp.
   Après l'envoi : pop-up de bienvenue, puis transfert (pré-rempli) ou retour au guide. */
(function () {
  "use strict";
  var esc = RT.esc;

  var PURPOSES = ["leisure", "honeymoon", "birthday", "business", "other"];
  var SOURCES = ["booking", "google", "instagram", "recommendation", "agency", "other"];
  var PURPOSE_FR = { leisure: "Vacances", honeymoon: "Lune de miel", birthday: "Anniversaire", business: "Affaires", other: "Autre" };
  var SOURCE_FR = { booking: "Booking.com", google: "Google", instagram: "Instagram", recommendation: "Recommandation", agency: "Agence", other: "Autre" };
  var LANG_FR = { fr: "français", en: "anglais", es: "espagnol", de: "allemand", ar: "arabe" };

  var T = {
    fr: { title: "Riad Kasbah La Moun | Check-in en ligne", header: "Check-in en ligne", eyebrow: "À compléter avant votre arrivée • 2 minutes", h1: "Votre check-in",
      intro: "Remplissez votre fiche client maintenant : à votre arrivée, plus de papiers, votre suite vous attend.",
      s1: "Vos coordonnées", s2: "Votre séjour", s3: "Pour mieux vous recevoir",
      first: "Prénom", last: "Nom", nationality: "Nationalité", country: "Pays de résidence", city: "Ville", email: "E-mail", mobile: "Mobile (WhatsApp)", mobilePh: "+33 6 12 34 56 78",
      people: "Nombre de voyageurs", arrival: "Date d'arrivée", departure: "Date de départ", checkout: "Heure de départ du riad (estimée)", flightOut: "Heure de votre vol retour, si applicable",
      transfer: "Souhaitez-vous un transfert aéroport ?", yes: "Oui", no: "Non", maybe: "Je ne sais pas encore",
      purpose: "Motif du séjour", purposes: ["Vacances", "Lune de miel", "Anniversaire", "Affaires", "Autre"], otherPh: "Précisez",
      source: "Comment avez-vous connu Kasbah La Moun ?", sources: ["Booking.com", "Google", "Instagram", "Recommandation", "Agence", "Autre"],
      offers: "Être prévenu de nos offres privées", offersSub: "Par e-mail, quelques fois par an : tarifs réservés aux anciens hôtes et invitations à nos soirées. Désinscription en un clic.",
      consent: "Je certifie que ces informations sont exactes. Elles servent uniquement à préparer mon séjour.",
      bar: "2 minutes • Données confidentielles", send: "Valider mon check-in", sending: "Envoi…", missing: "À compléter : ", errEmail: "L'adresse e-mail semble incorrecte.", errDates: "La date de départ doit suivre la date d'arrivée.", errConsent: "Merci de cocher la case de confirmation.", errSend: "L'envoi a échoué. Vérifiez votre connexion et réessayez.",
      thanks: "Merci, ", welcome: "Bienvenue à Kasbah La Moun", received: "Votre check-in est bien reçu. Nous préparons votre arrivée.", waNote: "Votre fiche s'est ouverte dans WhatsApp : appuyez sur Envoyer pour la transmettre à l'équipe.",
      transferTitle: "Un chauffeur vous attend à l'aéroport ?", transferText: "Transfert privé en véhicule Premium : 200 MAD de 8h à 20h, 300 MAD de 20h à 8h.", toTransfer: "Organiser mon transfert", later: "Retour au guide" },
    en: { title: "Riad Kasbah La Moun | Online check-in", header: "Online check-in", eyebrow: "To complete before you arrive • 2 minutes", h1: "Your check-in",
      intro: "Fill in your guest form now: no paperwork when you arrive, your suite is ready for you.",
      s1: "Your details", s2: "Your stay", s3: "To welcome you better",
      first: "First name", last: "Last name", nationality: "Nationality", country: "Country of residence", city: "City", email: "Email", mobile: "Mobile (WhatsApp)", mobilePh: "+44 7700 900123",
      people: "Number of guests", arrival: "Arrival date", departure: "Departure date", checkout: "Estimated check-out time", flightOut: "Departure flight time, if applicable",
      transfer: "Would you like an airport transfer?", yes: "Yes", no: "No", maybe: "Not sure yet",
      purpose: "Purpose of your stay", purposes: ["Leisure", "Honeymoon", "Birthday", "Business", "Other"], otherPh: "Please specify",
      source: "How did you discover Kasbah La Moun?", sources: ["Booking.com", "Google", "Instagram", "Recommendation", "Agency", "Other"],
      offers: "Hear about our private offers", offersSub: "By email, a few times a year: rates reserved for past guests and invitations to our evenings. Unsubscribe in one click.",
      consent: "I confirm this information is accurate. It is only used to prepare my stay.",
      bar: "2 minutes • Kept confidential", send: "Complete my check-in", sending: "Sending…", missing: "Please fill in: ", errEmail: "The email address looks incorrect.", errDates: "The departure date must come after the arrival date.", errConsent: "Please tick the confirmation box.", errSend: "Sending failed. Check your connection and try again.",
      thanks: "Thank you, ", welcome: "Welcome to Kasbah La Moun", received: "Your check-in has been received. We are preparing your arrival.", waNote: "Your form opened in WhatsApp: tap Send to pass it to the team.",
      transferTitle: "A driver waiting for you at the airport?", transferText: "Private transfer in a Premium vehicle: 200 MAD from 8 am to 8 pm, 300 MAD from 8 pm to 8 am.", toTransfer: "Arrange my transfer", later: "Back to the guide" },
    es: { title: "Riad Kasbah La Moun | Check-in online", header: "Check-in online", eyebrow: "Para completar antes de tu llegada • 2 minutos", h1: "Tu check-in",
      intro: "Rellena ahora tu ficha de cliente: a tu llegada, sin papeles, tu suite te espera.",
      s1: "Tus datos", s2: "Tu estancia", s3: "Para recibirte mejor",
      first: "Nombre", last: "Apellido", nationality: "Nacionalidad", country: "País de residencia", city: "Ciudad", email: "Correo", mobile: "Móvil (WhatsApp)", mobilePh: "+34 612 34 56 78",
      people: "Número de viajeros", arrival: "Fecha de llegada", departure: "Fecha de salida", checkout: "Hora estimada de salida del riad", flightOut: "Hora de tu vuelo de regreso, si procede",
      transfer: "¿Deseas un traslado al aeropuerto?", yes: "Sí", no: "No", maybe: "Aún no lo sé",
      purpose: "Motivo de la estancia", purposes: ["Vacaciones", "Luna de miel", "Cumpleaños", "Negocios", "Otro"], otherPh: "Especifica",
      source: "¿Cómo conociste Kasbah La Moun?", sources: ["Booking.com", "Google", "Instagram", "Recomendación", "Agencia", "Otro"],
      offers: "Recibir nuestras ofertas privadas", offersSub: "Por correo, unas pocas veces al año: tarifas reservadas a antiguos huéspedes e invitaciones a nuestras veladas. Baja en un clic.",
      consent: "Certifico que estos datos son correctos. Solo sirven para preparar mi estancia.",
      bar: "2 minutos • Datos confidenciales", send: "Validar mi check-in", sending: "Enviando…", missing: "Completa: ", errEmail: "El correo parece incorrecto.", errDates: "La fecha de salida debe ser posterior a la de llegada.", errConsent: "Marca la casilla de confirmación.", errSend: "El envío ha fallado. Revisa tu conexión e inténtalo de nuevo.",
      thanks: "Gracias, ", welcome: "Bienvenido a Kasbah La Moun", received: "Hemos recibido tu check-in. Preparamos tu llegada.", waNote: "Tu ficha se ha abierto en WhatsApp: pulsa Enviar para transmitirla al equipo.",
      transferTitle: "¿Un chófer esperándote en el aeropuerto?", transferText: "Traslado privado en vehículo Premium: 200 MAD de 8:00 a 20:00, 300 MAD de 20:00 a 8:00.", toTransfer: "Organizar mi traslado", later: "Volver a la guía" },
    de: { title: "Riad Kasbah La Moun | Online-Check-in", header: "Online-Check-in", eyebrow: "Vor Ihrer Ankunft ausfüllen • 2 Minuten", h1: "Ihr Check-in",
      intro: "Füllen Sie Ihr Gästeformular jetzt aus: bei der Ankunft kein Papierkram, Ihre Suite erwartet Sie.",
      s1: "Ihre Angaben", s2: "Ihr Aufenthalt", s3: "Damit wir Sie besser empfangen",
      first: "Vorname", last: "Nachname", nationality: "Staatsangehörigkeit", country: "Wohnsitzland", city: "Stadt", email: "E-Mail", mobile: "Mobil (WhatsApp)", mobilePh: "+49 151 23456789",
      people: "Anzahl Reisende", arrival: "Ankunftsdatum", departure: "Abreisedatum", checkout: "Geschätzte Abreisezeit vom Riad", flightOut: "Uhrzeit Ihres Rückflugs, falls zutreffend",
      transfer: "Möchten Sie einen Flughafentransfer?", yes: "Ja", no: "Nein", maybe: "Noch nicht sicher",
      purpose: "Anlass des Aufenthalts", purposes: ["Urlaub", "Flitterwochen", "Geburtstag", "Geschäftlich", "Sonstiges"], otherPh: "Bitte angeben",
      source: "Wie haben Sie Kasbah La Moun entdeckt?", sources: ["Booking.com", "Google", "Instagram", "Empfehlung", "Reisebüro", "Sonstiges"],
      offers: "Über private Angebote informiert werden", offersSub: "Per E-Mail, wenige Male im Jahr: Preise für frühere Gäste und Einladungen zu unseren Abenden. Abmeldung mit einem Klick.",
      consent: "Ich bestätige, dass diese Angaben korrekt sind. Sie dienen nur der Vorbereitung meines Aufenthalts.",
      bar: "2 Minuten • Vertraulich", send: "Check-in abschließen", sending: "Senden…", missing: "Bitte ausfüllen: ", errEmail: "Die E-Mail-Adresse scheint falsch zu sein.", errDates: "Das Abreisedatum muss nach dem Ankunftsdatum liegen.", errConsent: "Bitte bestätigen Sie das Kästchen.", errSend: "Senden fehlgeschlagen. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      thanks: "Danke, ", welcome: "Willkommen in der Kasbah La Moun", received: "Ihr Check-in ist eingegangen. Wir bereiten Ihre Ankunft vor.", waNote: "Ihr Formular wurde in WhatsApp geöffnet: tippen Sie auf Senden, um es dem Team zu schicken.",
      transferTitle: "Ein Fahrer, der am Flughafen wartet?", transferText: "Privater Transfer im Premium-Fahrzeug: 200 MAD von 8 bis 20 Uhr, 300 MAD von 20 bis 8 Uhr.", toTransfer: "Transfer organisieren", later: "Zurück zum Guide" },
    ar: { title: "رياض قصبة لا مون | تسجيل الوصول عبر الإنترنت", header: "تسجيل الوصول", eyebrow: "يُملأ قبل وصولكم • دقيقتان", h1: "تسجيل وصولكم",
      intro: "املؤوا بطاقة الضيف الآن: لا أوراق عند الوصول، وجناحكم في انتظاركم.",
      s1: "معلوماتكم", s2: "إقامتكم", s3: "لنستقبلكم بشكل أفضل",
      first: "الاسم", last: "اللقب", nationality: "الجنسية", country: "بلد الإقامة", city: "المدينة", email: "البريد الإلكتروني", mobile: "الهاتف (واتساب)", mobilePh: "+212 6 12 34 56 78",
      people: "عدد المسافرين", arrival: "تاريخ الوصول", departure: "تاريخ المغادرة", checkout: "وقت المغادرة من الرياض (تقريبي)", flightOut: "وقت رحلة العودة، إن وجدت",
      transfer: "هل ترغبون في نقل من المطار؟", yes: "نعم", no: "لا", maybe: "لم أقرر بعد",
      purpose: "سبب الإقامة", purposes: ["عطلة", "شهر العسل", "عيد ميلاد", "عمل", "آخر"], otherPh: "يرجى التوضيح",
      source: "كيف تعرّفتم على قصبة لا مون؟", sources: ["Booking.com", "Google", "Instagram", "توصية", "وكالة", "آخر"],
      offers: "تلقّي عروضنا الخاصة", offersSub: "عبر البريد الإلكتروني، بضع مرات في السنة: أسعار مخصّصة للضيوف السابقين ودعوات إلى أمسياتنا. إلغاء الاشتراك بنقرة.",
      consent: "أؤكد صحة هذه المعلومات. تُستخدم فقط لتحضير إقامتي.",
      bar: "دقيقتان • بيانات سرية", send: "تأكيد تسجيل الوصول", sending: "جارٍ الإرسال…", missing: "يرجى إكمال: ", errEmail: "يبدو أن البريد الإلكتروني غير صحيح.", errDates: "يجب أن يكون تاريخ المغادرة بعد تاريخ الوصول.", errConsent: "يرجى تحديد خانة التأكيد.", errSend: "فشل الإرسال. تحقّقوا من الاتصال وأعيدوا المحاولة.",
      thanks: "شكراً، ", welcome: "مرحباً بكم في قصبة لا مون", received: "تم استلام تسجيل وصولكم. نحن نحضّر لوصولكم.", waNote: "فُتحت بطاقتكم في واتساب: اضغطوا إرسال لإيصالها إلى الفريق.",
      transferTitle: "سائق في انتظاركم بالمطار؟", transferText: "نقل خاص بسيارة فاخرة: 200 درهم من 8:00 إلى 20:00، و300 درهم من 20:00 إلى 8:00.", toTransfer: "نظّم نقلي", later: "العودة إلى الدليل" }
  };

  var g0 = RT.getGuest() || {};
  var state = { first: g0.first || "", last: g0.last || "", nationality: g0.nationality || "", country: g0.country || "", city: g0.city || "",
    email: g0.email || "", mobile: g0.mobile || "", people: g0.people || 2, arrival: g0.arrival || "", departure: g0.departure || "",
    checkout: g0.checkout || "", flightOut: g0.flightOut || "", transfer: g0.transfer || "", purpose: g0.purpose || "", purposeOther: g0.purposeOther || "",
    source: g0.source || "", sourceOther: g0.sourceOther || "", offers: !!g0.offers, consent: false, trap: "", error: "", busy: false, stayToken: g0.stayToken || "" };

  function field(key, label, type, extra, cls) {
    return '<label class="field' + (cls ? " " + cls : "") + '"><span>' + esc(label) + '</span><input type="' + type + '" data-key="' + key + '" value="' + esc(state[key]) + '"' + (extra || "") + "></label>";
  }
  function choices(key, values, labels) {
    return '<div class="choices" role="radiogroup">' + values.map(function (v, i) {
      return '<label class="choice"><input type="radio" name="' + key + '" value="' + v + '" data-choice="' + key + '"' + (state[key] === v ? " checked" : "") + "><span>" + esc(labels[i]) + "</span></label>";
    }).join("") + "</div>";
  }

  function render(lang) {
    var t = T[lang], h = "";
    h += RT.subHeader(lang, t.header);
    h += RT.pageHero(t.eyebrow, t.h1, t.intro);
    h += '<form class="sheet form" novalidate autocomplete="on">';
    h += '<div class="category"><h2>' + esc(t.s1) + '</h2><div class="fields two">' +
      field("first", t.first, "text", ' autocomplete="given-name" required') + field("last", t.last, "text", ' autocomplete="family-name" required') +
      field("nationality", t.nationality, "text", ' required') + field("country", t.country, "text", ' autocomplete="country-name"') +
      field("email", t.email, "email", ' autocomplete="email" inputmode="email" required') + field("mobile", t.mobile, "tel", ' autocomplete="tel" inputmode="tel" placeholder="' + esc(t.mobilePh) + '" required') +
      field("city", t.city, "text", ' autocomplete="address-level2"') + "</div>" +
      '<label class="trap" aria-hidden="true">Site<input type="text" tabindex="-1" autocomplete="off" data-key="trap"></label></div>';
    h += '<div class="category"><h2>' + esc(t.s2) + '</h2><div class="fields two">' +
      field("arrival", t.arrival, "date", " required") + field("departure", t.departure, "date", " required") +
      '<div class="field"><span>' + esc(t.people) + '</span><div class="stepper big"><button type="button" data-people="-1" aria-label="−"' + (state.people > 1 ? "" : " disabled") + '>−</button><output data-people-out aria-live="polite">' + state.people + '</output><button type="button" data-people="1" aria-label="+">+</button></div></div>' +
      field("checkout", t.checkout, "time") + field("flightOut", t.flightOut, "time") + "</div>" +
      '<div class="field choice-field"><span>' + esc(t.transfer) + "</span>" + choices("transfer", ["yes", "no", "maybe"], [t.yes, t.no, t.maybe]) + "</div></div>";
    h += '<div class="category"><h2>' + esc(t.s3) + "</h2>" +
      '<div class="field choice-field"><span>' + esc(t.purpose) + "</span>" + choices("purpose", PURPOSES, t.purposes) +
      '<div class="reveal" data-reveal="purpose"' + (state.purpose === "other" ? "" : " hidden") + ">" + field("purposeOther", t.otherPh, "text", "", "sr-label") + "</div></div>" +
      '<div class="field choice-field"><span>' + esc(t.source) + "</span>" + choices("source", SOURCES, t.sources) +
      '<div class="reveal" data-reveal="source"' + (state.source === "other" ? "" : " hidden") + ">" + field("sourceOther", t.otherPh, "text", "", "sr-label") + "</div></div>" +
      '<label class="switch-row offers-row"><span><strong>' + esc(t.offers) + "</strong><small>" + esc(t.offersSub) + '</small></span><input type="checkbox" data-offers' + (state.offers ? " checked" : "") + '><i aria-hidden="true"></i></label>' +
      '<label class="consent"><input type="checkbox" data-consent' + (state.consent ? " checked" : "") + "><span>" + esc(t.consent) + "</span></label></div>";
    h += "</form>";
    h += '<div class="submit-bar"><div><span>' + esc(t.bar) + '</span><em class="form-error" data-error role="alert">' + esc(state.error) + "</em></div>" +
      '<button type="button" class="button button-solid" data-send' + (state.busy ? " disabled" : "") + ">" + esc(state.busy ? t.sending : t.send) + "</button></div>";
    h += '<div class="bottom-action"><div class="button-stack">' + RT.contactButtons(lang) + "</div></div>";
    return h;
  }

  function validate(t) {
    var m = [];
    [["first", t.first], ["last", t.last], ["nationality", t.nationality], ["email", t.email], ["mobile", t.mobile], ["arrival", t.arrival], ["departure", t.departure]]
      .forEach(function (x) { if (!String(state[x[0]]).trim()) m.push(x[1]); });
    if (m.length) return { msg: t.missing + m.join(", "), key: null };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email.trim())) return { msg: t.errEmail, key: "email" };
    if (state.departure <= state.arrival) return { msg: t.errDates, key: "departure" };
    if (!state.consent) return { msg: t.errConsent, key: null };
    return null;
  }

  function fullName() { return (state.first.trim() + " " + state.last.trim()).trim(); }
  function purposeText() { return state.purpose === "other" ? "Autre : " + state.purposeOther.trim() : PURPOSE_FR[state.purpose] || ""; }
  function sourceText() { return state.source === "other" ? "Autre : " + state.sourceOther.trim() : SOURCE_FR[state.source] || ""; }
  var TRANSFER_FR = { yes: "Oui", no: "Non", maybe: "Pas encore décidé" };

  /* Une ligne de la Google Sheet. Les clés deviennent les en-têtes des colonnes. */
  function payload(lang) {
    return {
      "Prénom": state.first.trim(), "Nom": state.last.trim(), "Nationalité": state.nationality.trim(), "Pays": state.country.trim(), "Ville": state.city.trim(),
      "E-mail": state.email.trim(), "Mobile": state.mobile.trim(), "Voyageurs": state.people,
      "Arrivée": state.arrival, "Départ": state.departure, "Heure départ riad": state.checkout, "Heure du vol": state.flightOut,
      "Transfert aéroport": TRANSFER_FR[state.transfer] || "", "Motif du séjour": purposeText(), "Connu via": sourceText(),
      "Offres privées": state.offers ? "Oui" : "Non", "Langue": LANG_FR[lang], "Certifié exact": "Oui"
    };
  }
  function waMessage(lang) {
    var p = payload(lang), L = ["Bonjour, voici mon check-in en ligne pour le Riad Kasbah La Moun.", "", "*CHECK-IN EN LIGNE*"];
    Object.keys(p).forEach(function (k) {
      var v = p[k]; if (v === "" || k === "Certifié exact") return;
      if (k === "Arrivée" || k === "Départ") v = RT.frDate(v);
      L.push(k + " : " + v);
    });
    return L.join("\n");
  }

  function send(lang) {
    if (!RT.API.base) {
      var url = RT.waLink(waMessage(lang)), w = window.open(url, "_blank");
      if (!w) { remember(); window.location.href = url; return Promise.resolve("wa-redirect"); }
      return Promise.resolve("wa");
    }
    var guest = { first: state.first, last: state.last, nationality: state.nationality, country: state.country, city: state.city, email: state.email, mobile: state.mobile,
      people: state.people, arrival: state.arrival, departure: state.departure, checkout: state.checkout, flightOut: state.flightOut, transfer: state.transfer,
      purpose: state.purpose, purposeOther: state.purposeOther, source: state.source, sourceOther: state.sourceOther, offers: state.offers, lang: lang, trap: state.trap };
    return RT.api("/checkin", { guest: guest, sheet: payload(lang), stayToken: state.stayToken }).then(function (r) {
      if (r.stayToken) state.stayToken = r.stayToken;
      return "api";
    });
  }

  function remember() {
    RT.saveGuest({ first: state.first.trim(), last: state.last.trim(), nationality: state.nationality.trim(), country: state.country.trim(), city: state.city.trim(),
      email: state.email.trim(), mobile: state.mobile.trim(), people: state.people, arrival: state.arrival, departure: state.departure, checkout: state.checkout,
      flightOut: state.flightOut, transfer: state.transfer, purpose: state.purpose, purposeOther: state.purposeOther, source: state.source, sourceOther: state.sourceOther,
      offers: state.offers, done: true, stayToken: state.stayToken || "" });
  }

  function thankYou(lang, via) {
    var t = T[lang], h = '<button type="button" class="modal-close" data-close aria-label="×">×</button>' + RT.logoMark("modal-mark") +
      '<p class="eyebrow">' + esc(t.thanks + state.first.trim()) + "</p><h2>" + esc(t.welcome) + "</h2><p>" + esc(t.received) + "</p>" +
      (via === "wa" ? '<p class="note">' + esc(t.waNote) + "</p>" : "");
    if (state.transfer === "no") {
      h += RT.upsell(lang, state.purpose) + '<div class="modal-actions"><a class="button button-line" href="/">' + esc(t.later) + "</a></div>";
    } else {
      h += '<div class="modal-offer">' + RT.icon("car") + "<div><strong>" + esc(t.transferTitle) + "</strong><p>" + esc(t.transferText) + "</p></div></div>" +
        '<div class="modal-actions"><a class="button button-solid" href="/transfert/">' + esc(t.toTransfer) + ' <span aria-hidden="true">→</span></a><a class="button button-line" href="/">' + esc(t.later) + "</a></div>";
    }
    RT.openModal(h, function () { window.location.href = "/"; });
  }

  var root = document.getElementById("app");
  function refresh() {
    var lang = RT.getLang(), t = T[lang], e = root.querySelector("[data-error]"), b = root.querySelector("[data-send]");
    if (e) e.textContent = state.error;
    if (b) { b.disabled = state.busy; b.textContent = state.busy ? t.sending : t.send; }
  }
  root.addEventListener("click", function (ev) {
    var s = ev.target.closest && ev.target.closest("[data-people]");
    if (s) {
      state.people = Math.max(1, Math.min(20, state.people + Number(s.getAttribute("data-people"))));
      root.querySelector("[data-people-out]").textContent = state.people;
      root.querySelector('[data-people="-1"]').disabled = state.people <= 1;
      return;
    }
    if (!(ev.target.closest && ev.target.closest("[data-send]")) || state.busy) return;
    var lang = RT.getLang(), t = T[lang], err = validate(t);
    if (err) {
      state.error = err.msg; refresh();
      if (err.key) { var f = root.querySelector('[data-key="' + err.key + '"]'); if (f) f.focus(); }
      return;
    }
    if (state.trap) { thankYou(lang, "sheet"); return; } /* robot : on ne transmet rien */
    state.error = ""; state.busy = true; refresh();
    send(lang).then(function (via) {
      state.busy = false; refresh();
      if (via === "wa-redirect") return;
      remember(); thankYou(lang, via);
    }, function () { state.busy = false; state.error = t.errSend; refresh(); });
  });
  function onField(ev) {
    var el = ev.target;
    if (el.hasAttribute && el.hasAttribute("data-choice")) {
      var k = el.getAttribute("data-choice"); state[k] = el.value;
      var r = root.querySelector('[data-reveal="' + k + '"]'); if (r) r.hidden = el.value !== "other";
    } else if (el.hasAttribute && el.hasAttribute("data-offers")) state.offers = el.checked;
    else if (el.hasAttribute && el.hasAttribute("data-consent")) state.consent = el.checked;
    else { var key = el.getAttribute && el.getAttribute("data-key"); if (!key) return; state[key] = el.value; }
    if (state.error) { state.error = ""; refresh(); }
  }
  root.addEventListener("input", onField);
  root.addEventListener("change", onField);
  root.addEventListener("submit", function (e) { e.preventDefault(); });

  RT.checkinPayload = payload; RT.checkinState = state;
  RT.mount({ render: render, title: function (l) { return T[l].title; } });
})();
