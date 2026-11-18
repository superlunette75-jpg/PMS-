/* « Aujourd'hui » (réception, gérants) : le Morning briefing du tableau Google, en direct.
   « Tableau de bord » (gérants) : chiffres Little Hotel (réservations, paiements) + activité du riad. */
(function () {
  "use strict";
  var LM = window.LM; if (!LM || !LM.sb) return;
  var sb = LM.sb, esc = LM.esc, app = LM.app;
  var CANCELLED = "Paiement annulé";
  var CHANNEL = { "Booking.com": "Booking.com", "Expedia": "Expedia", "Extranet": "Extranet (direct, agences)", "Mobile App": "Little Hotel (appli mobile)", "Direct Booking": "Site du riad (direct)", "Hotelbeds": "Hotelbeds", "Octorate": "Octorate", "iCal": "Calendrier iCal", "Airbnb": "Airbnb", "Agoda": "Agoda", "Trip.com": "Trip.com", "Google": "Google" };
  function isHammam(label) { return /hammam|gommage|ghassoul|savon|rituel/i.test(label || ""); }
  function localDay(iso) { return new Intl.DateTimeFormat("en-CA", { timeZone: LM.TZ }).format(new Date(iso)); }
  function lname(s) { return String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function fullName(r) { return [r.first_name, r.last_name].filter(Boolean).join(" "); }
  function roomsTotal() { return Number(LM.cache.settings.rooms_total) || 8; }

  /* Rapproche les commandes et check-ins du riad des réservations Little Hotel (même nom, pendant le séjour). */
  function matchOrders(res, orders) {
    var out = [];
    orders.forEach(function (o) {
      var ln = lname(o.guests && o.guests.last_name), first = (o.events || [])[0];
      if (!ln || !first) return;
      var d = localDay(first.starts_at);
      if (lname(res.last_name) === ln && d >= res.arrival && d <= res.departure) out.push(o);
    });
    return out;
  }
  function stayFor(res, stays) { return stays.find(function (s) { return s.guests && lname(s.guests.last_name) === lname(res.last_name) && s.arrival === res.arrival; }); }

  /* ======================= AUJOURD'HUI ======================= */
  LM.view("jour", function () {
    function draw() {
      var d0 = LM.today(), d1 = LM.today(1), dEnd = LM.addDays(d0, 14);
      var from = new Date(d0 + "T00:00:00Z"); from.setUTCHours(-2); var to = new Date(dEnd + "T23:59:00Z");
      Promise.all([
        sb.from("lh_reservations").select("ref, first_name, last_name, arrival, departure, nights, eta, rooms, rooms_count, adults, children, channel, due, notes, status").neq("status", CANCELLED).lte("arrival", dEnd).gte("departure", d0).order("arrival"),
        sb.from("stays").select("id, arrival, departure, people, suite, purpose, purpose_other, transfer_wish, guests(first_name, last_name)").gte("departure", d0).lte("arrival", dEnd),
        sb.from("orders").select("id, short_id, kind, status, details, notes, guests(first_name, last_name), stays(suite), order_items(label_fr, qty), events(starts_at, title, staff_id)").in("status", ["pending", "confirmed", "done"]).gte("requested_at", new Date(Date.now() - 60 * 86400000).toISOString()),
        sb.from("lh_imports").select("imported_at").order("imported_at", { ascending: false }).limit(1)
      ]).then(function (r) {
        var res = r[0].data || [], stays = r[1].data || [], orders = (r[2].data || []).filter(function (o) { return (o.events || []).some(function (e) { return e.starts_at >= from.toISOString() && e.starts_at <= to.toISOString(); }); });
        var lastImport = r[3].data && r[3].data[0];
        var evToday = [];
        orders.forEach(function (o) { (o.events || []).forEach(function (e) { if (localDay(e.starts_at) === d0) evToday.push({ o: o, e: e }); }); });
        evToday.sort(function (a, b) { return a.e.starts_at.localeCompare(b.e.starts_at); });
        var spaT = evToday.filter(function (x) { return x.o.kind === "spa"; });
        var hammam = spaT.filter(function (x) { return (x.o.order_items || []).some(function (i) { return isHammam(i.label_fr); }); });
        var massage = spaT.filter(function (x) { return !(x.o.order_items || []).some(function (i) { return isHammam(i.label_fr); }) || (x.o.order_items || []).some(function (i) { return !isHammam(i.label_fr); }); });
        var dinner = evToday.filter(function (x) { return x.o.kind === "dinner"; }), transfer = evToday.filter(function (x) { return x.o.kind === "transfer"; });
        var ins = res.filter(function (x) { return x.arrival === d0; }), outs = res.filter(function (x) { return x.departure === d0; }), outs1 = res.filter(function (x) { return x.departure === d1; });
        var house = res.filter(function (x) { return x.arrival <= d0 && x.departure > d0; });
        var pax = house.reduce(function (n, x) { return n + (x.adults || 0) + (x.children || 0); }, 0), suitesOcc = house.reduce(function (n, x) { return n + (x.rooms_count || 1); }, 0);
        var covers = dinner.reduce(function (n, x) { return n + (Number(x.o.details && x.o.details.guests) || 0); }, 0);
        function sumPax(list) { return list.reduce(function (n, x) { return n + (x.adults || 0) + (x.children || 0); }, 0); }

        var h = LM.head("Aujourd'hui", esc(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: LM.TZ }).format(new Date()).replace(/^./, function (c) { return c.toUpperCase(); })) + " · réservations Octorate et Little Hotel, demandes en direct.", '<button class="btn solid" id="newOrderJ">Nouvelle demande</button>');
        if (LM.pwa) h += LM.pwa.bannerHtml();
        h += '<div class="brief">' +
          tile("in", ins.length, "Arrivées", sumPax(ins) + " pers.", "#lane-in") + tile("out", outs.length, "Départs", "aujourd'hui", "#lane-out") + tile("out2", outs1.length, "Départs demain", sumPax(outs1) + " pers.", "#lane-out2") +
          tile("hammam", hammam.length, "Hammam", "aujourd'hui", "#lane-spa") + tile("massage", massage.length, "Massages", "aujourd'hui", "#lane-spa") + tile("dinner", dinner.length, "Dîners", covers + " couverts", "#lane-dinner") +
          tile("transfer", transfer.length, "Transferts", "aujourd'hui", "#lane-transfer") + tile("house", suitesOcc + "/" + roomsTotal(), "Suites occupées", pax + " client" + (pax > 1 ? "s" : ""), "#lane-house") +
          (LM.pendingCount ? '<a class="tile t-pending" href="#demandes"><div class="n">' + LM.pendingCount + '</div><div class="l">À traiter</div><div class="s">demandes en attente</div></a>' : "") + "</div>";

        function resLi(x, showDue) {
          var st = stayFor(x, stays);
          return "<li><b>" + esc(fullName(x)) + (st ? ' <span class="pill ok" title="Check-in en ligne fait">check-in ✓</span>' : "") + (showDue && x.due > 0 ? ' <span class="pill due">dû ' + LM.mad(x.due) + "</span>" : "") + "</b><span class='meta'>Suite " + esc(LM.suiteNos(x.rooms) || "?") + " · " + ((x.adults || 0) + (x.children || 0)) + " pers. · " + x.nights + " nuit" + (x.nights > 1 ? "s" : "") + (x.eta ? " · arrivée " + esc(LM.eta(x.eta)) : "") + " · " + esc(CHANNEL[x.channel] || x.channel || "") + "</span></li>";
        }
        function evLi(x) {
          var o = x.o, d = o.details || {};
          var extra = o.kind === "dinner" ? (d.guests || "?") + " couverts" + (d.allergies ? " · ⚠️ " + esc(d.allergies) : "") : o.kind === "transfer" ? "vol " + esc(String(d.flight || "?").toUpperCase()) + " · " + (d.people || 1) + " pers." : (o.order_items || []).map(function (i) { return esc(i.label_fr); }).join(", ");
          return '<li data-open-order="' + o.id + '" style="cursor:pointer"><b>' + LM.time(x.e.starts_at) + " · " + esc(LM.guestName(o) || "Client") + (o.status === "pending" ? ' <span class="status pending">à accepter</span>' : "") + "</b><span class='meta'>" + (o.stays && o.stays.suite ? "Suite " + esc(o.stays.suite) + " · " : "") + extra + "</span></li>";
        }
        function lane(id, cls, title, items, render, empty) { return '<div class="lane" id="lane-' + id + '"><h3 class="t-' + cls + '"><span>' + title + "</span><span>" + items.length + "</span></h3>" + (items.length ? "<ul>" + items.map(render).join("") + "</ul>" : '<div class="none">' + empty + "</div>") + "</div>"; }
        h += '<div class="lanes">' +
          lane("in", "in", "Arrivées aujourd'hui", ins, function (x) { return resLi(x, true); }, "Aucune arrivée") +
          lane("out", "out", "Départs aujourd'hui", outs, function (x) { return resLi(x, true); }, "Aucun départ") +
          lane("out2", "out2", "Départs demain", outs1, function (x) { return resLi(x, true); }, "Aucun départ") +
          lane("spa", "hammam", "Spa aujourd'hui (hammam, massages)", spaT, evLi, "Rien au spa") +
          lane("dinner", "dinner", "Dîners ce soir", dinner, evLi, "Aucun dîner réservé") +
          lane("transfer", "transfer", "Transferts aujourd'hui", transfer, evLi, "Aucun transfert") +
          lane("house", "house", "Clients présents", house, function (x) { return "<li><b>Suite " + esc(LM.suiteNos(x.rooms) || "?") + " · " + esc(fullName(x)) + "</b><span class='meta'>" + ((x.adults || 0) + (x.children || 0)) + " pers. · jusqu'au " + LM.dm(x.departure) + "</span></li>"; }, "Personne") +
          "</div>";

        /* Planning des 14 jours, comme l'onglet « KLM Daily Guest Planning » */
        var rows = res.filter(function (x) { return x.arrival >= d0 || x.departure > d0; });
        h += '<div class="card" style="margin-top:16px"><div class="row between"><h2 style="margin:0">Planning des clients · 14 jours</h2><span class="small muted">Spa, dîners et transferts rapprochés par nom de client</span></div>' +
          '<div class="scroll-x" style="margin-top:8px"><table class="plan"><thead><tr><th>Arrivée</th><th>Heure</th><th>Départ</th><th>Suite</th><th>Client</th><th class="num">Pers.</th><th>Canal</th><th>Transfert</th><th>Spa</th><th>Dîner</th><th>Occasion, notes</th><th class="num">Solde dû</th></tr></thead><tbody>' +
          (rows.length ? rows.map(function (x) {
            var os = matchOrders(x, orders), st = stayFor(x, stays);
            function cellDate(iso) { return '<td class="' + (iso === d0 ? "c-today" : iso === d1 ? "c-tomorrow" : "") + '">' + LM.dm(iso) + "</td>"; }
            function evs(kind, fmt) { return os.filter(function (o) { return o.kind === kind; }).map(fmt).join("<br>"); }
            function when(o) { var e = (o.events || [])[0]; return e ? LM.dm(localDay(e.starts_at)) + " " + LM.time(e.starts_at) : ""; }
            var tr = evs("transfer", function (o) { return "Oui · " + when(o); }) || (st && st.transfer_wish === "yes" ? "Souhaité" : "—");
            var spa = evs("spa", function (o) { return when(o) + " " + esc((o.order_items || []).map(function (i) { return i.label_fr.replace(/\s*\d+\s*min.*/, ""); }).join(", ")); }) || "";
            var din = evs("dinner", function (o) { return when(o) + " · " + ((o.details && o.details.guests) || "?"); }) || "";
            var occ = [st && (st.purpose_other || st.purpose), x.notes].filter(Boolean).map(esc).join(" · ");
            return "<tr>" + cellDate(x.arrival) + "<td>" + esc(LM.eta(x.eta)) + "</td>" + cellDate(x.departure) + "<td>" + esc(LM.suiteNos(x.rooms) || "?") + "</td><td>" + esc(fullName(x)) + (st ? " ✓" : "") + '</td><td class="num">' + ((x.adults || 0) + (x.children || 0)) + "</td><td>" + esc(CHANNEL[x.channel] || x.channel || "") + "</td><td>" + tr + "</td><td>" + spa + "</td><td>" + din + '</td><td class="wrap">' + occ + '</td><td class="num">' + (x.due > 0 ? LM.mad(x.due) : "") + "</td></tr>";
          }).join("") : '<tr><td colspan="12" class="empty">Aucune réservation sur les 14 prochains jours. Importez un export Little Hotel récent (Tableau de bord > Importer).</td></tr>') +
          '</tbody></table></div><div class="keys"><span><i style="background:var(--today)"></i>aujourd\'hui</span><span><i style="background:var(--tomorrow)"></i>demain</span><span>✓ check-in en ligne fait</span></div></div>';
        app.innerHTML = h;
        if (LM.pwa) LM.pwa.bindBanner(app);
        document.getElementById("newOrderJ").addEventListener("click", LM.orderForm);
        app.querySelectorAll("[data-open-order]").forEach(function (li) { li.addEventListener("click", function () { LM.openOrder(li.getAttribute("data-open-order")); }); });
        app.querySelectorAll(".tile[href^='#lane']").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); var t = document.querySelector(a.getAttribute("href")); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }); });
      });
    }
    function tile(cls, n, label, sub, href) { return '<a class="tile t-' + cls + '" href="' + href + '"><div class="n">' + n + '</div><div class="l">' + label + '</div><div class="s">' + sub + "</div></a>"; }
    LM.refresh = draw; draw();
  });

  /* ======================= TABLEAU DE BORD ======================= */
  var DATA = null; // { res: [...], pay: [...], orders: [...], imports: [...] }
  function loadData(force) {
    if (DATA && !force) return Promise.resolve(DATA);
    return Promise.all([
      sb.from("lh_reservations").select("ref, booked_on, channel, last_name, first_name, country, arrival, departure, nights, rooms, rooms_count, adults, children, extras, tourist_tax, total, paid, due, status").order("arrival").limit(5000),
      sb.from("lh_payments").select("paid_on, method, card, description, amount, txn_type").limit(10000),
      sb.from("orders").select("kind, status, total_mad, requested_at, events(starts_at)").in("status", ["confirmed", "done", "pending"]).limit(5000),
      sb.from("lh_imports").select("kind, file_name, rows, imported_at, imported_by").order("imported_at", { ascending: false }).limit(6)
    ]).then(function (r) {
      r.forEach(function (x) { if (x.error) throw x.error; });
      DATA = { res: r[0].data || [], pay: r[1].data || [], orders: r[2].data || [], imports: r[3].data || [] };
      return DATA;
    });
  }
  LM.reloadDash = function () { DATA = null; if (LM.current === "stats") LM.route(); };

  function periodRange(p, custom) {
    var t = LM.today(), y = t.slice(0, 4), m = t.slice(0, 7);
    if (p === "month") return [m + "-01", lastDay(m)];
    if (p === "prev") { var pm = prevMonth(m); return [pm + "-01", lastDay(pm)]; }
    if (p === "year") return [y + "-01-01", y + "-12-31"];
    if (p === "next") return [String(Number(y) + 1) + "-01-01", String(Number(y) + 1) + "-12-31"];
    if (p === "12m") return [LM.addDays(t, -364), t];
    if (p === "90") return [t, LM.addDays(t, 89)];
    return custom;
  }
  function lastDay(ym) { var d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)); return d.toISOString().slice(0, 10); }
  function prevMonth(ym) { var y = Number(ym.slice(0, 4)), mo = Number(ym.slice(5, 7)) - 1; if (!mo) { mo = 12; y--; } return y + "-" + String(mo).padStart(2, "0"); }
  function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000); }
  function monthLabel(ym, short) { return new Intl.DateTimeFormat("fr-FR", { month: short ? "short" : "long", year: short ? "2-digit" : "numeric", timeZone: "UTC" }).format(new Date(ym + "-15T12:00:00Z")); }

  /* Ventile chaque réservation nuit par nuit : CA (hors taxe de séjour) et suites-nuits. */
  function nightly(res, from, to, fn) {
    res.forEach(function (r) {
      if (r.status === CANCELLED || !r.arrival || !r.departure) return;
      var n = Math.max(1, r.nights || daysBetween(r.arrival, r.departure)), rev = ((Number(r.total) || 0) - (Number(r.tourist_tax) || 0)) / n, rooms = Math.min(r.rooms_count || 1, roomsTotal());
      var start = r.arrival < from ? from : r.arrival, endEx = r.departure;
      for (var d = start; d < endEx && d <= to; d = LM.addDays(d, 1)) fn(d, rev, rooms, r);
    });
  }

  function compute(range) {
    var from = range[0], to = range[1], t = LM.today(), days = daysBetween(from, to) + 1, cap = roomsTotal() * days;
    var k = { rev: 0, revPast: 0, rn: 0, rnPast: 0 }, bucketBy = days > 62 ? "month" : "day", buckets = {}, suites = {}, suiteRev = {};
    nightly(DATA.res, from, to, function (d, rev, rooms, r) {
      k.rev += rev; k.rn += rooms; if (d < t) { k.revPast += rev; k.rnPast += rooms; }
      var key = bucketBy === "month" ? d.slice(0, 7) : d;
      var b = buckets[key] = buckets[key] || { rev: 0, rn: 0 }; b.rev += rev; b.rn += rooms;
      var list = String(r.rooms || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
      if (!list.length) list = ["Non attribuée"];
      list.forEach(function (s) { var no = s === "Non attribuée" ? s : "Suite " + LM.suiteNos(s) + (/deluxe/i.test(s) ? " · Deluxe" : /royal/i.test(s) ? " · Royale" : " · Prestige"); suites[no] = (suites[no] || 0) + 1; suiteRev[no] = (suiteRev[no] || 0) + rev / list.length; });
    });
    // Seaux vides (mois ou jours sans réservation) pour un axe continu.
    var keys = [];
    if (bucketBy === "month") { for (var m = from.slice(0, 7); m <= to.slice(0, 7); m = nextMonth(m)) keys.push(m); }
    else { for (var d2 = from; d2 <= to; d2 = LM.addDays(d2, 1)) keys.push(d2); }
    var series = keys.map(function (key) {
      var b = buckets[key] || { rev: 0, rn: 0 };
      var bStart = bucketBy === "month" ? (key + "-01" < from ? from : key + "-01") : key, bEnd = bucketBy === "month" ? (lastDay(key) > to ? to : lastDay(key)) : key;
      var bDays = daysBetween(bStart, bEnd) + 1;
      return { key: key, label: bucketBy === "month" ? monthLabel(key, true) : LM.dm(key), long: bucketBy === "month" ? monthLabel(key) : LM.dayLabel(key), rev: b.rev, rn: b.rn, occ: b.rn / (roomsTotal() * bDays), adr: b.rn ? b.rev / b.rn : 0, future: bEnd >= t };
    });
    // Réservations par date d'arrivée dans la période.
    var arr = DATA.res.filter(function (r) { return r.arrival >= from && r.arrival <= to; });
    var ok = arr.filter(function (r) { return r.status !== CANCELLED; }), cancelled = arr.length - ok.length;
    var lead = ok.filter(function (r) { return r.booked_on; }).map(function (r) { return Math.max(0, daysBetween(r.booked_on, r.arrival)); });
    var ch = {}, co = {}, unknownCountry = 0;
    arr.forEach(function (r) { var c = r.channel || "Autre"; ch[c] = ch[c] || { n: 0, rev: 0, cx: 0 }; if (r.status === CANCELLED) ch[c].cx++; else { ch[c].n++; ch[c].rev += (Number(r.total) || 0) - (Number(r.tourist_tax) || 0); } });
    ok.forEach(function (r) { if (!r.country) { unknownCountry++; return; } var c = normCountry(r.country); co[c] = (co[c] || 0) + 1; });
    var leadB = [["Moins de 7 jours", 0, 6], ["7 à 30 jours", 7, 30], ["31 à 90 jours", 31, 90], ["Plus de 90 jours", 91, 1e9]].map(function (b) { return { label: b[0], value: lead.filter(function (x) { return x >= b[1] && x <= b[2]; }).length }; });
    var pays = DATA.pay.filter(function (p) { return p.paid_on >= from && p.paid_on <= to; }), payM = {};
    pays.forEach(function (p) { var m = payLabel(p); payM[m] = (payM[m] || 0) + (Number(p.amount) || 0); });
    var cashIn = pays.reduce(function (n, p) { return n + (Number(p.amount) || 0); }, 0);
    var dueList = DATA.res.filter(function (r) { return r.status !== CANCELLED && r.due > 0 && r.departure >= t && r.arrival <= LM.addDays(t, 30); }).sort(function (a, b) { return a.arrival.localeCompare(b.arrival); });
    var extras = DATA.orders.filter(function (o) { var e = (o.events || [])[0]; if (!e) return false; var d = localDay(e.starts_at); return d >= from && d <= to && o.status !== "pending"; });
    var extrasBy = {}; extras.forEach(function (o) { extrasBy[o.kind] = extrasBy[o.kind] || { n: 0, mad: 0 }; extrasBy[o.kind].n++; extrasBy[o.kind].mad += o.total_mad || 0; });
    return {
      from: from, to: to, days: days, bucketBy: bucketBy, series: series, rev: k.rev, revPast: k.revPast, rn: k.rn, occ: k.rn / cap, adr: k.rn ? k.rev / k.rn : 0, revpar: k.rev / cap,
      bookings: ok.length, cancelled: cancelled, cxRate: arr.length ? cancelled / arr.length : 0, los: ok.length ? ok.reduce(function (n, r) { return n + (r.nights || 0); }, 0) / ok.length : 0,
      lead: lead.length ? lead.reduce(function (a, b) { return a + b; }, 0) / lead.length : 0, guests: ok.length ? ok.reduce(function (n, r) { return n + (r.adults || 0) + (r.children || 0); }, 0) / ok.length : 0,
      channels: ch, countries: co, unknownCountry: unknownCountry, leadB: leadB, payM: payM, cashIn: cashIn, dueList: dueList, suites: suites, suiteRev: suiteRev, extrasBy: extrasBy
    };
  }
  function nextMonth(ym) { var y = Number(ym.slice(0, 4)), mo = Number(ym.slice(5, 7)) + 1; if (mo > 12) { mo = 1; y++; } return y + "-" + String(mo).padStart(2, "0"); }
  function normCountry(c) { var m = { GB: "Royaume-Uni", "United Kingdom": "Royaume-Uni", FR: "France", DE: "Allemagne", Germany: "Allemagne", Spain: "Espagne", "United States": "États-Unis", Italy: "Italie", Switzerland: "Suisse", Netherlands: "Pays-Bas", Belgium: "Belgique", Morocco: "Maroc", Austria: "Autriche", Portugal: "Portugal", Ireland: "Irlande", Norway: "Norvège", Sweden: "Suède", Poland: "Pologne", Romania: "Roumanie", "United Arab Emirates": "Émirats arabes unis", "Saudi Arabia": "Arabie saoudite", Canada: "Canada", CA: "Canada", Australia: "Australie", BG: "Bulgarie", Bulgaria: "Bulgarie", "Russian Federation": "Russie", Denmark: "Danemark", Latvia: "Lettonie", GR: "Grèce", Hungary: "Hongrie", DE2: "" }; return m[c] || c; }
  function payLabel(p) {
    if (p.method === "Card") return p.card === "American Express" ? "Carte Amex" : p.card === "Mastercard" ? "Carte Mastercard" : "Carte Visa";
    if (p.method === "Cash") return "Espèces";
    if (p.method === "OTA Paid") return "Payé par l'OTA";
    var d = (p.description || "").toLowerCase();
    if (/virtu|booking|expedia/.test(d)) return "Carte virtuelle OTA";
    if (/naps|lien|link|tpe|manuel|manual/.test(d)) return "Lien de paiement NAPS";
    if (/virement|transfer/.test(d)) return "Virement";
    return "Autre";
  }

  /* ---------- Graphiques (SVG, une seule teinte, info-bulle au survol) ---------- */
  function colChart(el, pts, fmt, legend) {
    var W = Math.max(320, Math.min(760, el.clientWidth || 720)), H = W < 500 ? 230 : 260, L = 46, R = 6, T = 14, B = 30, n = pts.length || 1, band = (W - L - R) / n, bw = Math.max(3, Math.min(30, band * 0.62));
    var max = Math.max.apply(null, pts.map(function (p) { return p.v; }).concat([0])); var step = niceStep(max / 4); var top = Math.max(step * 4, step);
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(legend || "") + '"><g class="grid">';
    for (var i = 0; i <= 4; i++) { var v = step * i, yy = y(v); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + esc(fmt.axis(v)) + "</text>"; }
    s += '</g><g class="axis">';
    var every = Math.ceil(n / (W / 46));
    pts.forEach(function (p, i) { if (i % every === 0) s += '<text x="' + (L + band * i + band / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(p.label) + "</text>"; });
    s += "</g>";
    pts.forEach(function (p, i) {
      var x = L + band * i + (band - bw) / 2, yt = y(p.v), base = y(0), h = base - yt, r = Math.min(4, h);
      if (h > 0.5) s += '<path class="bar' + (p.soft ? " soft" : "") + '" data-i="' + i + '" d="M' + x + "," + base + "V" + (yt + r) + "Q" + x + "," + yt + " " + (x + r) + "," + yt + "H" + (x + bw - r) + "Q" + (x + bw) + "," + yt + " " + (x + bw) + "," + (yt + r) + "V" + base + 'Z"/>';
      s += '<rect class="hit" data-i="' + i + '" x="' + (L + band * i) + '" y="' + T + '" width="' + band + '" height="' + (H - T - B) + '"/>';
    });
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#cfc8ba"/></svg><div class="tip" hidden></div>';
    el.innerHTML = s;
    var tip = el.querySelector(".tip"), svg = el.querySelector("svg");
    function show(i) {
      var p = pts[i]; if (!p) return;
      el.querySelectorAll(".bar").forEach(function (b) { b.classList.toggle("hl", Number(b.getAttribute("data-i")) === i); });
      tip.innerHTML = p.tip; tip.hidden = false;
      var x = (L + band * i + band / 2) / W * 100, yy = Math.min(y(p.v), H - B - 4) / H * 100;
      tip.style.left = Math.min(88, Math.max(12, x)) + "%"; tip.style.top = yy + "%";
    }
    function hide() { tip.hidden = true; el.querySelectorAll(".bar.hl").forEach(function (b) { b.classList.remove("hl"); }); }
    svg.addEventListener("mousemove", function (e) { var t = e.target.getAttribute && e.target.getAttribute("data-i"); if (t != null) show(Number(t)); });
    svg.addEventListener("mouseleave", hide);
    svg.addEventListener("click", function (e) { var t = e.target.getAttribute && e.target.getAttribute("data-i"); if (t != null) show(Number(t)); else hide(); });
  }
  function niceStep(x) { if (x <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function hbars(items, fmt, sub) {
    var max = Math.max.apply(null, items.map(function (x) { return x.value; }).concat([1]));
    return items.length ? '<div class="hbars">' + items.map(function (x) {
      return '<div class="hbar" title="' + esc(x.label + " : " + fmt(x.value) + (sub && sub(x) ? " · " + sub(x).replace(/<[^>]+>/g, "") : "")) + '"><span class="lab">' + esc(x.label) + '</span><span class="track"><span class="fill" style="width:' + Math.max(0.5, x.value / max * 100) + '%"></span></span><span class="val">' + fmt(x.value) + (sub ? " <small>" + sub(x) + "</small>" : "") + "</span></div>";
    }).join("") + "</div>" : '<div class="empty">Pas de données sur cette période.</div>';
  }
  function kmad(v) { return v >= 1e6 ? LM.num(v / 1e6, 1) + " M" : v >= 1e3 ? LM.num(v / 1e3, v >= 1e5 ? 0 : 1) + " k" : LM.num(v); }
  function pct(v) { return LM.num(v * 100, 0) + " %"; }

  LM.view("stats", function () {
    var state = { p: "year", custom: [LM.today().slice(0, 4) + "-01-01", LM.today()], metric: "rev", table: false };
    app.innerHTML = LM.head("Tableau de bord", "Chargement des données Little Hotel…");
    loadData().then(render, function (e) { LM.fail(e); app.innerHTML = '<div class="card">Impossible de charger les données : ' + esc(e.message) + "</div>"; });

    function render() {
      var range = periodRange(state.p, state.custom), c = compute(range), t = LM.today();
      var imp = DATA.imports[0];
      var h = LM.head("Tableau de bord", "Du " + LM.fmtDay(c.from) + " au " + LM.fmtDay(c.to) + " · " + LM.num(DATA.res.length) + " réservations" + (imp ? ", dernier import Little Hotel le " + LM.fmt(imp.imported_at, { weekday: undefined }) : ""), '<button class="btn" id="imp">' + LM.icon("upload") + " Importer CSV</button>");
      h += '<div class="row" style="margin-bottom:14px;gap:8px"><div class="seg" role="tablist">' + [["month", "Ce mois"], ["prev", "Mois dernier"], ["year", "Année " + t.slice(0, 4)], ["12m", "12 derniers mois"], ["90", "90 prochains jours"], ["next", "Année " + (Number(t.slice(0, 4)) + 1)], ["custom", "Dates…"]].map(function (x) { return '<button data-p="' + x[0] + '" class="' + (state.p === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>" +
        (state.p === "custom" ? '<input type="date" class="input" id="cFrom" value="' + state.custom[0] + '" style="width:auto"><input type="date" class="input" id="cTo" value="' + state.custom[1] + '" style="width:auto">' : "") + "</div>";
      var futureShare = c.rev ? (c.rev - c.revPast) / c.rev : 0;
      h += '<div class="kpis">' +
        kpi("Chiffre d'affaires", kmad(c.rev), "MAD", (c.from < t && c.to >= t) ? "dont " + kmad(c.rev - c.revPast) + " MAD à venir" : c.from >= t ? "sur les livres (à venir)" : "hébergement + suppléments, hors taxe de séjour", true) +
        kpi("Taux d'occupation", LM.num(c.occ * 100, 0), "%", LM.num(c.rn) + " nuits vendues sur " + LM.num(roomsTotal() * c.days)) +
        kpi("Prix moyen par nuit", LM.num(c.adr), "MAD", "ADR, par suite occupée") +
        kpi("RevPAR", LM.num(c.revpar), "MAD", "revenu par suite disponible") +
        kpi("Réservations", LM.num(c.bookings), "", "arrivées sur la période · " + LM.num(c.guests, 1) + " pers. en moyenne") +
        kpi("Durée moyenne", LM.num(c.los, 1), "nuits", "par réservation") +
        kpi("Délai de réservation", LM.num(c.lead), "jours", "en moyenne avant l'arrivée") +
        kpi("Annulations", LM.num(c.cxRate * 100, 0), "%", c.cancelled + " réservation" + (c.cancelled > 1 ? "s" : "") + " annulée" + (c.cancelled > 1 ? "s" : "")) +
        kpi("Encaissé", kmad(c.cashIn), "MAD", "paiements saisis sur la période") +
        kpi("Reste à encaisser", kmad(c.dueList.reduce(function (n, r) { return n + (Number(r.due) || 0); }, 0)), "MAD", c.dueList.length + " séjour" + (c.dueList.length > 1 ? "s" : "") + " des 30 prochains jours") + "</div>";
      h += '<div class="dash">';
      h += '<div class="card wide"><div class="row between"><h2 style="margin:0">' + (c.bucketBy === "month" ? "Par mois" : "Par jour") + '</h2><div class="row" style="gap:8px"><div class="seg">' + [["rev", "Chiffre d'affaires"], ["occ", "Occupation"], ["adr", "Prix moyen"]].map(function (x) { return '<button data-m="' + x[0] + '" class="' + (state.metric === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + '</div><button class="btn sm" id="tbl">' + (state.table ? "Graphique" : "Tableau") + "</button></div></div>" +
        '<div class="lgd"><span><i style="background:var(--viz)"></i>Réalisé</span><span><i style="background:var(--viz-soft)"></i>En cours et à venir (réservations déjà prises)</span></div><div id="main" class="chart"></div></div>';
      var chList = Object.keys(c.channels).map(function (k) { var x = c.channels[k]; return { label: CHANNEL[k] || k, value: x.rev, n: x.n, cx: x.cx }; }).sort(function (a, b) { return b.value - a.value; });
      var chTotal = chList.reduce(function (n, x) { return n + x.value; }, 0);
      h += '<div class="card"><h2>Canaux de vente</h2><p class="small muted" style="margin-top:-6px">Chiffre d\'affaires des réservations arrivant sur la période.</p>' + hbars(chList, function (v) { return kmad(v) + " MAD"; }, function (x) { return (chTotal ? LM.num(x.value / chTotal * 100) : 0) + " % · " + x.n + " rés." + (x.cx ? " · " + x.cx + " annul." : ""); }) + "</div>";
      var coList = Object.keys(c.countries).map(function (k) { return { label: k, value: c.countries[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 10);
      h += '<div class="card"><h2>Origine des clients</h2><p class="small muted" style="margin-top:-6px">Top 10, en réservations' + (c.unknownCountry ? " · pays non renseigné pour " + c.unknownCountry + " réservation" + (c.unknownCountry > 1 ? "s" : "") + " (souvent saisies directes et agences)" : "") + ".</p>" + hbars(coList, function (v) { return LM.num(v); }) + "</div>";
      var suList = Object.keys(c.suites).map(function (k) { return { label: k, value: c.suites[k] / c.days, rev: c.suiteRev[k] }; }).sort(function (a, b) { return a.label.localeCompare(b.label, "fr", { numeric: true }); });
      h += '<div class="card"><h2>Occupation par suite</h2><p class="small muted" style="margin-top:-6px">Part des nuits de la période où la suite était vendue.</p>' + hbars(suList, function (v) { return pct(v); }, function (x) { return kmad(x.rev) + " MAD"; }) + "</div>";
      var pmList = Object.keys(c.payM).map(function (k) { return { label: k, value: c.payM[k] }; }).sort(function (a, b) { return b.value - a.value; });
      h += '<div class="card"><h2>Encaissements par moyen</h2><p class="small muted" style="margin-top:-6px">Paiements Little Hotel saisis sur la période, remboursements déduits.</p>' + hbars(pmList, function (v) { return kmad(v) + " MAD"; }, function (x) { return c.cashIn ? LM.num(x.value / c.cashIn * 100) + " %" : ""; }) + "</div>";
      h += '<div class="card"><h2>Délai de réservation</h2><p class="small muted" style="margin-top:-6px">Combien de temps avant l\'arrivée les clients réservent.</p>' + hbars(c.leadB, function (v) { return LM.num(v) + " rés."; }) + "</div>";
      var ex = c.extrasBy, exKeys = ["transfer", "spa", "dinner", "concierge"].filter(function (k) { return ex[k]; });
      h += '<div class="card"><h2>Services du riad</h2><p class="small muted" style="margin-top:-6px">Demandes acceptées via le guide et l\'appli (transferts, spa, dîners, excursions).</p>' + (exKeys.length ? hbars(exKeys.map(function (k) { return { label: LM.KIND[k], value: ex[k].mad, n: ex[k].n }; }), function (v) { return LM.num(v) + " MAD"; }, function (x) { return x.n + " demande" + (x.n > 1 ? "s" : ""); }) : '<div class="empty">Aucune demande acceptée sur cette période.</div>') + "</div>";
      h += '<div class="card wide"><h2>Soldes à encaisser · 30 prochains jours</h2><p class="small muted" style="margin-top:-6px">Montant dû selon Little Hotel (clients présents et arrivées à venir). Les cartes virtuelles Booking et Expedia y figurent tant qu\'elles ne sont pas débitées.</p>' +
        (c.dueList.length ? '<div class="scroll-x"><table class="stack"><thead><tr><th>Arrivée</th><th>Client</th><th>Suite</th><th>Canal</th><th class="num">Total</th><th class="num">Dû</th></tr></thead><tbody>' + c.dueList.map(function (r) { return "<tr><td data-label='Arrivée'>" + LM.dm(r.arrival) + " → " + LM.dm(r.departure) + "</td><td data-label='Client'>" + esc(fullName(r)) + "</td><td data-label='Suite'>" + esc(LM.suiteNos(r.rooms) || "?") + "</td><td data-label='Canal'>" + esc(CHANNEL[r.channel] || r.channel || "") + "</td><td data-label='Total' class='num'>" + LM.mad(r.total) + "</td><td data-label='Dû' class='num'><b>" + LM.mad(r.due) + "</b></td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="empty">Rien à encaisser.</div>') + "</div>";
      h += "</div>";
      app.innerHTML = h;

      var main = document.getElementById("main"), M = state.metric;
      var fmt = M === "rev" ? { axis: kmad, tip: function (v) { return LM.mad(v); } } : M === "occ" ? { axis: function (v) { return LM.num(v * 100) + " %"; }, tip: pct } : { axis: kmad, tip: function (v) { return LM.mad(v); } };
      var pts = c.series.map(function (s) { var v = M === "rev" ? s.rev : M === "occ" ? s.occ : s.adr; return { label: s.label, v: v, soft: s.future, tip: "<b>" + esc(s.long) + "</b><br>CA " + LM.mad(s.rev) + "<br>Occupation " + pct(s.occ) + " · " + LM.num(s.rn) + " nuits<br>Prix moyen " + (s.rn ? LM.mad(s.adr) : "—") }; });
      if (state.table) main.innerHTML = '<table class="stack"><thead><tr><th>' + (c.bucketBy === "month" ? "Mois" : "Jour") + '</th><th class="num">CA</th><th class="num">Nuits</th><th class="num">Occupation</th><th class="num">Prix moyen</th></tr></thead><tbody>' + c.series.map(function (s) { return "<tr><td><b>" + esc(s.long) + "</b>" + (s.future ? " <span class='pill'>à venir</span>" : "") + "</td><td class='num' data-label='CA'>" + LM.mad(s.rev) + "</td><td class='num' data-label='Nuits'>" + LM.num(s.rn) + "</td><td class='num' data-label='Occupation'>" + pct(s.occ) + "</td><td class='num' data-label='Prix moyen'>" + (s.rn ? LM.mad(s.adr) : "—") + "</td></tr>"; }).join("") + "</tbody></table>";
      else colChart(main, pts, fmt, M === "rev" ? "Chiffre d'affaires" : M === "occ" ? "Taux d'occupation" : "Prix moyen par nuit");

      app.querySelectorAll("[data-p]").forEach(function (b) { b.addEventListener("click", function () { state.p = b.getAttribute("data-p"); render(); }); });
      app.querySelectorAll("[data-m]").forEach(function (b) { b.addEventListener("click", function () { state.metric = b.getAttribute("data-m"); state.table = false; render(); }); });
      document.getElementById("tbl").addEventListener("click", function () { state.table = !state.table; render(); });
      ["cFrom", "cTo"].forEach(function (id, i) { var el = document.getElementById(id); if (el) el.addEventListener("change", function () { state.custom[i] = el.value; if (state.custom[0] <= state.custom[1]) render(); }); });
      document.getElementById("imp").addEventListener("click", function () { if (LM.lhImport) LM.lhImport(); });
    }
    function kpi(l, v, unit, s, hero) { return '<div class="kpi' + (hero ? " hero" : "") + '"><div class="l">' + esc(l) + '</div><div class="v">' + v + (unit ? "<small>" + esc(unit) + "</small>" : "") + '</div><div class="s">' + esc(s || "") + "</div></div>"; }
  });
})();
