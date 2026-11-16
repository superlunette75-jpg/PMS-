/* Riad Kasbah La Moun, spa.
   Chaque soin : opts = [[durée en minutes, prix en MAD], ...], puis [nom, description] par langue.
   Pour changer un prix : modifier le nombre dans opts. Plusieurs durées possibles : [[45, 400], [60, 500]]. */
(function () {
  "use strict";
  var esc = RT.esc;
  function L(fr, en, es, de, ar) { return { fr: fr, en: en, es: es, de: de, ar: ar }; }

  var T = {
    fr: { title: "Riad Kasbah La Moun | Spa", header: "Spa", eyebrow: "Hammam et massages", h1: "Le SPA, rien que pour vous deux", intro: "Un hammam privé, une cabine de massage en duo et le plaisir de prendre soin de soi, ensemble.",
      privacy: "Pendant votre rendez-vous, le SPA vous est entièrement réservé.", history: "Installé dans le borj de la muraille de la Kasbah, datant de 1190, notre SPA vous invite à ralentir dans un lieu chargé d'histoire.", choose: "Seul ou à deux, choisissez votre moment.",
      note: "Soins sur réservation. Durées et tarifs indiqués pour chaque soin.", endTitle: "Prenez ce temps pour vous", endText: "Choisissez votre soin et le moment souhaité. Notre équipe vous confirmera votre rendez-vous.", endCta: "Choisir mon soin" },
    en: { title: "Riad Kasbah La Moun | Spa", header: "Spa", eyebrow: "Hammam and massages", h1: "The SPA, just for the two of you", intro: "A private hammam, a duo massage room and the pleasure of taking care of yourselves, together.",
      privacy: "During your appointment, the SPA is entirely yours.", history: "Set in a tower of the Kasbah's ramparts dating from 1190, our SPA invites you to slow down in a place steeped in history.", choose: "Alone or together, choose your moment.",
      note: "Treatments by reservation. Duration and price shown for each treatment.", endTitle: "Take this time for yourself", endText: "Choose your treatment and the time you would like. Our team will confirm your appointment.", endCta: "Choose my treatment" },
    es: { title: "Riad Kasbah La Moun | Spa", header: "Spa", eyebrow: "Hammam y masajes", h1: "El SPA, solo para vosotros dos", intro: "Un hammam privado, una cabina de masaje en pareja y el placer de cuidarse, juntos.",
      privacy: "Durante tu cita, el SPA está reservado solo para ti.", history: "Instalado en el borj de la muralla de la Kasbah, del año 1190, nuestro SPA te invita a bajar el ritmo en un lugar lleno de historia.", choose: "Solo o en pareja, elige tu momento.",
      note: "Tratamientos con reserva. Duración y precio indicados para cada tratamiento.", endTitle: "Tómate este tiempo para ti", endText: "Elige tu tratamiento y el momento deseado. Nuestro equipo te confirmará la cita.", endCta: "Elegir mi tratamiento" },
    de: { title: "Riad Kasbah La Moun | Spa", header: "Spa", eyebrow: "Hammam und Massagen", h1: "Das SPA, nur für Sie beide", intro: "Ein privater Hammam, ein Massageraum für zwei und die Freude, gemeinsam etwas für sich zu tun.",
      privacy: "Während Ihres Termins gehört das SPA ganz Ihnen.", history: "In einem Turm der Kasbah-Stadtmauer aus dem Jahr 1190 gelegen, lädt unser SPA zum Innehalten an einem geschichtsträchtigen Ort ein.", choose: "Allein oder zu zweit, wählen Sie Ihren Moment.",
      note: "Behandlungen nach Reservierung. Dauer und Preis bei jeder Behandlung angegeben.", endTitle: "Nehmen Sie sich diese Zeit", endText: "Wählen Sie Ihre Behandlung und den gewünschten Zeitpunkt. Unser Team bestätigt Ihren Termin.", endCta: "Behandlung wählen" },
    ar: { title: "رياض قصبة لا مون | السبا", header: "السبا", eyebrow: "حمام وتدليك", h1: "السبا لكما وحدكما", intro: "حمام خاص، وغرفة تدليك ثنائية، ومتعة العناية بالنفس معاً.",
      privacy: "خلال موعدكم، يكون السبا مخصصاً لكم بالكامل.", history: "يقع السبا في برج من سور القصبة يعود إلى سنة 1190، ويدعوكم إلى التمهّل في مكان عريق.", choose: "وحدكم أو معاً، اختاروا لحظتكم.",
      note: "الجلسات بالحجز. المدة والسعر مذكوران لكل علاج.", endTitle: "خذوا هذا الوقت لأنفسكم", endText: "اختاروا علاجكم والوقت المناسب. سيؤكد فريقنا موعدكم.", endCta: "اختر علاجي" }
  };

  var SPA = [
    {
      id: "hammam", icon: "steam",
      title: L("Les rituels du hammam", "Hammam rituals", "Los rituales del hammam", "Hammam-Rituale", "طقوس الحمام"),
      items: [
        { opts: [[45, 400]],
          fr: ["Hammam traditionnel", "Vapeur, savon noir et gommage au gant kessa."],
          en: ["Traditional hammam", "Steam, black soap and kessa glove exfoliation."],
          es: ["Hammam tradicional", "Vapor, jabón negro y exfoliación con guante kessa."],
          de: ["Traditioneller Hammam", "Dampf, schwarze Seife und Peeling mit dem Kessa-Handschuh."],
          ar: ["حمام تقليدي", "بخار، صابون بلدي وتقشير بالكيس."] },
        { opts: [[70, 600]],
          fr: ["Rituel au ghassoul", "Hammam, enveloppement au ghassoul et massage ciblé à l'huile d'argan chaude."],
          en: ["Ghassoul ritual", "Hammam, ghassoul wrap and targeted warm argan oil massage."],
          es: ["Ritual de ghassoul", "Hammam, envoltura de ghassoul y masaje localizado con aceite de argán caliente."],
          de: ["Ghassoul-Ritual", "Hammam, Ghassoul-Packung und gezielte Massage mit warmem Arganöl."],
          ar: ["طقس الغاسول", "حمام، لفّ بالغاسول وتدليك موضعي بزيت الأركان الدافئ."] },
        { opts: [[120, 1000]],
          fr: ["Rituel signature La Moun", "Hammam, ghassoul, massage du corps et soin du visage au masque minéral."],
          en: ["La Moun signature ritual", "Hammam, ghassoul, body massage and facial with a mineral mask."],
          es: ["Ritual firma La Moun", "Hammam, ghassoul, masaje corporal y tratamiento facial con mascarilla mineral."],
          de: ["Signature-Ritual La Moun", "Hammam, Ghassoul, Körpermassage und Gesichtsbehandlung mit Mineralmaske."],
          ar: ["طقس لا مون المميز", "حمام، غاسول، تدليك للجسم وعناية بالوجه بقناع معدني."] }
      ]
    },
    {
      id: "massages", icon: "stones",
      title: L("Les massages", "Massages", "Los masajes", "Massagen", "التدليك"),
      items: [
        { opts: [[60, 500]],
          fr: ["Massage relaxant", "Des gestes lents et enveloppants, une pression douce."],
          en: ["Relaxing massage", "Slow, enveloping movements with gentle pressure."],
          es: ["Masaje relajante", "Gestos lentos y envolventes, una presión suave."],
          de: ["Entspannungsmassage", "Langsame, umhüllende Bewegungen mit sanftem Druck."],
          ar: ["تدليك استرخائي", "حركات بطيئة وشاملة بضغط لطيف."] },
        { opts: [[60, 600]],
          fr: ["Massage tonique", "Des gestes appuyés pour les amateurs de pression profonde."],
          en: ["Toning massage", "Firm movements for those who enjoy deep pressure."],
          es: ["Masaje tonificante", "Gestos firmes para quienes prefieren una presión profunda."],
          de: ["Belebende Massage", "Kräftige Bewegungen für Liebhaber von tiefem Druck."],
          ar: ["تدليك منشّط", "حركات قوية لمحبي الضغط العميق."] },
        { opts: [[60, 650]],
          fr: ["Massage aux pierres chaudes", "Une chaleur enveloppante pour un moment de détente."],
          en: ["Hot stone massage", "Enveloping warmth for a moment of relaxation."],
          es: ["Masaje con piedras calientes", "Un calor envolvente para un momento de relajación."],
          de: ["Hot-Stone-Massage", "Umhüllende Wärme für einen Moment der Entspannung."],
          ar: ["تدليك بالأحجار الساخنة", "دفء شامل للحظة استرخاء."] },
        { opts: [[60, 1000]],
          fr: ["Massage à quatre mains", "Deux praticiennes, un même rythme, une expérience singulière."],
          en: ["Four-hands massage", "Two therapists, one rhythm, a singular experience."],
          es: ["Masaje a cuatro manos", "Dos terapeutas, un mismo ritmo, una experiencia singular."],
          de: ["Vierhändige Massage", "Zwei Therapeutinnen, ein Rhythmus, ein besonderes Erlebnis."],
          ar: ["تدليك بأربع أيادٍ", "معالجتان بإيقاع واحد، تجربة فريدة."] }
      ]
    },
    {
      id: "reiki", icon: "lotus",
      title: L("Une autre façon de ralentir", "Another way to slow down", "Otra forma de bajar el ritmo", "Eine andere Art, zur Ruhe zu kommen", "طريقة أخرى للتمهّل"),
      items: [
        { opts: [[60, 850]],
          fr: ["Reiki", "Un temps de calme et de recentrage."],
          en: ["Reiki", "A time of calm and recentring."],
          es: ["Reiki", "Un momento de calma y de reencuentro con uno mismo."],
          de: ["Reiki", "Eine Zeit der Ruhe und der inneren Sammlung."],
          ar: ["الريكي", "وقت للهدوء واستعادة التوازن."] }
      ]
    }
  ];

  var ICONS = {
    steam: '<path d="M4 14h16a8 8 0 0 1-16 0z"/><path d="M8.5 4c-1 1-1 2 0 3s1 2 0 3M12 4c-1 1-1 2 0 3s1 2 0 3M15.5 4c-1 1-1 2 0 3s1 2 0 3"/>',
    stones: '<ellipse cx="12" cy="19" rx="7.5" ry="2.5"/><ellipse cx="12" cy="13.8" rx="5.5" ry="2"/><ellipse cx="12" cy="9.3" rx="3.8" ry="1.7"/><ellipse cx="12" cy="5.5" rx="2.2" ry="1.2"/>'
  };
  function catIcon(n) {
    if (n === "lotus") return RT.icon("lotus");
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n] + "</svg>";
  }
  function fmt(v) { return v.toLocaleString("fr-FR").replace(/[  ]/g, " "); }

  function render(lang) {
    var t = T[lang], ui = RT.UI[lang], h = "";
    h += RT.subHeader(lang, t.header);
    h += RT.pageHero(t.eyebrow, t.h1, t.intro, SPA.map(function (c) { return [c.id, c.title[lang]]; }));
    h += '<section class="sheet"><p class="privacy-band"><span aria-hidden="true">◆</span>' + esc(t.privacy) + '<span aria-hidden="true">◆</span></p>' +
      '<div class="history-note">' + RT.logoMark("history-mark") + "<p>" + esc(t.history) + '</p></div><p class="choose-line"><span>' + esc(t.choose) + "</span></p>";
    SPA.forEach(function (cat) {
      h += '<div class="category" id="' + cat.id + '"><h2 class="cat-title">' + catIcon(cat.icon) + esc(cat.title[lang]) + "</h2>";
      h += cat.items.map(function (it) {
        var x = it[lang];
        return '<article class="ritual"><div class="ritual-head"><h3>' + esc(x[0]) + '</h3></div><p class="desc">' + esc(x[1]) + '</p><div class="prices">' +
          it.opts.map(function (o) { return '<span class="price-chip"><em>' + o[0] + " " + esc(ui.min) + "</em><b>" + fmt(o[1]) + " <small>" + esc(ui.mad) + "</small></b></span>"; }).join("") + "</div></article>";
      }).join("");
      h += "</div>";
    });
    h += '<p class="note">' + esc(t.note) + "</p></section>";
    h += RT.bottomAction(lang, t.endTitle, "spa", { title: t.endTitle, text: t.endText, cta: t.endCta });
    h += RT.bookFab(lang, "spa");
    return h;
  }

  RT.SPA = SPA;
  RT.mount({ render: render, title: function (l) { return T[l].title; } });
})();
