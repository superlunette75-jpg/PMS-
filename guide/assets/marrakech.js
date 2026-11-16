/* Riad Kasbah La Moun, « Notre Marrakech » : la sélection de Mouna et Nicolas.
   Lieu : q = recherche Google Maps, m = "walk" ou "car", min = temps indicatif, note = délai de réservation (facultatif),
   links = liens supplémentaires (facultatif), puis [nom, description] par langue. */
(function () {
  "use strict";
  var esc = RT.esc;
  function L(fr, en, es, de, ar) { return { fr: fr, en: en, es: es, de: de, ar: ar }; }
  function maps(q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q + " Marrakech"); }

  var T = {
    fr: { title: "Riad Kasbah La Moun | Notre Marrakech", header: "Notre Marrakech", eyebrow: "La sélection de Mouna et Nicolas", h1: "Notre Marrakech", sub: "Tables préférées, découvertes et aventures humaines.", intro: "Un Marrakech à partager, à travers nos adresses et nos expériences préférées.",
      chips: ["Avec un guide", "Vallée du Zat", "Restaurants", "Monuments", "Jardins"], tables: "Nos tables préférées", monuments: "Monuments et culture", gardens: "Jardins",
      walk: "à pied", car: "en voiture", lunch: "Déjeuner", route: "Voir l'itinéraire", tickets: "Billetterie officielle", site: "Découvrir le restaurant",
      note: "Temps de trajet indicatifs au départ du riad, selon la circulation.", endTitle: "Qu'avez-vous envie de découvrir ?", endText: "Un guide, une excursion ou une table : partagez vos envies. Notre équipe vous confirmera chaque demande.", endCta: "Préparer mes découvertes",
      guide: ["Avec un guide privé", "Marrakech, derrière ses portes", "Une cour insoupçonnée, le geste d'un artisan, une histoire à découvrir. Explorez la ville de l'intérieur, avec un guide rien que pour vous.", "Demi-journée", "Journée", "Demander un guide"],
      zat: ["Immersion en terres berbères", "La vallée du Zat", "Villages, jardins en terrasses, rencontre avec un potier et déjeuner chez l'habitant : une journée de découvertes et de partage, au rythme de l'Atlas.", "Tarif confirmé par notre équipe selon le nombre de participants.", "Choisir ma date"] },
    en: { title: "Riad Kasbah La Moun | Our Marrakech", header: "Our Marrakech", eyebrow: "Mouna and Nicolas' selection", h1: "Our Marrakech", sub: "Favourite tables, discoveries and human adventures.", intro: "A Marrakech to share, through our favourite places and experiences.",
      chips: ["With a guide", "Zat Valley", "Restaurants", "Monuments", "Gardens"], tables: "Our favourite tables", monuments: "Monuments and culture", gardens: "Gardens",
      walk: "on foot", car: "by car", lunch: "Lunch", route: "Get directions", tickets: "Official tickets", site: "Visit the restaurant",
      note: "Approximate travel times from the riad, depending on traffic.", endTitle: "What would you like to discover?", endText: "A guide, an excursion or a table: share your wishes. Our team will confirm each request.", endCta: "Plan my discoveries",
      guide: ["With a private guide", "Marrakech, behind its doors", "A hidden courtyard, an artisan at work, a story to uncover. Explore the city from the inside, with a guide just for you.", "Half day", "Full day", "Request a guide"],
      zat: ["Into Berber lands", "The Zat Valley", "Villages, terraced gardens, a visit to a potter and lunch with a local family: a day of discovery and sharing, at the pace of the Atlas.", "Price confirmed by our team according to the number of participants.", "Choose my date"] },
    es: { title: "Riad Kasbah La Moun | Nuestro Marrakech", header: "Nuestro Marrakech", eyebrow: "La selección de Mouna y Nicolas", h1: "Nuestro Marrakech", sub: "Mesas favoritas, descubrimientos y aventuras humanas.", intro: "Un Marrakech para compartir, a través de nuestros lugares y experiencias favoritos.",
      chips: ["Con un guía", "Valle del Zat", "Restaurantes", "Monumentos", "Jardines"], tables: "Nuestras mesas favoritas", monuments: "Monumentos y cultura", gardens: "Jardines",
      walk: "a pie", car: "en coche", lunch: "Almuerzo", route: "Ver la ruta", tickets: "Taquilla oficial", site: "Descubrir el restaurante",
      note: "Tiempos de trayecto aproximados desde el riad, según el tráfico.", endTitle: "¿Qué te gustaría descubrir?", endText: "Un guía, una excursión o una mesa: cuéntanos tus deseos. Nuestro equipo confirmará cada solicitud.", endCta: "Preparar mis descubrimientos",
      guide: ["Con un guía privado", "Marrakech, tras sus puertas", "Un patio insospechado, el gesto de un artesano, una historia por descubrir. Explora la ciudad desde dentro, con un guía solo para ti.", "Medio día", "Día completo", "Solicitar un guía"],
      zat: ["Inmersión en tierras bereberes", "El valle del Zat", "Pueblos, jardines en terrazas, encuentro con un alfarero y almuerzo en casa de una familia: un día de descubrimientos y de intercambio, al ritmo del Atlas.", "Precio confirmado por nuestro equipo según el número de participantes.", "Elegir mi fecha"] },
    de: { title: "Riad Kasbah La Moun | Unser Marrakesch", header: "Unser Marrakesch", eyebrow: "Die Auswahl von Mouna und Nicolas", h1: "Unser Marrakesch", sub: "Lieblingsrestaurants, Entdeckungen und menschliche Begegnungen.", intro: "Ein Marrakesch zum Teilen, mit unseren liebsten Adressen und Erlebnissen.",
      chips: ["Mit Guide", "Zat-Tal", "Restaurants", "Denkmäler", "Gärten"], tables: "Unsere Lieblingsrestaurants", monuments: "Denkmäler und Kultur", gardens: "Gärten",
      walk: "zu Fuß", car: "mit dem Auto", lunch: "Mittagessen", route: "Route anzeigen", tickets: "Offizieller Ticketshop", site: "Zum Restaurant",
      note: "Ungefähre Fahrzeiten ab dem Riad, je nach Verkehr.", endTitle: "Was möchten Sie entdecken?", endText: "Ein Guide, ein Ausflug oder ein Tisch: teilen Sie uns Ihre Wünsche mit. Unser Team bestätigt jede Anfrage.", endCta: "Meine Entdeckungen planen",
      guide: ["Mit privatem Guide", "Marrakesch, hinter seinen Türen", "Ein verborgener Innenhof, ein Handwerker bei der Arbeit, eine Geschichte zum Entdecken. Erkunden Sie die Stadt von innen, mit einem Guide nur für Sie.", "Halber Tag", "Ganzer Tag", "Guide anfragen"],
      zat: ["Im Land der Berber", "Das Zat-Tal", "Dörfer, Terrassengärten, Besuch bei einem Töpfer und Mittagessen bei Einheimischen: ein Tag voller Entdeckungen und Begegnungen im Rhythmus des Atlas.", "Preis wird von unserem Team je nach Teilnehmerzahl bestätigt.", "Datum wählen"] },
    ar: { title: "رياض قصبة لا مون | مراكشنا", header: "مراكشنا", eyebrow: "اختيار منى ونيكولا", h1: "مراكشنا", sub: "مطاعمنا المفضلة واكتشافات ومغامرات إنسانية.", intro: "مراكش للمشاركة، من خلال عناويننا وتجاربنا المفضلة.",
      chips: ["مع مرشد", "وادي الزات", "المطاعم", "المعالم", "الحدائق"], tables: "مطاعمنا المفضلة", monuments: "معالم وثقافة", gardens: "الحدائق",
      walk: "سيراً", car: "بالسيارة", lunch: "غداء", route: "عرض الطريق", tickets: "التذاكر الرسمية", site: "اكتشف المطعم",
      note: "أوقات تقريبية انطلاقاً من الرياض، حسب حركة السير.", endTitle: "ماذا ترغبون في اكتشافه؟", endText: "مرشد أو رحلة أو طاولة: شاركونا رغباتكم. سيؤكد فريقنا كل طلب.", endCta: "حضّر اكتشافاتي",
      guide: ["مع مرشد خاص", "مراكش خلف أبوابها", "فناء غير متوقع، حركة يد حرفي، وقصة تنتظر الاكتشاف. استكشفوا المدينة من الداخل مع مرشد خاص بكم.", "نصف يوم", "يوم كامل", "اطلب مرشداً"],
      zat: ["انغماس في الأراضي الأمازيغية", "وادي الزات", "قرى وحدائق مدرّجة ولقاء مع خزّاف وغداء عند السكان: يوم من الاكتشاف والمشاركة على إيقاع الأطلس.", "يؤكد فريقنا السعر حسب عدد المشاركين.", "اختر تاريخي"] }
  };

  var GUIDE_PRICES = [700, 1000];

  var TABLES = [
    { q: "Villa Aaron", m: "walk", min: "10", fr: ["Villa Aaron", "Un jardin paisible et une cuisine raffinée, à quelques pas de la Kasbah."], en: ["Villa Aaron", "A peaceful garden and refined cuisine, a few steps from the Kasbah."], es: ["Villa Aaron", "Un jardín tranquilo y una cocina refinada, a pocos pasos de la Kasbah."], de: ["Villa Aaron", "Ein ruhiger Garten und feine Küche, wenige Schritte von der Kasbah."], ar: ["فيلا آرون", "حديقة هادئة ومطبخ راقٍ على بعد خطوات من القصبة."] },
    { q: "Dardar Rooftop", m: "walk", min: "20", note: 15, fr: ["Dardar Rooftop", "Une terrasse panoramique pour savourer la médina."], en: ["Dardar Rooftop", "A panoramic terrace to take in the medina."], es: ["Dardar Rooftop", "Una terraza panorámica para disfrutar de la medina."], de: ["Dardar Rooftop", "Eine Panoramaterrasse mit Blick über die Medina."], ar: ["دردار روفتوب", "سطح بانورامي للاستمتاع بالمدينة العتيقة."] },
    { q: "Kabana Rooftop", m: "car", min: "10", note: 7, fr: ["Kabana Roof top", "Cocktails et coucher de soleil sur les toits."], en: ["Kabana Roof top", "Cocktails and sunset on the rooftops."], es: ["Kabana Roof top", "Cócteles y puesta de sol en las azoteas."], de: ["Kabana Roof top", "Cocktails und Sonnenuntergang über den Dächern."], ar: ["كابانا روف توب", "كوكتيلات وغروب الشمس فوق الأسطح."] },
    { q: "Restaurant Mizaan", m: "car", min: "10-15", fr: ["Restaurant Miizaan", "Une table marocaine contemporaine dans un cadre élégant."], en: ["Restaurant Miizaan", "Contemporary Moroccan dining in an elegant setting."], es: ["Restaurante Miizaan", "Una mesa marroquí contemporánea en un entorno elegante."], de: ["Restaurant Miizaan", "Zeitgenössische marokkanische Küche in elegantem Rahmen."], ar: ["مطعم ميزان", "مائدة مغربية معاصرة في إطار أنيق."] },
    { q: "Les Jardins du Lotus", m: "car", min: "10", fr: ["Les Jardins du Lotus", "Une pause gourmande dans un jardin de la médina."], en: ["Les Jardins du Lotus", "A gourmet break in a medina garden."], es: ["Les Jardins du Lotus", "Una pausa gourmet en un jardín de la medina."], de: ["Les Jardins du Lotus", "Eine genussvolle Pause in einem Garten der Medina."], ar: ["حدائق اللوتس", "استراحة شهية في حديقة بالمدينة العتيقة."] },
    { q: "Farmers restaurant", m: "car", min: "10-15", note: 5, fr: ["Farmers", "Une cuisine qui met les produits de la ferme à l'honneur."], en: ["Farmers", "Cooking that puts farm produce in the spotlight."], es: ["Farmers", "Una cocina que pone en valor los productos de la granja."], de: ["Farmers", "Eine Küche, die Produkte vom Bauernhof in den Mittelpunkt stellt."], ar: ["فارمرز", "مطبخ يحتفي بمنتجات المزرعة."] },
    { q: "Royal Mansour", m: "car", min: "10", fr: ["Royal Mansour", "De belles tables dans un cadre d'exception."], en: ["Royal Mansour", "Beautiful restaurants in an exceptional setting."], es: ["Royal Mansour", "Grandes mesas en un entorno excepcional."], de: ["Royal Mansour", "Schöne Restaurants in außergewöhnlichem Rahmen."], ar: ["رويال منصور", "مطاعم جميلة في إطار استثنائي."] },
    { q: "La Mamounia", m: "car", min: "8", fr: ["La Mamounia", "Une adresse emblématique pour un verre ou un dîner."], en: ["La Mamounia", "An iconic address for a drink or dinner."], es: ["La Mamounia", "Una dirección emblemática para tomar algo o cenar."], de: ["La Mamounia", "Eine legendäre Adresse für einen Drink oder ein Abendessen."], ar: ["المامونية", "عنوان أسطوري لمشروب أو عشاء."] },
    { q: "La Collégiale restaurant", m: "car", min: "15", site: true, fr: ["La Collégiale", "Une cuisine française aux accents asiatiques, dans une atmosphère intime."], en: ["La Collégiale", "French cooking with Asian touches, in an intimate atmosphere."], es: ["La Collégiale", "Cocina francesa con toques asiáticos, en un ambiente íntimo."], de: ["La Collégiale", "Französische Küche mit asiatischen Akzenten, in intimer Atmosphäre."], ar: ["لا كوليجيال", "مطبخ فرنسي بلمسات آسيوية في أجواء حميمة."] },
    { q: "Casa Lalla Takerkoust", m: "car", min: "45", lunch: true, fr: ["Casa Lalla", "Une escapade au bord du lac Lalla Takerkoust, le temps d'un déjeuner."], en: ["Casa Lalla", "A getaway on the shores of Lake Lalla Takerkoust, for lunch."], es: ["Casa Lalla", "Una escapada a orillas del lago Lalla Takerkoust, el tiempo de un almuerzo."], de: ["Casa Lalla", "Ein Ausflug an den Lalla-Takerkoust-See, für ein Mittagessen."], ar: ["كازا لالة", "نزهة على ضفاف بحيرة لالة تكركوست لتناول الغداء."] }
  ];
  var RESA = L(
    function (d) { return "Réservation obligatoire au moins " + (d === 7 ? "une semaine" : d + " jours") + " à l'avance."; },
    function (d) { return "Booking required at least " + (d === 7 ? "one week" : d + " days") + " in advance."; },
    function (d) { return "Reserva obligatoria con al menos " + (d === 7 ? "una semana" : d + " días") + " de antelación."; },
    function (d) { return "Reservierung mindestens " + (d === 7 ? "eine Woche" : d + " Tage") + " im Voraus erforderlich."; },
    function (d) { return "الحجز إلزامي قبل " + (d === 7 ? "أسبوع" : d + " أيام") + " على الأقل."; }
  );

  var MONUMENTS = [
    { q: "Saadian Tombs", n: L("Tombeaux saâdiens", "Saadian Tombs", "Tumbas saadíes", "Saadier-Gräber", "قبور السعديين") },
    { q: "El Badi Palace", n: L("Palais El Badi", "El Badi Palace", "Palacio El Badi", "El-Badi-Palast", "قصر البديع") },
    { q: "Bahia Palace", n: L("Palais de la Bahia", "Bahia Palace", "Palacio de la Bahía", "Bahia-Palast", "قصر الباهية") },
    { q: "Jemaa el-Fna", n: L("Place Jemaa el-Fna", "Jemaa el-Fna Square", "Plaza Jemaa el-Fna", "Platz Jemaa el-Fna", "ساحة جامع الفنا") },
    { q: "Koutoubia Mosque", n: L("Koutoubia", "Koutoubia", "Koutoubia", "Koutoubia", "الكتبية") },
    { q: "Musee des Confluences Dar El Bacha", n: L("Musée des Confluences", "Museum of Confluences", "Museo de las Confluencias", "Museum der Begegnungen", "متحف الملتقيات") },
    { q: "Ben Youssef Madrasa", n: L("Médersa Ben Youssef", "Ben Youssef Madrasa", "Madrasa Ben Youssef", "Ben-Youssef-Madrasa", "مدرسة ابن يوسف") }
  ];

  var GARDENS = [
    { q: "Le Jardin Secret", fr: ["Le Jardin Secret", "Une pause au calme au cœur de la médina."], en: ["Le Jardin Secret", "A quiet break in the heart of the medina."], es: ["Le Jardin Secret", "Una pausa tranquila en el corazón de la medina."], de: ["Le Jardin Secret", "Eine ruhige Pause im Herzen der Medina."], ar: ["الحديقة السرية", "استراحة هادئة في قلب المدينة العتيقة."] },
    { q: "Jardin Majorelle", tickets: "https://tickets.jardinmajorelle.com/", fr: ["Jardin Majorelle", "Végétation luxuriante, bassins et bleu Majorelle. Billets à réserver en ligne avant votre visite."], en: ["Jardin Majorelle", "Lush vegetation, pools and Majorelle blue. Tickets must be booked online before your visit."], es: ["Jardín Majorelle", "Vegetación exuberante, estanques y azul Majorelle. Entradas a reservar en línea antes de la visita."], de: ["Jardin Majorelle", "Üppige Vegetation, Wasserbecken und Majorelle-Blau. Tickets vorab online buchen."], ar: ["حديقة ماجوريل", "نباتات وارفة وأحواض وأزرق ماجوريل. يجب حجز التذاكر عبر الإنترنت قبل الزيارة."] }
  ];

  function fmt(v) { return v.toLocaleString("fr-FR").replace(/[  ]/g, " "); }

  function render(lang) {
    var t = T[lang], ui = RT.UI[lang], h = "";
    h += RT.subHeader(lang, t.header);
    h += RT.pageHero(t.eyebrow, t.h1, t.intro, [["guide", t.chips[0]], ["zat", t.chips[1]], ["restaurants", t.chips[2]], ["monuments", t.chips[3]], ["jardins", t.chips[4]]]).replace('</h1>', '</h1><p class="hero-sub">' + esc(t.sub) + "</p>");
    h += '<section class="sheet">';

    h += '<div class="exp-grid">' +
      '<article class="exp-card" id="guide"><span class="kicker">' + RT.logoMark("exp-mark") + esc(t.guide[0]) + "</span><h2>" + esc(t.guide[1]) + "</h2><p>" + esc(t.guide[2]) + '</p><ul class="exp-prices"><li><span>' + esc(t.guide[3]) + "</span><b>" + fmt(GUIDE_PRICES[0]) + " " + esc(ui.mad) + "</b></li><li><span>" + esc(t.guide[4]) + "</span><b>" + fmt(GUIDE_PRICES[1]) + " " + esc(ui.mad) + '</b></li></ul><a class="button button-solid" href="/reserver/#guide">' + esc(t.guide[5]) + ' <span aria-hidden="true">→</span></a></article>' +
      '<article class="exp-card" id="zat"><span class="kicker">' + RT.icon("mountain") + esc(t.zat[0]) + "</span><h2>" + esc(t.zat[1]) + "</h2><p>" + esc(t.zat[2]) + '</p><p class="exp-tbc">' + esc(t.zat[3]) + '</p><a class="button button-solid" href="/reserver/#zat">' + esc(t.zat[4]) + ' <span aria-hidden="true">→</span></a></article></div>';

    h += '<div class="category" id="restaurants"><h2 class="rule-title">' + esc(t.tables) + '</h2><div class="place-list">' + TABLES.map(function (p) {
      var meta = p.min + " " + ui.min + " " + t[p.m] + (p.lunch ? " • " + t.lunch : "");
      return '<div class="place"><a class="place-main" href="' + esc(maps(p.q)) + '" target="_blank" rel="noreferrer"><h3>' + esc(p[lang][0]) + '</h3><span class="place-time"><bdi>' + esc(meta) + "</bdi></span><p>" + esc(p[lang][1]) + "</p>" +
        (p.note ? '<p class="place-note">' + esc(RESA[lang](p.note)) + "</p>" : "") + '<b aria-hidden="true">→</b></a>' +
        (p.site ? '<a class="place-link" href="' + esc(maps(p.q)) + '" target="_blank" rel="noreferrer">' + esc(t.site) + " →</a>" : "") + "</div>";
    }).join("") + "</div></div>";

    h += '<div class="category" id="monuments"><h2 class="rule-title">' + esc(t.monuments) + '</h2><div class="place-list compact">' + MONUMENTS.map(function (m) {
      return '<a class="place-row" href="' + esc(maps(m.q)) + '" target="_blank" rel="noreferrer"><span>' + esc(m.n[lang]) + '</span><b aria-hidden="true">→</b></a>';
    }).join("") + "</div></div>";

    h += '<div class="category" id="jardins"><h2 class="rule-title">' + esc(t.gardens) + '</h2><div class="place-list">' + GARDENS.map(function (g) {
      return '<div class="place"><div class="place-main static"><h3>' + esc(g[lang][0]) + "</h3><p>" + esc(g[lang][1]) + '</p></div><div class="place-links">' +
        (g.tickets ? '<a class="place-link" href="' + g.tickets + '" target="_blank" rel="noreferrer">' + esc(t.tickets) + " →</a>" : "") +
        '<a class="place-link" href="' + esc(maps(g.q)) + '" target="_blank" rel="noreferrer">' + esc(t.route) + " →</a></div></div>";
    }).join("") + "</div></div>";

    h += '<p class="note">' + esc(t.note) + "</p></section>";
    h += RT.bottomAction(lang, t.endTitle, "conciergerie", { title: t.endTitle, text: t.endText, cta: t.endCta });
    h += RT.bookFab(lang, "conciergerie");
    return h;
  }

  RT.mount({ render: render, title: function (l) { return T[l].title; } });
})();
