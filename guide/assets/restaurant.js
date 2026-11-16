/* Riad Kasbah La Moun, la table de la maison.
   Chaque repas : [nom, sous-titre, texte, mention de réservation (facultative)].
   La carte du déjeuner est disponible sur place : pas de liste de plats ici. */
(function () {
  "use strict";
  var esc = RT.esc;
  var ICONS = {
    cup: '<path d="M5 9h11v4.5A4.5 4.5 0 0 1 11.5 18h-2A4.5 4.5 0 0 1 5 13.5z"/><path d="M16 10.5h1.5a2 2 0 0 1 0 4H16"/><path d="M4 21h14"/><path d="M9 3.5c-.8.8-.8 1.7 0 2.5M12 3.5c-.8.8-.8 1.7 0 2.5"/>',
    tajine: '<path d="M12 4v2"/><path d="M6 15c0-4.5 2.7-9 6-9s6 4.5 6 9"/><path d="M3.5 15h17"/><path d="M5.5 15c.5 2.5 3 4 6.5 4s6-1.5 6.5-4"/>',
    plate: '<circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="3"/><path d="M3.5 4v5.5a1.5 1.5 0 0 0 3 0V4M5 11v9"/><path d="M20.5 20V4c-1.5 1-2 3.5-2 6h2"/>'
  };
  var MEAL_ICONS = ["cup", "tajine", "plate"];
  function ico(n) { return '<svg class="icon meal-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n] + "</svg>"; }

  var T = {
    fr: { title: "Riad Kasbah La Moun | La table", header: "La table", eyebrow: "À notre table", h1: "Le goût de prendre son temps", intro: "Un petit-déjeuner qui se prolonge, une pause déjeuner, un dîner partagé dans le calme de la maison. À Kasbah La Moun, la table fait partie de l'hospitalité.",
      blocks: [
        ["Petit-déjeuner", "Le plaisir de commencer doucement", "Les saveurs marocaines côtoient les classiques du petit-déjeuner : pains et préparations maison, fruits frais, jus pressés et œufs selon vos envies. Prenez votre temps, nous vous accueillons jusqu'à midi.", ""],
        ["Déjeuner", "Une pause au riad", "Entre deux découvertes de Marrakech, retrouvez le calme de la maison. Choisissez selon vos envies parmi les propositions de notre carte, disponible sur place.", "Sans réservation."],
        ["Dîner", "Le goût d'une maison marocaine", "Une cuisine généreuse, des recettes marocaines et le plaisir de prolonger la soirée autour d'une belle table. Un moment à savourer, sans précipitation.", "Sur réservation. 495 MAD par personne."]
      ],
      reserve: "Votre table vous attend", reserveText: "Pour votre dîner, indiquez-nous la date, le nombre de convives et vos préférences alimentaires. Nous préparerons ce moment avec attention.", cta: "Demander une réservation", ask: "Une question sur nos repas ?" },
    en: { title: "Riad Kasbah La Moun | Dining", header: "Dining", eyebrow: "At our table", h1: "The pleasure of taking your time", intro: "A breakfast that lingers, a lunch break, a dinner shared in the calm of the house. At Kasbah La Moun, the table is part of our hospitality.",
      blocks: [
        ["Breakfast", "The pleasure of a gentle start", "Moroccan flavours sit alongside breakfast classics: homemade breads and preparations, fresh fruit, pressed juices and eggs as you like them. Take your time, we serve breakfast until noon.", ""],
        ["Lunch", "A break at the riad", "Between two discoveries of Marrakech, come back to the calm of the house. Choose as you wish from our menu, available on site.", "No reservation needed."],
        ["Dinner", "The taste of a Moroccan home", "Generous cooking, Moroccan recipes and the pleasure of lingering over a beautiful table. A moment to savour, without hurry.", "By reservation. 495 MAD per person."]
      ],
      reserve: "Your table awaits", reserveText: "For dinner, tell us the date, the number of guests and your dietary preferences. We will prepare this moment with care.", cta: "Request a reservation", ask: "A question about our meals?" },
    es: { title: "Riad Kasbah La Moun | La mesa", header: "La mesa", eyebrow: "En nuestra mesa", h1: "El placer de tomarse su tiempo", intro: "Un desayuno que se alarga, una pausa para comer, una cena compartida en la calma de la casa. En Kasbah La Moun, la mesa forma parte de la hospitalidad.",
      blocks: [
        ["Desayuno", "El placer de empezar despacio", "Los sabores marroquíes conviven con los clásicos del desayuno: panes y preparaciones caseras, fruta fresca, zumos naturales y huevos al gusto. Tómate tu tiempo, te recibimos hasta mediodía.", ""],
        ["Almuerzo", "Una pausa en el riad", "Entre dos descubrimientos de Marrakech, vuelve a la calma de la casa. Elige a tu gusto entre las propuestas de nuestra carta, disponible en el riad.", "Sin reserva."],
        ["Cena", "El sabor de una casa marroquí", "Una cocina generosa, recetas marroquíes y el placer de alargar la velada alrededor de una bonita mesa. Un momento para saborear, sin prisa.", "Con reserva. 495 MAD por persona."]
      ],
      reserve: "Tu mesa te espera", reserveText: "Para tu cena, indícanos la fecha, el número de comensales y tus preferencias alimentarias. Prepararemos este momento con esmero.", cta: "Solicitar una reserva", ask: "¿Una pregunta sobre nuestras comidas?" },
    de: { title: "Riad Kasbah La Moun | Küche", header: "Küche", eyebrow: "An unserem Tisch", h1: "Die Freude, sich Zeit zu nehmen", intro: "Ein ausgedehntes Frühstück, eine Mittagspause, ein gemeinsames Abendessen in der Ruhe des Hauses. In der Kasbah La Moun gehört der Tisch zur Gastfreundschaft.",
      blocks: [
        ["Frühstück", "Sanft in den Tag starten", "Marokkanische Aromen treffen auf Frühstücksklassiker: hausgemachtes Brot und Zubereitungen, frisches Obst, gepresste Säfte und Eier nach Wunsch. Lassen Sie sich Zeit, Frühstück gibt es bis mittags.", ""],
        ["Mittagessen", "Eine Pause im Riad", "Kehren Sie zwischen zwei Entdeckungen in die Ruhe des Hauses zurück. Wählen Sie nach Lust aus unserer Karte, die vor Ort erhältlich ist.", "Ohne Reservierung."],
        ["Abendessen", "Der Geschmack eines marokkanischen Hauses", "Großzügige Küche, marokkanische Rezepte und die Freude, den Abend an einem schönen Tisch zu verlängern. Ein Moment zum Genießen, ohne Eile.", "Nach Reservierung. 495 MAD pro Person."]
      ],
      reserve: "Ihr Tisch erwartet Sie", reserveText: "Nennen Sie uns für Ihr Abendessen das Datum, die Personenzahl und Ihre Ernährungswünsche. Wir bereiten diesen Moment mit Sorgfalt vor.", cta: "Reservierung anfragen", ask: "Eine Frage zu unseren Mahlzeiten?" },
    ar: { title: "رياض قصبة لا مون | المطعم", header: "المطعم", eyebrow: "على مائدتنا", h1: "متعة أخذ الوقت", intro: "فطور يطول، واستراحة غداء، وعشاء مشترك في هدوء البيت. في قصبة لا مون، المائدة جزء من الضيافة.",
      blocks: [
        ["الفطور", "متعة البداية الهادئة", "تلتقي النكهات المغربية بأطباق الفطور الكلاسيكية: خبز ومأكولات منزلية، فواكه طازجة، عصائر وبيض حسب رغبتكم. خذوا وقتكم، نستقبلكم حتى الظهر.", ""],
        ["الغداء", "استراحة في الرياض", "بين اكتشافين في مراكش، عودوا إلى هدوء البيت. اختاروا ما يحلو لكم من قائمتنا المتوفرة في المكان.", "بدون حجز."],
        ["العشاء", "مذاق بيت مغربي", "مطبخ سخي ووصفات مغربية ومتعة إطالة السهرة حول مائدة جميلة. لحظة تُتذوّق دون عجلة.", "بالحجز. 495 درهم للشخص."]
      ],
      reserve: "طاولتكم في انتظاركم", reserveText: "لعشائكم، أخبرونا بالتاريخ وعدد الأشخاص وتفضيلاتكم الغذائية. سنحضّر هذه اللحظة بعناية.", cta: "اطلب حجزاً", ask: "سؤال عن وجباتنا؟" }
  };

  function render(lang) {
    var t = T[lang], h = "";
    h += RT.subHeader(lang, t.header);
    h += RT.pageHero(t.eyebrow, t.h1, t.intro);
    h += '<section class="sheet"><div class="meal-grid">' + t.blocks.map(function (b, i) {
      return '<article class="meal">' + ico(MEAL_ICONS[i]) + "<h2>" + esc(b[0]) + '</h2><p class="meal-time">' + esc(b[1]) + '</p><p class="meal-text">' + esc(b[2]) + "</p>" + (b[3] ? '<p class="meal-foot">' + esc(b[3]) + "</p>" : "") + "</article>";
    }).join("") + "</div>";
    h += '<div class="callout">' + RT.icon("calendar") + "<div><h3>" + esc(t.reserve) + "</h3><p>" + esc(t.reserveText) + '</p></div><a class="button button-solid" href="/reserver/#diner">' + esc(t.cta) + ' <span aria-hidden="true">→</span></a></div></section>';
    h += RT.bottomAction(lang, t.ask, "diner");
    h += RT.bookFab(lang, "diner");
    return h;
  }

  RT.mount({ render: render, title: function (l) { return T[l].title; } });
})();
