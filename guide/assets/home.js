/* Riad Kasbah La Moun, accueil du guide de bienvenue. */
(function () {
  "use strict";
  var esc = RT.esc;

  var MAPS = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Riad Kasbah La Moun, 198 Tarik Dar Al Makhzen, Marrakech");
  var TILE_LINKS = ["/transfert/", "/restaurant/", "/spa/", "/marrakech/"];
  var TILE_ICONS = ["car", "food", "lotus", "compass"];
  var FEATURE_ICONS = ["bed", "pin", "car", "pool", "cup"];
  var SUITE_ICONS = ["cup", "drop", "snow", "dryer", "safe"];

  /* Icônes propres à l'accueil (même trait que celles de common.js). */
  var EXTRA = {
    bed: '<path d="M3 18v-8"/><path d="M21 18v-5a3 3 0 0 0-3-3h-7v6"/><path d="M3 16h18"/><circle cx="7" cy="12.5" r="1.8"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    car: '<path d="M4 16.5v-3.2L6.2 8h11.6l2.2 5.3v3.2z"/><path d="M4 13.3h16"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/>',
    pool: '<path d="M8 15V5.5a2 2 0 0 1 4 0"/><path d="M14 15V5.5a2 2 0 0 1 4 0"/><path d="M8 9h6"/><path d="M3 18c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/>',
    cup: '<path d="M5 9h11v4.5A4.5 4.5 0 0 1 11.5 18h-2A4.5 4.5 0 0 1 5 13.5z"/><path d="M16 10.5h1.5a2 2 0 0 1 0 4H16"/><path d="M4 21h14"/><path d="M9 3.5c-.8.8-.8 1.7 0 2.5M12 3.5c-.8.8-.8 1.7 0 2.5"/>',
    drop: '<path d="M12 3.5s-5 5.6-5 9.5a5 5 0 0 0 10 0c0-3.9-5-9.5-5-9.5z"/><path d="M3 20.5c1.5.8 3 .8 4.5 0s3-.8 4.5 0 3 .8 4.5 0 3-.8 4.5 0"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
    dryer: '<path d="M5 7.5A4.5 4.5 0 0 1 9.5 3H14l2 2v5l-2 2H9.5A4.5 4.5 0 0 1 5 7.5z"/><circle cx="9.5" cy="7.5" r="1.6"/><path d="M8.5 12 7.5 20h3l1-8"/><path d="M18.5 6h2.5M18.5 9h2.5"/>',
    safe: '<rect x="3.5" y="4.5" width="17" height="14" rx="1.5"/><circle cx="10" cy="11.5" r="3"/><path d="M15.5 9h2M15.5 12h2M15.5 15h2M6 18.5v1.5M18 18.5v1.5"/>'
  };
  function ico(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + EXTRA[name] + "</svg>";
  }

  var T = {
    fr: {
      title: "Riad Kasbah La Moun | Guide de bienvenue",
      checkin: ["Obligatoire avant votre arrivée", "Check-in en ligne", "Deux minutes pour remplir votre fiche client\u00a0: nous traitons votre réservation plus vite et votre suite est prête à votre arrivée.", "Faire mon check-in"], checkinDone: ["Check-in effectué", "Merci, votre fiche est bien reçue. Il ne reste qu'à organiser votre arrivée.", "Organiser mon transfert", "Modifier ma fiche"],
      nav: ["Votre arrivée", "La table", "Spa", "Marrakech", "Réserver"],
      eyebrow: "Quartier royal de la Kasbah", h1: "Votre guide de bienvenue", sub: "Préparez votre venue, imaginez votre séjour.",
      features: ["8 suites seulement", "Quartier royal de la Kasbah", "Accès direct en voiture", "Piscine chauffée", "Petit-déjeuner jusqu'à midi"],
      tiles: [["Transfert privé", "Votre arrivée", "Véhicule Premium garanti. Le chauffeur maîtrise le trajet.", "Organiser mon transfert"], ["La table", "À notre table", "Le plaisir de prendre son temps.", "Découvrir la table"], ["Spa", "Hammam et massages", "Un spa privatisé pour deux.", "Découvrir les soins"], ["Notre Marrakech", "Découvrir Marrakech", "Nos adresses et expériences préférées.", "Explorer"]],
      bookCta: "Personnaliser mon séjour", practical: "Informations pratiques",
      welcomeEyebrow: "Take your time", welcomeTitle: "Une maison, un autre rythme",
      welcomeText: ["À Kasbah La Moun, prenez le temps de prolonger le thé, d'écouter l'eau des patios, de partager un dîner et de découvrir un Marrakech plus intime.", "Nous avons imaginé cette maison pour vous accueillir comme nous aimons recevoir : avec chaleur, générosité et une attention discrète."],
      signature: "Mouna, Nicolas et toute l'équipe vous attendent.",
      address: "Votre arrivée au riad", access: "Accès direct en voiture jusqu'à notre porte.", maps: "Ouvrir dans Google Maps",
      roomEyebrow: "Dans votre suite", roomTitle: "Votre confort, tout simplement",
      room: [["Mini-bar, café et thé", "De l'eau fraîche, un café ou un thé : prenez le temps d'une pause, dans l'intimité de votre suite."], ["L'eau du riad", "Notre eau est rendue potable grâce à un système de filtration et de traitement par UV. Vous pouvez la boire en toute confiance."], ["Climatisation", "Réglez la température de votre suite selon vos envies, pour des journées douces et des nuits paisibles."], ["Sèche-cheveux", "Un sèche-cheveux professionnel est à votre disposition dans le placard."], ["Coffre-fort", "Situé dans le placard, votre coffre-fort est à votre disposition. Nous vous recommandons d'y déposer vos objets de valeur."]],
      contactEyebrow: "Informations pratiques", contactTitle: "Contactez l'équipe", contactText: "Pour une réservation, un transfert ou une question, écrivez-nous sur WhatsApp ou appelez-nous.",
      contactLabels: ["WhatsApp (réservations)", "Téléphone", "E-mail", "Instagram"],
      footer: "Votre guide de bienvenue à Marrakech."
    },
    en: {
      title: "Riad Kasbah La Moun | Welcome guide",
      checkin: ["Required before you arrive", "Online check-in", "Two minutes to fill in your guest form: we process your booking faster and your suite is ready when you arrive.", "Do my check-in"], checkinDone: ["Check-in complete", "Thank you, your form has been received. All that's left is to plan your arrival.", "Arrange my transfer", "Edit my form"],
      nav: ["Your arrival", "Dining", "Spa", "Marrakech", "Book"],
      eyebrow: "Royal Kasbah quarter", h1: "Your welcome guide", sub: "Prepare your arrival, imagine your stay.",
      features: ["Only 8 suites", "Royal Kasbah quarter", "Direct car access", "Heated pool", "Breakfast until noon"],
      tiles: [["Private transfer", "Your arrival", "Premium vehicle guaranteed. Our driver knows the way.", "Arrange my transfer"], ["Dining", "At our table", "The pleasure of taking your time.", "Discover the table"], ["Spa", "Hammam and massages", "A private spa for two.", "Discover the treatments"], ["Our Marrakech", "Discover Marrakech", "Our favourite places and experiences.", "Explore"]],
      bookCta: "Personalise my stay", practical: "Practical information",
      welcomeEyebrow: "Take your time", welcomeTitle: "A house, another rhythm",
      welcomeText: ["At Kasbah La Moun, take time to linger over tea, listen to the water in the patios, share a dinner and discover a more intimate Marrakech.", "We imagined this house to welcome you the way we love to host: with warmth, generosity and discreet attention."],
      signature: "Mouna, Nicolas and the whole team look forward to welcoming you.",
      address: "Arriving at the riad", access: "Direct car access to our door.", maps: "Open in Google Maps",
      roomEyebrow: "In your suite", roomTitle: "Your comfort, simply",
      room: [["Mini-bar, coffee and tea", "Fresh water, a coffee or a tea: take a moment to pause in the privacy of your suite."], ["The riad's water", "Our water is made drinkable by a filtration and UV treatment system. You can drink it with complete confidence."], ["Air conditioning", "Set the temperature of your suite as you like, for gentle days and peaceful nights."], ["Hairdryer", "A professional hairdryer is available in the wardrobe."], ["Safe", "Your safe is in the wardrobe. We recommend keeping your valuables in it."]],
      contactEyebrow: "Practical information", contactTitle: "Contact the team", contactText: "For a booking, a transfer or a question, message us on WhatsApp or call us.",
      contactLabels: ["WhatsApp (bookings)", "Phone", "Email", "Instagram"],
      footer: "Your Marrakech welcome guide."
    },
    es: {
      title: "Riad Kasbah La Moun | Guía de bienvenida",
      checkin: ["Obligatorio antes de tu llegada", "Check-in online", "Dos minutos para rellenar tu ficha: tramitamos tu reserva más rápido y tu suite está lista a tu llegada.", "Hacer mi check-in"], checkinDone: ["Check-in completado", "Gracias, hemos recibido tu ficha. Solo queda organizar tu llegada.", "Organizar mi traslado", "Modificar mi ficha"],
      nav: ["Tu llegada", "La mesa", "Spa", "Marrakech", "Reservar"],
      eyebrow: "Barrio real de la Kasbah", h1: "Tu guía de bienvenida", sub: "Prepara tu llegada, imagina tu estancia.",
      features: ["Solo 8 suites", "Barrio real de la Kasbah", "Acceso directo en coche", "Piscina climatizada", "Desayuno hasta mediodía"],
      tiles: [["Traslado privado", "Tu llegada", "Vehículo Premium garantizado. El chófer conoce el camino.", "Organizar mi traslado"], ["La mesa", "En nuestra mesa", "El placer de tomarse su tiempo.", "Descubrir la mesa"], ["Spa", "Hammam y masajes", "Un spa privado para dos.", "Descubrir los tratamientos"], ["Nuestro Marrakech", "Descubrir Marrakech", "Nuestros lugares y experiencias favoritos.", "Explorar"]],
      bookCta: "Personalizar mi estancia", practical: "Información práctica",
      welcomeEyebrow: "Take your time", welcomeTitle: "Una casa, otro ritmo",
      welcomeText: ["En Kasbah La Moun, tómate el tiempo de alargar el té, escuchar el agua de los patios, compartir una cena y descubrir un Marrakech más íntimo.", "Imaginamos esta casa para recibirte como nos gusta recibir: con calidez, generosidad y una atención discreta."],
      signature: "Mouna, Nicolas y todo el equipo te esperan.",
      address: "Tu llegada al riad", access: "Acceso directo en coche hasta nuestra puerta.", maps: "Abrir en Google Maps",
      roomEyebrow: "En tu suite", roomTitle: "Tu comodidad, sin más",
      room: [["Minibar, café y té", "Agua fresca, un café o un té: tómate una pausa en la intimidad de tu suite."], ["El agua del riad", "Nuestra agua es potable gracias a un sistema de filtración y tratamiento UV. Puedes beberla con total confianza."], ["Aire acondicionado", "Ajusta la temperatura de tu suite a tu gusto, para días suaves y noches tranquilas."], ["Secador de pelo", "Un secador profesional está a tu disposición en el armario."], ["Caja fuerte", "Tu caja fuerte está en el armario. Te recomendamos guardar en ella tus objetos de valor."]],
      contactEyebrow: "Información práctica", contactTitle: "Contacta con el equipo", contactText: "Para una reserva, un traslado o una pregunta, escríbenos por WhatsApp o llámanos.",
      contactLabels: ["WhatsApp (reservas)", "Teléfono", "Correo", "Instagram"],
      footer: "Tu guía de bienvenida en Marrakech."
    },
    de: {
      title: "Riad Kasbah La Moun | Willkommensguide",
      checkin: ["Vor Ihrer Ankunft erforderlich", "Online-Check-in", "Zwei Minuten für Ihr Gästeformular: Wir bearbeiten Ihre Buchung schneller und Ihre Suite ist bei Ankunft bereit.", "Check-in starten"], checkinDone: ["Check-in erledigt", "Danke, Ihr Formular ist eingegangen. Jetzt nur noch Ihre Ankunft planen.", "Transfer organisieren", "Formular ändern"],
      nav: ["Ihre Ankunft", "Küche", "Spa", "Marrakesch", "Buchen"],
      eyebrow: "Königliches Kasbah-Viertel", h1: "Ihr Willkommensguide", sub: "Bereiten Sie Ihre Ankunft vor, stellen Sie sich Ihren Aufenthalt vor.",
      features: ["Nur 8 Suiten", "Königliches Kasbah-Viertel", "Direkte Zufahrt mit dem Auto", "Beheizter Pool", "Frühstück bis mittags"],
      tiles: [["Privater Transfer", "Ihre Ankunft", "Premium-Fahrzeug garantiert. Der Fahrer kennt den Weg.", "Transfer organisieren"], ["Küche", "An unserem Tisch", "Die Freude, sich Zeit zu nehmen.", "Die Küche entdecken"], ["Spa", "Hammam und Massagen", "Ein privates Spa für zwei.", "Behandlungen entdecken"], ["Unser Marrakesch", "Marrakesch entdecken", "Unsere liebsten Adressen und Erlebnisse.", "Entdecken"]],
      bookCta: "Meinen Aufenthalt gestalten", practical: "Praktische Informationen",
      welcomeEyebrow: "Take your time", welcomeTitle: "Ein Haus, ein anderer Rhythmus",
      welcomeText: ["Nehmen Sie sich in der Kasbah La Moun Zeit für einen längeren Tee, lauschen Sie dem Wasser der Innenhöfe, teilen Sie ein Abendessen und entdecken Sie ein intimeres Marrakesch.", "Wir haben dieses Haus so gestaltet, dass wir Sie empfangen, wie wir es lieben: mit Wärme, Großzügigkeit und diskreter Aufmerksamkeit."],
      signature: "Mouna, Nicolas und das ganze Team freuen sich auf Sie.",
      address: "Ihre Ankunft im Riad", access: "Direkte Zufahrt mit dem Auto bis vor unsere Tür.", maps: "In Google Maps öffnen",
      roomEyebrow: "In Ihrer Suite", roomTitle: "Ihr Komfort, ganz einfach",
      room: [["Minibar, Kaffee und Tee", "Frisches Wasser, ein Kaffee oder ein Tee: gönnen Sie sich eine Pause in Ihrer Suite."], ["Das Wasser des Riads", "Unser Wasser wird durch Filtration und UV-Behandlung trinkbar gemacht. Sie können es bedenkenlos trinken."], ["Klimaanlage", "Stellen Sie die Temperatur Ihrer Suite nach Wunsch ein, für milde Tage und ruhige Nächte."], ["Föhn", "Ein professioneller Föhn steht im Schrank bereit."], ["Safe", "Ihr Safe befindet sich im Schrank. Wir empfehlen, Ihre Wertsachen darin aufzubewahren."]],
      contactEyebrow: "Praktische Informationen", contactTitle: "Kontaktieren Sie das Team", contactText: "Für Buchungen, Transfers oder Fragen schreiben Sie uns per WhatsApp oder rufen Sie an.",
      contactLabels: ["WhatsApp (Buchungen)", "Telefon", "E-Mail", "Instagram"],
      footer: "Ihr Willkommensguide für Marrakesch."
    },
    ar: {
      title: "رياض قصبة لا مون | دليل الترحيب",
      checkin: ["إلزامي قبل وصولكم", "تسجيل الوصول عبر الإنترنت", "دقيقتان لملء بطاقة الضيف: نعالج حجزكم بسرعة أكبر ويكون جناحكم جاهزاً عند وصولكم.", "سجّل وصولي"], checkinDone: ["تم تسجيل الوصول", "شكراً، استلمنا بطاقتكم. بقي فقط تنظيم وصولكم.", "نظّم نقلي", "تعديل بطاقتي"],
      nav: ["وصولكم", "المطعم", "السبا", "مراكش", "احجز"],
      eyebrow: "الحي الملكي بالقصبة", h1: "دليل الترحيب بكم", sub: "حضّروا لوصولكم وتخيّلوا إقامتكم.",
      features: ["8 أجنحة فقط", "الحي الملكي بالقصبة", "وصول مباشر بالسيارة", "مسبح مُدفأ", "فطور حتى الظهر"],
      tiles: [["نقل خاص", "وصولكم", "سيارة فاخرة مضمونة، وسائق يعرف الطريق جيداً.", "نظّم نقلي"], ["المطعم", "على مائدتنا", "متعة أخذ الوقت.", "اكتشف المطعم"], ["السبا", "حمام وتدليك", "سبا خاص لشخصين.", "اكتشف العلاجات"], ["مراكشنا", "اكتشف مراكش", "عناويننا وتجاربنا المفضلة.", "استكشف"]],
      bookCta: "خصّص إقامتي", practical: "معلومات عملية",
      welcomeEyebrow: "Take your time", welcomeTitle: "بيت وإيقاع مختلف",
      welcomeText: ["في قصبة لا مون، خذوا وقتكم لإطالة جلسة الشاي، والإنصات إلى ماء الأفنية، ومشاركة العشاء، واكتشاف مراكش أكثر حميمية.", "صمّمنا هذا البيت لنستقبلكم كما نحب أن نستقبل: بدفء وكرم واهتمام هادئ."],
      signature: "منى ونيكولا وكل الفريق في انتظاركم.",
      address: "وصولكم إلى الرياض", access: "وصول مباشر بالسيارة حتى بابنا.", maps: "فتح في خرائط Google",
      roomEyebrow: "في جناحكم", roomTitle: "راحتكم ببساطة",
      room: [["ميني بار، قهوة وشاي", "ماء بارد أو قهوة أو شاي: استمتعوا باستراحة في خصوصية جناحكم."], ["ماء الرياض", "ماؤنا صالح للشرب بفضل نظام ترشيح ومعالجة بالأشعة فوق البنفسجية. يمكنكم شربه بكل ثقة."], ["تكييف الهواء", "اضبطوا حرارة جناحكم حسب رغبتكم، لأيام لطيفة وليالٍ هادئة."], ["مجفف الشعر", "مجفف شعر احترافي متوفر في الخزانة."], ["خزنة", "توجد خزنتكم في الخزانة. ننصحكم بوضع أغراضكم الثمينة فيها."]],
      contactEyebrow: "معلومات عملية", contactTitle: "تواصلوا مع الفريق", contactText: "لحجز أو نقل أو سؤال، راسلونا عبر واتساب أو اتصلوا بنا.",
      contactLabels: ["واتساب (الحجوزات)", "الهاتف", "البريد الإلكتروني", "إنستغرام"],
      footer: "دليل الترحيب بكم في مراكش."
    }
  };

  /* Bandeau check-in en ligne : invite tant que la fiche n'est pas faite, puis renvoie vers le transfert. */
  function checkinBanner(d) {
    var g = RT.getGuest(), done = g && g.done;
    if (done) return '<div class="checkin-banner done">' + RT.icon("check") + '<div><small class="kicker">' + esc(d.checkinDone[0]) + "</small><p>" + esc(d.checkinDone[1]) + '</p></div><div class="checkin-actions"><a class="button button-solid" href="/transfert/">' + esc(d.checkinDone[2]) + "</a>" +
      (g.stayToken ? '<a class="text-link" href="/mon-sejour/">' + esc(RT.UI[RT.getLang()].myStay) + "</a>" : "") + '<a class="text-link" href="/checkin/">' + esc(d.checkinDone[3]) + "</a></div></div>";
    return '<a class="checkin-banner" href="/checkin/">' + RT.icon("key") + '<div><small class="kicker">' + esc(d.checkin[0]) + "</small><strong>" + esc(d.checkin[1]) + "</strong><p>" + esc(d.checkin[2]) + '</p></div><span class="button button-solid">' + esc(d.checkin[3]) + ' <b class="nudge" aria-hidden="true">→</b></span></a>';
  }

  function render(lang) {
    var d = T[lang], ui = RT.UI[lang], C = RT.CONTACT, h = "";
    h += '<header class="site-header"><a href="#accueil" class="brand" aria-label="Riad Kasbah La Moun">' + RT.logoMark() + "<span>Kasbah La Moun</span></a><nav>" +
      TILE_LINKS.map(function (href, i) { return '<a href="' + href + '">' + esc(d.nav[i]) + "</a>"; }).join("") +
      '<a class="nav-cta" href="/reserver/">' + esc(d.nav[4]) + "</a>" + RT.picker(lang) + "</nav></header>";

    h += '<section class="hero" id="accueil">' + RT.wordmark() + '<p class="eyebrow">' + esc(d.eyebrow) + "</p><h1>" + esc(d.h1) + '</h1><p class="hero-sub">' + esc(d.sub) + "</p>" +
      checkinBanner(d) + '<ul class="features">' + d.features.map(function (f, i) { return "<li>" + ico(FEATURE_ICONS[i]) + "<span>" + esc(f) + "</span></li>"; }).join("") + "</ul>" +
      '<div class="tiles">' + TILE_LINKS.map(function (href, i) {
        var x = d.tiles[i];
        return '<a class="tile" href="' + href + '" style="--i:' + i + '">' + RT.icon(TILE_ICONS[i]) + '<small class="tile-kicker">' + esc(x[0]) + "</small><strong>" + esc(x[1]) + "</strong><span>" + esc(x[2]) + '</span><em class="tile-cta">' + esc(x[3]) + '</em><b aria-hidden="true">→</b></a>';
      }).join("") + "</div>" +
      '<div class="hero-actions"><a class="button button-solid" href="/reserver/">' + esc(d.bookCta) + ' <span aria-hidden="true">→</span></a></div>' +
      '<p class="hint"><a href="#contact">' + esc(d.practical) + "</a></p></section>";

    h += '<section class="section welcome"><div><p class="eyebrow">' + esc(d.welcomeEyebrow) + "</p><h2>" + esc(d.welcomeTitle) + "</h2>" +
      d.welcomeText.map(function (p) { return '<p class="lead">' + esc(p) + "</p>"; }).join("") + '<p class="signature">' + esc(d.signature) + "</p></div>" +
      '<div class="address-card">' + ico("pin") + '<span class="kicker">' + esc(d.address) + '</span><strong><bdi>198, Tarik Dar Al Makhzen</bdi></strong><p><bdi>Al Mechouar, Quartier Royal Kasbah</bdi><br><bdi>Marrakech</bdi></p>' +
      '<p class="access">' + ico("car") + "<span>" + esc(d.access) + '</span></p><a href="' + esc(MAPS) + '" target="_blank" rel="noreferrer">' + esc(d.maps) + " <span>↗</span></a></div></section>";

    h += '<section class="section"><div class="heading centered"><p class="eyebrow">' + esc(d.roomEyebrow) + "</p><h2>" + esc(d.roomTitle) + '</h2></div><div class="info-grid suite">' +
      d.room.map(function (x, i) { return "<article>" + ico(SUITE_ICONS[i]) + "<strong>" + esc(x[0]) + "</strong><p>" + esc(x[1]) + "</p></article>"; }).join("") + "</div></section>";

    h += '<section class="section contact" id="contact"><div class="heading"><p class="eyebrow">' + esc(d.contactEyebrow) + "</p><h2>" + esc(d.contactTitle) + "</h2><p>" + esc(d.contactText) + '</p></div><div class="contact-grid">' +
      "<article><small>" + esc(d.contactLabels[0]) + "</small><strong><bdi>" + C.whatsappLabel + '</bdi></strong><div><a href="/reserver/">' + esc(ui.book) + '</a><a href="' + RT.waLink() + '" target="_blank" rel="noreferrer">' + esc(ui.whatsapp) + "</a></div></article>" +
      C.phones.map(function (p) { return "<article><small>" + esc(d.contactLabels[1]) + " • " + p[0] + "</small><strong><bdi>" + p[2] + '</bdi></strong><div><a href="tel:' + p[1] + '">' + esc(ui.call) + "</a></div></article>"; }).join("") +
      "<article><small>" + esc(d.contactLabels[2]) + "</small><strong><bdi>" + C.email + '</bdi></strong><div><a href="mailto:' + C.email + '">' + esc(ui.email) + "</a></div></article>" +
      "<article><small>" + esc(d.contactLabels[3]) + "</small><strong><bdi>@" + C.instagram + '</bdi></strong><div><a href="https://www.instagram.com/' + C.instagram + '/" target="_blank" rel="noreferrer">Instagram</a></div></article>' +
      "</div></section>";

    h += "<footer>" + RT.wordmark() + "<p>" + esc(d.footer) + '</p><a href="' + C.site + '" target="_blank" rel="noreferrer">kasbahlamoun.com</a></footer>';
    return h;
  }

  RT.mount({ render: render, title: function (l) { return T[l].title; } });
})();
