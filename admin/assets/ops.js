/* Écrans d'opération : agenda, demandes, clients, planning métier, réglages, aide, menu « Plus ». */
(function () {
  "use strict";
  var LM = window.LM; if (!LM || !LM.sb) return;
  var sb = LM.sb, esc = LM.esc, app = LM.app, KIND = LM.KIND, STATUS = LM.STATUS, ROLE = LM.ROLE;
  var DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  var RKIND = { spa: "Spa", vehicle: "Véhicule", dining: "Table", guide: "Guide" };
  function staffName(id) { var s = LM.cache.staff.find(function (x) { return x.id === id; }); return s ? s.name : ""; }
  function head(title, sub, right) { return '<div class="head"><div><h1>' + esc(title) + "</h1>" + (sub ? '<p class="muted small">' + sub + "</p>" : "") + "</div>" + (right ? '<div class="row">' + right + "</div>" : "") + "</div>"; }
  LM.head = head;

  /* ---------- Carte d'une commande (réception, gérants) ---------- */
  function orderCard(o, full) {
    var g = o.guests || {}, evs = (o.events || []).slice().sort(function (a, b) { return a.starts_at.localeCompare(b.starts_at); });
    var h = '<div class="order"><div class="row between"><span class="kind">' + esc(KIND[o.kind]) + " · n° " + esc(o.short_id) + '</span><span class="status ' + esc(o.status) + '">' + esc(STATUS[o.status]) + "</span></div>";
    h += '<div class="title">' + esc(LM.guestName(o) || (o.details && o.details.guestName) || "Client") + (o.stays && o.stays.suite ? " · Suite " + esc(o.stays.suite) : o.details && o.details.suite ? " · Suite " + esc(o.details.suite) : "") + "</div>";
    evs.forEach(function (e) { h += "<div>🗓 " + esc(e.title) + " · <b>" + LM.fmt(e.starts_at) + "</b>" + (e.staff_id ? ' <span class="small muted">· ' + esc(staffName(e.staff_id)) + "</span>" : "") + "</div>"; });
    if (g.phone_e164) h += '<div>📱 <a href="' + LM.wa(g.phone_e164) + '" target="_blank" rel="noreferrer">' + esc(g.phone_e164) + "</a>" + (o.lang && o.lang !== "fr" ? " · langue : " + esc(o.lang) : "") + "</div>";
    var d = o.details || {};
    if (o.kind === "transfer") h += "<div>✈️ Vol " + esc(d.flight || "?") + " · " + esc(d.people || 1) + " pers." + (d.round ? " · retour vol " + esc(d.backFlight) + " le " + LM.fmtDay(d.backDate) + " à " + esc(d.backTime) : "") + "</div>";
    if (o.kind === "dinner") h += "<div>🍽 " + esc(d.guests || "?") + " convives" + (d.allergies ? " · " + esc(d.allergies) : "") + "</div>";
    if (o.kind === "concierge" && d.details) h += "<div>" + esc(d.details) + "</div>";
    if (o.order_items && o.order_items.length) h += "<ul>" + o.order_items.map(function (i) { return "<li>" + i.qty + " x " + esc(i.label_fr) + (i.unit_price_mad ? " · " + i.unit_price_mad * i.qty + " MAD" : "") + "</li>"; }).join("") + "</ul>";
    if (o.total_mad) h += "<div><b>Total : " + o.total_mad + " MAD</b></div>";
    if (o.notes) h += '<div class="muted">Remarques : ' + esc(o.notes) + "</div>";
    if (full && o.guest_message) h += '<details><summary class="small muted">Message d\'origine</summary><pre class="small" style="white-space:pre-wrap">' + esc(o.guest_message) + "</pre></details>";
    h += '<div class="small muted">Reçu le ' + LM.fmt(o.requested_at) + (o.decided_at ? " · " + esc(STATUS[o.status]).toLowerCase() + " le " + LM.fmt(o.decided_at) + (o.decided_by ? " par " + esc(staffName(o.decided_by)) : "") : "") + "</div>";
    h += '<div class="row">' + actions(o, g) + "</div></div>";
    return h;
  }
  LM.orderCard = orderCard;
  function actions(o, g) {
    var b = [];
    if (o.status === "pending") b.push(["confirmed", "ok", "✅ Accepter"], ["declined", "no", "❌ Refuser"]);
    else if (o.status === "confirmed") b.push(["done", "", "✔️ Terminé"], ["cancelled", "no", "Annuler"]);
    else b.push(["pending", "", "Remettre en attente"]);
    var h = b.map(function (x) { return '<button class="btn sm ' + x[1] + '" data-status="' + x[0] + '" data-order="' + o.id + '">' + x[2] + "</button>"; }).join("");
    g = g || {};
    if (g.phone_e164) h += '<a class="btn sm" target="_blank" rel="noreferrer" href="' + LM.wa(g.phone_e164, o.status === "confirmed" ? "Bonjour " + (g.first_name || "") + ", Kasbah La Moun : votre demande n° " + o.short_id + " est confirmée. À très bientôt !" : "") + '">💬 WhatsApp</a>';
    return h;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-status][data-order]"); if (!b) return;
    b.disabled = true;
    LM.api("/status", { orderId: b.getAttribute("data-order"), status: b.getAttribute("data-status") }).then(function () {
      LM.toast("Statut : " + STATUS[b.getAttribute("data-status")]); LM.countPending();
      if (LM.cal) LM.cal.refetchEvents(); LM.closePanel(); if (LM.refresh) LM.refresh();
    }, function (err) { b.disabled = false; LM.fail(err); });
  });

  /* ---------- Agenda ---------- */
  LM.view("agenda", function () {
    var office = LM.isOffice();
    app.innerHTML = head("Agenda", office ? "Tous les créneaux du riad. Touchez un créneau pour agir." : "Vos créneaux. Touchez-en un pour le détail.",
      office ? '<button class="btn" id="newBlock">Fermer un créneau</button><button class="btn solid" id="newOrder">Nouvelle demande</button>' : "") +
      (office ? '<div class="filters"><select id="fStaff" aria-label="Personne"><option value="">Toute l\'équipe</option>' + LM.cache.staff.filter(function (s) { return s.active; }).map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + " · " + esc(ROLE[s.role] || s.role) + "</option>"; }).join("") + "</select>" +
        '<select id="fRes" aria-label="Ressource"><option value="">Toutes les ressources</option>' + LM.cache.resources.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") + "</select>" +
        '<select id="fStatus" aria-label="Statut"><option value="">En attente et confirmés</option><option value="all">Tout, refus et annulations compris</option></select></div>' : "") +
      '<p class="legend">' + ["transfer", "spa", "dinner", "concierge", "block"].map(function (k) { return '<span><i style="background:' + LM.COLOR[k] + '"></i>' + esc(KIND[k]) + "</span>"; }).join("") + "<span>⏳ en attente de réponse</span></p>" +
      '<div id="cal"></div>';
    var mobile = !LM.DESKTOP.matches;
    LM.cal = new FullCalendar.Calendar(document.getElementById("cal"), {
      locale: "fr", timeZone: LM.TZ, initialView: mobile ? "listWeek" : "timeGridWeek", height: "auto", nowIndicator: true, firstDay: 1, slotMinTime: "06:00:00", slotMaxTime: "24:00:00",
      headerToolbar: mobile ? { left: "prev,next", center: "title", right: "listWeek,timeGridDay,dayGridMonth" } : { left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth,listWeek" },
      buttonText: { today: "Aujourd'hui", day: "Jour", week: "Semaine", month: "Mois", list: "Liste" }, noEventsContent: "Rien de prévu sur cette période",
      events: function (info, ok, ko) {
        if (!office) {
          return sb.rpc("my_jobs", { p_from: info.start.toISOString(), p_to: info.end.toISOString() }).then(function (r) {
            if (r.error) return ko(r.error);
            ok((r.data || []).map(function (j) { var k = j.order ? j.order.kind : "block"; return { id: j.id, title: (j.status === "pending" ? "⏳ " : "") + j.title + (j.order ? " · " + LM.guestName(j.order) : ""), start: j.starts_at, end: j.ends_at, color: LM.COLOR[k], classNames: [j.status], extendedProps: { job: j } }; }));
          });
        }
        var q = sb.from("events").select("*, orders(short_id, kind, status, guests(first_name, last_name, phone_e164), stays(suite)), resources(name), staff(name)")
          .gte("starts_at", info.start.toISOString()).lte("starts_at", info.end.toISOString());
        var fs = document.getElementById("fStaff").value, fr = document.getElementById("fRes").value, fst = document.getElementById("fStatus").value;
        if (fs) q = q.eq("staff_id", fs); if (fr) q = q.eq("resource_id", fr); if (fst !== "all") q = q.in("status", ["pending", "confirmed", "done"]);
        q.then(function (r) {
          if (r.error) return ko(r.error);
          ok((r.data || []).map(function (e) {
            var k = e.kind === "block" ? "block" : (e.orders && e.orders.kind) || "concierge";
            return { id: e.id, title: (e.status === "pending" ? "⏳ " : "") + e.title + (LM.guestName(e.orders) ? " · " + LM.guestName(e.orders) : ""), start: e.starts_at, end: e.ends_at, color: LM.COLOR[k], classNames: [e.status], extendedProps: e };
          }));
        });
      },
      eventClick: function (i) { if (i.event.extendedProps.job) jobPanel(i.event.extendedProps.job); else openEvent(i.event.extendedProps); }
    });
    LM.cal.render();
    if (office) {
      ["fStaff", "fRes", "fStatus"].forEach(function (id) { document.getElementById(id).addEventListener("change", function () { LM.cal.refetchEvents(); }); });
      document.getElementById("newBlock").addEventListener("click", blockForm);
      document.getElementById("newOrder").addEventListener("click", orderForm);
    }
  });

  function openEvent(e) {
    if (e.kind === "block") {
      LM.openPanel("<h2>Fermeture</h2><p>" + esc(e.title) + "</p><p>" + LM.fmt(e.starts_at) + " → " + LM.fmt(e.ends_at) + "</p>" + (e.resources ? "<p>" + esc(e.resources.name) + "</p>" : "") + '<button class="btn no" id="delBlock">Supprimer la fermeture</button>');
      document.getElementById("delBlock").addEventListener("click", function () {
        sb.from("events").delete().eq("id", e.id).then(function (r) { if (r.error) return LM.fail(r.error); LM.toast("Fermeture supprimée"); LM.closePanel(); LM.cal && LM.cal.refetchEvents(); });
      });
      return;
    }
    openOrder(e.order_id, e);
  }
  function openOrder(orderId, e) {
    sb.from("orders").select("*, guests(*), stays(*), order_items(*), events(*)").eq("id", orderId).maybeSingle().then(function (r) {
      if (r.error || !r.data) return LM.fail(r.error || new Error("Commande introuvable"));
      var o = r.data, cur = (o.events || [])[0] || {};
      var people = LM.cache.staff.filter(function (s) { return s.active; });
      LM.openPanel('<div class="card">' + orderCard(o, true) + "</div>" +
        '<div class="card"><label class="f"><span>Attribuer à</span><select id="assign"><option value="">Personne en particulier</option>' + people.map(function (s) { return '<option value="' + s.id + '"' + (cur.staff_id === s.id ? " selected" : "") + ">" + esc(s.name) + " · " + esc(ROLE[s.role] || s.role) + "</option>"; }).join("") + "</select></label>" +
        '<p class="small muted" style="margin:8px 0 0">La personne choisie voit la demande dans son planning et la reçoit sur Telegram et en notification.' + (e && e.resources ? " Ressource : " + esc(e.resources.name) + "." : "") + "</p></div>");
      document.getElementById("assign").addEventListener("change", function (ev) {
        var to = ev.target.value; ev.target.disabled = true;
        LM.api("/status", { orderId: o.id, assignTo: to }).then(function () { ev.target.disabled = false; LM.toast(to ? "Attribué à " + staffName(to) : "Attribution retirée"); LM.cal && LM.cal.refetchEvents(); if (LM.refresh) LM.refresh(); }, function (err) { ev.target.disabled = false; LM.fail(err); });
      });
    });
  }
  LM.openOrder = openOrder;

  function blockForm() {
    LM.openPanel("<h2>Fermer un créneau</h2><p class='small muted'>Jour de repos, nettoyage, spa indisponible : rien ne pourra être réservé sur cette ressource pendant ce temps.</p>" +
      '<form id="blockF" class="order"><label class="f"><span>Ressource</span><select name="resource" required>' + LM.cache.resources.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") + "</select></label>" +
      '<label class="f"><span>Début</span><input type="datetime-local" name="start" required></label><label class="f"><span>Fin</span><input type="datetime-local" name="end" required></label>' +
      '<label class="f"><span>Motif</span><input name="reason" placeholder="Fermeture, repos, entretien"></label><button class="btn solid" type="submit">Enregistrer</button></form>');
    document.getElementById("blockF").addEventListener("submit", function (ev) {
      ev.preventDefault(); var f = ev.target;
      sb.from("events").insert({ kind: "block", resource_id: f.resource.value, starts_at: new Date(f.start.value).toISOString(), ends_at: new Date(f.end.value).toISOString(), title: f.reason.value || "Fermeture", status: "confirmed", exclusive: true })
        .then(function (r) { if (r.error) return LM.fail(r.error.code === "23P01" ? new Error("Un créneau existe déjà sur cette période.") : r.error); LM.toast("Créneau fermé"); LM.closePanel(); LM.cal && LM.cal.refetchEvents(); });
    });
  }

  function orderForm() {
    LM.openPanel("<h2>Nouvelle demande</h2><p class='small muted'>Demande reçue par téléphone ou au comptoir : elle rejoint l'agenda et Telegram comme les autres.</p>" +
      '<form id="orderF" class="order"><label class="f"><span>Type</span><select name="kind"><option value="transfer">Transfert</option><option value="spa">Spa</option><option value="dinner">Dîner</option><option value="concierge">Conciergerie</option></select></label>' +
      '<label class="f"><span>Nom du client</span><input name="name" required></label><label class="f"><span>WhatsApp</span><input name="phone" type="tel" required placeholder="+33 6…"></label><label class="f"><span>Suite</span><input name="suite" inputmode="numeric"></label>' +
      '<label class="f"><span>Date</span><input type="date" name="date" required value="' + LM.today() + '"></label><label class="f"><span>Heure</span><input type="time" name="time" required value="19:00"></label>' +
      '<label class="f"><span>Personnes</span><input type="number" name="people" min="1" value="2" inputmode="numeric"></label>' +
      '<label class="f" data-k="transfer"><span>Numéro de vol</span><input name="flight"></label>' +
      '<label class="f" data-k="spa concierge"><span>Intitulé (soin, excursion, demande)</span><input name="label"></label><label class="f" data-k="spa"><span>Durée (min)</span><input type="number" name="duration" value="60" min="15" step="15"></label>' +
      '<label class="f" data-k="spa concierge transfer"><span>Prix (MAD)</span><input type="number" name="price" min="0" inputmode="numeric"></label>' +
      '<label class="f"><span>Remarques, allergies</span><textarea name="notes"></textarea></label><button class="btn solid" type="submit">Enregistrer</button></form>');
    var f = document.getElementById("orderF");
    function show() { var k = f.kind.value; f.querySelectorAll("[data-k]").forEach(function (l) { l.hidden = l.getAttribute("data-k").split(" ").indexOf(k) < 0; }); }
    f.kind.addEventListener("change", show); show();
    f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var k = f.kind.value, price = f.price.value ? Number(f.price.value) : null, items = [], details = {};
      var people = Number(f.people.value) || 1, date = f.date.value, time = f.time.value;
      if (k === "transfer") { details = { flight: f.flight.value, date: date, time: time, people: people, name: f.name.value }; items = [{ key: "transfer-in", labelFr: "Transfert arrivée (aéroport → riad)", qty: 1, unitPriceMad: price, durationMin: 90 }]; }
      if (k === "spa") { details = { date: date, slot: time, people: people }; items = [{ key: "manual", labelFr: f.label.value || "Soin", qty: 1, unitPriceMad: price, durationMin: Number(f.duration.value) || 60 }]; }
      if (k === "dinner") { details = { date: date, time: time, guests: people, allergies: f.notes.value }; }
      if (k === "concierge") { details = { requestId: "autre", labelFr: f.label.value || "Demande", date: date, people: people, details: f.notes.value, priceMad: price }; }
      f.querySelector("button[type=submit]").disabled = true;
      LM.api("/order", { kind: k, lang: "fr", guest: { name: f.name.value, phone: f.phone.value, suite: f.suite.value }, items: items, details: details, notes: f.notes.value, message: "Saisie par " + LM.me.name })
        .then(function (r) { LM.toast("Demande n° " + r.orderId + " enregistrée"); LM.closePanel(); LM.cal && LM.cal.refetchEvents(); LM.countPending(); if (LM.refresh) LM.refresh(); }, function (e) { f.querySelector("button[type=submit]").disabled = false; LM.fail(e); });
    });
  }
  LM.orderForm = orderForm;

  /* ---------- Demandes ---------- */
  LM.view("demandes", function () {
    var filter = "pending";
    function draw() {
      var since = new Date(Date.now() - 3 * 86400000).toISOString();
      sb.from("orders").select("*, guests(*), stays(suite), order_items(*), events(title, starts_at, staff_id)").or("status.eq.pending,requested_at.gte." + since).order("requested_at", { ascending: false }).limit(200).then(function (r) {
        if (r.error) return LM.fail(r.error);
        var list = r.data || [], pend = list.filter(function (o) { return o.status === "pending"; });
        var rows = filter === "pending" ? pend : filter === "all" ? list : list.filter(function (o) { return o.kind === filter; });
        app.innerHTML = head("Demandes", "Ce qui attend une réponse, puis les demandes des trois derniers jours.", '<button class="btn solid" id="newOrder2">Nouvelle demande</button>') +
          '<div class="chips" style="margin-bottom:12px">' + [["pending", "À traiter (" + pend.length + ")"], ["all", "Toutes"], ["transfer", "Transferts"], ["spa", "Spa"], ["dinner", "Dîners"], ["concierge", "Conciergerie"]].map(function (c) { return '<button class="chip' + (filter === c[0] ? " on" : "") + '" data-f="' + c[0] + '">' + c[1] + "</button>"; }).join("") + "</div>" +
          (rows.length ? '<div class="grid">' + rows.map(function (o) { return '<div class="card k-' + o.kind + '">' + orderCard(o) + "</div>"; }).join("") + "</div>" : '<div class="card empty">' + (filter === "pending" ? "Rien en attente. 👌" : "Aucune demande.") + "</div>");
        app.querySelectorAll("[data-f]").forEach(function (b) { b.addEventListener("click", function () { filter = b.getAttribute("data-f"); draw(); }); });
        document.getElementById("newOrder2").addEventListener("click", orderForm);
      });
    }
    LM.refresh = draw; draw();
  });

  /* ---------- Clients ---------- */
  LM.view("clients", function () {
    var d = LM.today();
    app.innerHTML = head("Clients", "Check-ins en ligne : arrivées, départs, présents. Recherche par nom ou téléphone.") +
      '<form id="search" class="row" style="margin-bottom:14px"><input class="input" name="q" placeholder="Nom ou téléphone" style="flex:1"><button class="btn" type="submit">Chercher</button></form><div id="clist"><p class="muted">Chargement…</p></div>';
    function show(title, rows) {
      return "<h2>" + title + " (" + rows.length + ")</h2>" + (rows.length ? "<div class='card'><table class='stack'><thead><tr><th>Client</th><th>Séjour</th><th>Suite</th><th>Pers.</th><th>Transfert</th><th>Contact</th></tr></thead><tbody>" + rows.map(function (s) {
        var g = s.guests || {};
        return "<tr><td data-label='Client'>" + esc([g.first_name, g.last_name].filter(Boolean).join(" ")) + "<br><span class='small muted'>" + esc(g.nationality || "") + (g.lang && g.lang !== "fr" ? " · " + esc(g.lang) : "") + "</span></td><td data-label='Séjour'>" + LM.fmtDay(s.arrival) + " → " + LM.fmtDay(s.departure) + (s.checkout_time ? "<br><span class='small muted'>départ " + String(s.checkout_time).slice(0, 5) + "</span>" : "") + "</td><td data-label='Suite'>" + esc(s.suite || "—") + "</td><td data-label='Personnes'>" + s.people + "</td><td data-label='Transfert'>" + esc({ yes: "souhaité", no: "non", maybe: "?" }[s.transfer_wish] || "—") + (s.flight_out ? "<br><span class='small muted'>vol " + String(s.flight_out).slice(0, 5) + "</span>" : "") + "</td><td data-label='Contact'>" + (g.phone_e164 ? '<a href="' + LM.wa(g.phone_e164) + '" target="_blank" rel="noreferrer">' + esc(g.phone_e164) + "</a>" : "") + (g.email ? "<br><span class='small'>" + esc(g.email) + "</span>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : "<p class='muted'>Personne.</p>");
    }
    var sel = "*, guests(*)";
    Promise.all([sb.from("stays").select(sel).eq("arrival", d), sb.from("stays").select(sel).eq("departure", d), sb.from("stays").select(sel).lte("arrival", d).gt("departure", d).order("arrival")]).then(function (r) {
      document.getElementById("clist").innerHTML = show("Arrivées aujourd'hui", r[0].data || []) + show("Départs aujourd'hui", r[1].data || []) + show("Dans la maison", r[2].data || []);
    });
    document.getElementById("search").addEventListener("submit", function (e) {
      e.preventDefault(); var q = e.target.q.value.trim().replace(/[,()%]/g, ""); if (!q) return;
      sb.from("guests").select("*, stays(*)").or("first_name.ilike.%" + q + "%,last_name.ilike.%" + q + "%,phone_e164.ilike.%" + q + "%").limit(30).then(function (r) {
        var rows = []; (r.data || []).forEach(function (g) { (g.stays || []).forEach(function (s) { s.guests = g; rows.push(s); }); });
        rows.sort(function (a, b) { return (b.arrival || "").localeCompare(a.arrival || ""); });
        document.getElementById("clist").innerHTML = show("Résultats pour « " + esc(q) + " »", rows);
      });
    });
  });

  /* ---------- Planning métier (chauffeur, spa, cuisine, guide, ménage) ---------- */
  function jobCard(j) {
    var o = j.order || {}, d = o.details || {}, g = o.guest || {};
    var h = '<div class="card k-' + esc(o.kind || "block") + '"><div class="job"><div class="row between"><span class="when">' + LM.time(j.starts_at) + '</span><span class="status ' + esc(j.status) + '">' + esc(STATUS[j.status] || j.status) + "</span></div>";
    h += '<div class="what">' + esc(j.title) + "</div>";
    if (o.id) {
      h += "<div>👤 " + esc(LM.guestName(o) || "Client") + (o.suite ? " · Suite " + esc(o.suite) : "") + (j.party_size > 1 ? " · " + j.party_size + " pers." : "") + "</div>";
      if (o.kind === "transfer") h += "<div>✈️ Vol <b>" + esc(String(d.flight || "?").toUpperCase()) + "</b> · " + esc(d.people || 1) + " pers." + (d.round ? "<br>↩️ Retour vol " + esc(d.backFlight || "") + " le " + LM.fmtDay(d.backDate) + (d.backTime ? " à " + esc(d.backTime) : "") : "") + "</div>";
      if (o.kind === "dinner") h += "<div>🍽 " + esc(d.guests || j.party_size) + " convives" + (d.allergies ? "<br>⚠️ " + esc(d.allergies) : "") + "</div>";
      if (o.items && o.items.length) h += '<div class="small muted">' + o.items.map(function (i) { return i.qty + " x " + esc(i.label_fr) + (i.duration_min ? " (" + i.duration_min + " min)" : ""); }).join(" · ") + "</div>";
      if (o.notes) h += '<div class="small">📝 ' + esc(o.notes) + "</div>";
      if (o.kind === "concierge" && d.details) h += '<div class="small">' + esc(d.details) + "</div>";
      h += '<div class="acts">';
      if (j.status === "pending") h += '<button class="btn ok" data-status="confirmed" data-order="' + o.id + '">✅ Accepter</button><button class="btn no" data-status="declined" data-order="' + o.id + '">❌ Refuser</button>';
      else if (j.status === "confirmed") h += '<button class="btn" data-status="done" data-order="' + o.id + '">✔️ Terminé</button>';
      if (g.phone_e164) h += '<a class="btn" href="' + LM.wa(g.phone_e164) + '" target="_blank" rel="noreferrer">💬 WhatsApp</a><a class="btn" href="tel:' + esc(g.phone_e164) + '">📞 Appeler</a>';
      h += "</div>";
    } else if (j.resource) h += '<div class="small muted">' + esc(j.resource) + "</div>";
    return h + "</div></div>";
  }
  function jobPanel(j) { LM.openPanel(jobCard(j)); }

  LM.view("planning", function () {
    var from = LM.today(), until = LM.addDays(from, 14), hk = LM.me.role === "housekeeping";
    function draw() {
      var reqs = [sb.rpc("my_jobs", { p_from: new Date(from + "T00:00:00Z").toISOString(), p_to: new Date(until + "T00:00:00Z").toISOString() })];
      if (hk) reqs.push(sb.rpc("house_board", { p_date: from }), sb.rpc("house_board", { p_date: LM.addDays(from, 1) }));
      Promise.all(reqs).then(function (r) {
        if (r[0].error) return LM.fail(r[0].error);
        var jobs = r[0].data || [], byDay = {};
        jobs.forEach(function (j) { var d = new Intl.DateTimeFormat("en-CA", { timeZone: LM.TZ }).format(new Date(j.starts_at)); (byDay[d] = byDay[d] || []).push(j); });
        var pend = jobs.filter(function (j) { return j.status === "pending"; }).length;
        var h = head("Mon planning", "Bonjour " + esc(LM.me.name) + ". Vos créneaux des deux prochaines semaines" + (pend ? " · <b>" + pend + " à accepter</b>" : "") + ".");
        if (LM.pwa) h += LM.pwa.bannerHtml();
        if (hk) h += houseHtml("Aujourd'hui", r[1].data || []) + houseHtml("Demain", r[2].data || []);
        var days = Object.keys(byDay).sort();
        h += days.length ? days.map(function (d) { return '<section class="day"><h2>' + esc(LM.dayLabel(d)) + "</h2>" + byDay[d].map(jobCard).join("") + "</section>"; }).join("") : (hk ? "" : '<div class="card empty">Rien de prévu pour vous ces deux prochaines semaines.</div>');
        app.innerHTML = h;
        if (LM.pwa) LM.pwa.bindBanner(app);
      });
    }
    LM.refresh = draw; draw();
  });
  function houseHtml(title, rows) {
    var ins = rows.filter(function (x) { return x.move === "in"; }), outs = rows.filter(function (x) { return x.move === "out"; }), stay = rows.filter(function (x) { return x.move === "stay"; });
    function li(x) { return "<li><b>Suite " + esc(LM.suiteNos(x.rooms) || "?") + "</b><span class='meta'>" + esc(x.name) + " · " + x.pax + " pers." + (x.eta ? " · arrivée " + esc(LM.eta(x.eta)) : "") + (x.move !== "in" ? " · départ " + LM.dm(x.departure) : "") + "</span></li>"; }
    function lane(cls, t, list, empty) { return '<div class="lane"><h3 class="t-' + cls + '"><span>' + t + "</span><span>" + list.length + "</span></h3>" + (list.length ? "<ul>" + list.map(li).join("") + "</ul>" : '<div class="none">' + empty + "</div>") + "</div>"; }
    return '<section class="day"><h2>' + title + '</h2><div class="lanes">' + lane("out", "Départs · suites à refaire", outs, "Aucun départ") + lane("in", "Arrivées · suites à préparer", ins, "Aucune arrivée") + lane("house", "Suites occupées", stay, "Aucune") + "</div></section>";
  }

  /* ---------- Réglages ---------- */
  LM.view("reglages", function () {
    var s = LM.cache.settings, bot = s.telegram_bot_username || "KasbahLaMounbot", me = LM.me, mgr = LM.isManager(), office = LM.isOffice();
    var h = head("Réglages");
    h += '<div class="card"><h2>Mon compte</h2><p class="small muted">Connecté comme <b>' + esc(me.name) + "</b> (identifiant <b>" + esc(LM.shortLogin(LM.session.user.email)) + "</b>) · accès : " + esc(LM.ACCESS[me.access]) + ".</p>" +
      '<div class="row"><button class="btn" data-pwd>Changer mon mot de passe</button><button class="btn" data-logout>Se déconnecter</button></div>' +
      '<p class="small muted" style="margin:12px 0 0">Mon calendrier (à ajouter dans l\'agenda du téléphone) : <code>' + LM.FN + "/ical/" + esc(me.ical_token) + ".ics</code>" +
      (me.telegram_chat_id ? "<br>Telegram : ✅ relié." : '<br>Telegram : <a href="https://t.me/' + esc(bot) + "?start=" + esc(me.link_code) + '" target="_blank" rel="noreferrer">relier mon Telegram</a>') + "</p></div>";
    h += '<div class="card" id="pwaCard"></div>';
    if (mgr) {
      h += '<div class="card"><h2>Équipe et accès</h2><p class="small muted">Accès : <b>Gérant</b> ' + esc(LM.ACCESS_HELP.manager) + " ; <b>Réception</b> " + esc(LM.ACCESS_HELP.reception) + " ; <b>Métier</b> " + esc(LM.ACCESS_HELP.own) + " (un chauffeur ne voit que ses transferts). Bouton « Mot de passe » : crée ou change l'identifiant et le mot de passe de la personne.</p>" +
        '<div class="scroll-x"><table class="stack"><thead><tr><th>Nom</th><th>Métier</th><th>Accès</th><th>Téléphone</th><th>Identifiant</th><th>Telegram</th><th>Actif</th><th></th></tr></thead><tbody>' +
        LM.cache.staff.map(function (st) {
          return '<tr data-staff="' + st.id + '"><td data-label="Nom"><input name="name" value="' + esc(st.name) + '"></td><td data-label="Métier"><select name="role">' + Object.keys(ROLE).map(function (r) { return '<option value="' + r + '"' + (st.role === r ? " selected" : "") + ">" + ROLE[r] + "</option>"; }).join("") + "</select></td>" +
            '<td data-label="Accès"><select name="access">' + Object.keys(LM.ACCESS).map(function (a) { return '<option value="' + a + '"' + (st.access === a ? " selected" : "") + ">" + LM.ACCESS[a] + "</option>"; }).join("") + '</select></td><td data-label="Téléphone"><input name="phone" value="' + esc(st.phone || "") + '" inputmode="tel"></td>' +
            '<td data-label="Identifiant"><input name="login" value="' + esc(LM.shortLogin(st.email || "")) + '" placeholder="ex. mouna" autocapitalize="none"><button class="btn sm" data-set-password style="margin-top:4px">Mot de passe</button></td>' +
            "<td data-label='Telegram'>" + (st.telegram_chat_id ? "✅ relié" : '<a class="small" href="https://t.me/' + esc(bot) + "?start=" + esc(st.link_code) + '" target="_blank" rel="noreferrer">lien de liaison</a><br><code class="small">/start ' + esc(st.link_code) + "</code>") + '</td><td data-label="Actif"><input type="checkbox" name="active"' + (st.active ? " checked" : "") + '></td><td><button class="btn sm solid" data-save-staff>Enregistrer</button></td></tr>';
        }).join("") + "</tbody></table></div>" +
        '<h3 style="margin-top:18px">Ajouter une personne</h3><form id="addStaff" class="inline"><label class="f"><span>Nom</span><input name="name" required></label><label class="f"><span>Métier</span><select name="role">' + Object.keys(ROLE).map(function (r) { return '<option value="' + r + '"' + (r === "driver" ? " selected" : "") + ">" + ROLE[r] + "</option>"; }).join("") + '</select></label>' +
        '<label class="f"><span>Accès</span><select name="access">' + Object.keys(LM.ACCESS).map(function (a) { return '<option value="' + a + '"' + (a === "own" ? " selected" : "") + ">" + LM.ACCESS[a] + "</option>"; }).join("") + '</select></label><label class="f"><span>Téléphone</span><input name="phone" inputmode="tel"></label>' +
        '<label class="f"><span>Identifiant</span><input name="login" placeholder="ex. karim" autocapitalize="none"></label><label class="f"><span>Mot de passe</span><input name="password" type="text" minlength="6" placeholder="6 caractères min." autocomplete="new-password"></label><button class="btn solid" type="submit">Ajouter</button></form></div>';
    }
    if (office) {
      h += '<div class="card"><h2>Ressources et horaires</h2><p class="small muted">Exclusif : un seul créneau à la fois (spa, guide). Sinon la capacité limite le nombre de personnes en même temps (table). Marge : minutes bloquées après chaque créneau.</p>' +
        '<table class="stack"><thead><tr><th>Nom</th><th>Type</th><th>Exclusif</th><th>Capacité</th><th>Marge</th><th>Personne par défaut</th><th>Actif</th><th></th></tr></thead><tbody>' +
        LM.cache.resources.map(function (r) {
          var dis = mgr ? "" : " disabled";
          return '<tr data-res="' + r.id + '"><td data-label="Nom"><input name="name" value="' + esc(r.name) + '"' + dis + '></td><td data-label="Type">' + esc(RKIND[r.kind]) + '</td><td data-label="Exclusif"><input type="checkbox" name="exclusive"' + (r.exclusive ? " checked" : "") + dis + '></td><td data-label="Capacité"><input type="number" name="capacity" value="' + r.capacity + '" min="1"' + dis + '></td><td data-label="Marge (min)"><input type="number" name="buffer_min" value="' + r.buffer_min + '" min="0" step="5"' + dis + "></td>" +
            '<td data-label="Par défaut"><select name="default_staff_id"' + dis + '><option value="">—</option>' + LM.cache.staff.map(function (st) { return '<option value="' + st.id + '"' + (r.default_staff_id === st.id ? " selected" : "") + ">" + esc(st.name) + "</option>"; }).join("") + '</select></td><td data-label="Actif"><input type="checkbox" name="active"' + (r.active ? " checked" : "") + dis + '></td><td>' + (mgr ? '<button class="btn sm solid" data-save-res>Enregistrer</button> ' : "") + '<button class="btn sm" data-hours="' + r.id + '">Horaires</button></td></tr>';
        }).join("") + "</tbody></table></div>";
    }
    if (mgr) {
      h += '<div class="card"><h2>Telegram, rappels, Google Sheet</h2><form id="settingsF" class="inline">' +
        [["telegram_bot_username", "Nom du bot (sans @)"], ["telegram_group_id", "Id du groupe (/id dans le groupe)"], ["topic_transfer", "Sujet Transferts"], ["topic_spa", "Sujet Spa"], ["topic_dinner", "Sujet Table"], ["topic_concierge", "Sujet Conciergerie"], ["topic_checkin", "Sujet Check-ins"], ["reminder_eve_hour", "Heure du récap du soir"], ["reminder_before_min", "Rappel avant (min)"], ["rooms_total", "Nombre de suites"], ["apps_script_url", "URL Apps Script (Google Sheet)"]].map(function (x) {
          return '<label class="f"><span>' + x[1] + '</span><input name="' + x[0] + '" value="' + esc(s[x[0]] || "") + '"></label>';
        }).join("") + '<button class="btn solid" type="submit">Enregistrer</button></form>' +
        '<p class="small muted" style="margin-top:10px">Calendrier maître (iCal) : <code>' + LM.FN + "/ical/" + esc(s.master_ical_token || "") + ".ics</code></p></div>";
      h += '<div class="card" id="octCard"></div>';
    }
    app.innerHTML = h;
    if (LM.pwa) LM.pwa.settingsCard(document.getElementById("pwaCard"));
    if (LM.octorateCard) LM.octorateCard(document.getElementById("octCard"));

    app.querySelectorAll("[data-save-staff]").forEach(function (b) {
      b.addEventListener("click", function () {
        var tr = b.closest("tr"), row = { name: tr.querySelector("[name=name]").value, role: tr.querySelector("[name=role]").value, access: tr.querySelector("[name=access]").value, phone: tr.querySelector("[name=phone]").value || null, active: tr.querySelector("[name=active]").checked };
        if (tr.getAttribute("data-staff") === me.id && row.access !== "manager" && !confirm("Vous retirez votre propre accès gérant. Continuer ?")) return;
        sb.from("staff").update(row).eq("id", tr.getAttribute("data-staff")).then(function (r) { if (r.error) return LM.fail(r.error); LM.toast("Enregistré"); LM.loadCache(); });
      });
    });
    app.querySelectorAll("[data-set-password]").forEach(function (b) {
      b.addEventListener("click", function () {
        var tr = b.closest("tr"), login = tr.querySelector("[name=login]").value.trim(), name = tr.querySelector("[name=name]").value;
        if (!login) return LM.toast("Indiquez d'abord un identifiant");
        var p = prompt("Mot de passe pour " + name + " (identifiant : " + login + ") :"); if (!p) return;
        b.disabled = true; var sid = tr.getAttribute("data-staff");
        LM.api("/account", { staffId: sid, username: login, password: p }).then(function (r) {
          LM.toast("Compte prêt : " + r.login); b.disabled = false; LM.loadCache();
          if (sid === me.id) sb.auth.signInWithPassword({ email: LM.toEmail(login), password: p }).then(function (q) { if (q.error) LM.loginView("Reconnectez-vous avec votre nouveau mot de passe."); });
        }, function (e) { b.disabled = false; LM.fail(e); });
      });
    });
    var add = document.getElementById("addStaff");
    if (add) {
      add.role.addEventListener("change", function () { add.access.value = add.role.value === "reception" ? "reception" : "own"; });
      add.addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target;
        if (f.login.value && f.password.value.length < 6) return LM.toast("Mot de passe : 6 caractères minimum");
        f.querySelector("button").disabled = true;
        sb.from("staff").insert({ name: f.name.value, role: f.role.value, access: f.access.value, phone: f.phone.value || null }).select().single().then(function (r) {
          if (r.error) { f.querySelector("button").disabled = false; return LM.fail(r.error); }
          var done = function (msg) { LM.toast(msg); LM.loadCache().then(LM.route); };
          if (f.login.value && f.password.value) LM.api("/account", { staffId: r.data.id, username: f.login.value, password: f.password.value }).then(function (a) { done("Ajouté · identifiant " + a.login); }, function (err) { LM.fail(err); done("Ajouté, mais le compte n'a pas pu être créé"); });
          else done("Ajouté : donnez-lui un identifiant et un mot de passe");
        });
      });
    }
    app.querySelectorAll("[data-save-res]").forEach(function (b) {
      b.addEventListener("click", function () {
        var tr = b.closest("tr"), row = { name: tr.querySelector("[name=name]").value, exclusive: tr.querySelector("[name=exclusive]").checked, capacity: Number(tr.querySelector("[name=capacity]").value) || 1, buffer_min: Number(tr.querySelector("[name=buffer_min]").value) || 0, default_staff_id: tr.querySelector("[name=default_staff_id]").value || null, active: tr.querySelector("[name=active]").checked };
        sb.from("resources").update(row).eq("id", tr.getAttribute("data-res")).then(function (r) { if (r.error) return LM.fail(r.error); LM.toast("Enregistré"); LM.loadCache(); });
      });
    });
    app.querySelectorAll("[data-hours]").forEach(function (b) { b.addEventListener("click", function () { hoursForm(b.getAttribute("data-hours")); }); });
    var sf = document.getElementById("settingsF");
    if (sf) sf.addEventListener("submit", function (e) {
      e.preventDefault(); var rows = []; Array.prototype.forEach.call(e.target.elements, function (el) { if (el.name) rows.push({ key: el.name, value: el.value.trim() }); });
      sb.from("settings").upsert(rows).then(function (r) { if (r.error) return LM.fail(r.error); LM.toast("Réglages enregistrés"); LM.loadCache(); });
    });
  });

  function hoursForm(resId) {
    var res = LM.cache.resources.find(function (r) { return r.id === resId; });
    sb.from("resource_hours").select("*").eq("resource_id", resId).order("weekday").then(function (r) {
      var rows = r.data || [];
      LM.openPanel("<h2>Horaires · " + esc(res.name) + "</h2><p class='small muted'>Un jour sans ligne est fermé. Pas : durée entre deux débuts de créneau proposés au client.</p>" +
        '<table class="stack"><thead><tr><th>Jour</th><th>Ouvre</th><th>Ferme</th><th>Pas</th><th></th></tr></thead><tbody id="hrows">' + rows.map(hourRow).join("") + "</tbody></table>" +
        '<div class="row" style="margin-top:10px"><button class="btn" id="addHour">Ajouter un jour</button><button class="btn solid" id="saveHours">Enregistrer</button></div>');
      function hourRow(x) { return '<tr><td data-label="Jour"><select name="weekday">' + DAYS.map(function (d, i) { return '<option value="' + i + '"' + (x.weekday === i ? " selected" : "") + ">" + d + "</option>"; }).join("") + '</select></td><td data-label="Ouvre"><input type="time" name="open" value="' + String(x.open_time).slice(0, 5) + '"></td><td data-label="Ferme"><input type="time" name="close" value="' + String(x.close_time).slice(0, 5) + '"></td><td data-label="Pas (min)"><input type="number" name="slot" value="' + x.slot_minutes + '" min="15" step="15"></td><td><button class="btn sm" data-del>×</button></td></tr>'; }
      document.getElementById("addHour").addEventListener("click", function () { document.getElementById("hrows").insertAdjacentHTML("beforeend", hourRow({ weekday: 1, open_time: "10:00", close_time: "20:00", slot_minutes: 30 })); });
      document.getElementById("hrows").addEventListener("click", function (e) { if (e.target.closest("[data-del]")) e.target.closest("tr").remove(); });
      document.getElementById("saveHours").addEventListener("click", function () {
        var out = []; document.querySelectorAll("#hrows tr").forEach(function (tr) { out.push({ resource_id: resId, weekday: Number(tr.querySelector("[name=weekday]").value), open_time: tr.querySelector("[name=open]").value, close_time: tr.querySelector("[name=close]").value, slot_minutes: Number(tr.querySelector("[name=slot]").value) || 30 }); });
        sb.from("resource_hours").delete().eq("resource_id", resId).then(function () { return out.length ? sb.from("resource_hours").insert(out) : { error: null }; }).then(function (r) { if (r.error) return LM.fail(r.error); LM.toast("Horaires enregistrés"); LM.closePanel(); });
      });
    });
  }

  /* ---------- Aide ---------- */
  LM.view("aide", function () {
    var bot = LM.cache.settings.telegram_bot_username || "KasbahLaMounbot";
    app.innerHTML = head("Comment ça marche") +
      '<div class="card"><h2>Qui voit quoi</h2><ul><li><b>Gérant</b> : tout, dont le <b>Tableau de bord</b> (chiffres Little Hotel) et la gestion de l\'équipe.</li><li><b>Réception</b> : Aujourd\'hui, Agenda, Demandes, Clients. Pas les chiffres.</li><li><b>Métier</b> (chauffeur, spa, cuisine, guide, ménage) : seulement <b>Mon planning</b> et ses créneaux dans l\'agenda. Le ménage voit aussi les suites à préparer et à refaire.</li></ul><p class="small muted">Le niveau d\'accès se choisit dans Réglages > Équipe. La base de données applique ces règles : un compte métier ne peut pas lire les autres données, même en bricolant.</p></div>' +
      '<div class="card"><h2>Le client</h2><p>Il ouvre le guide de bienvenue, fait son check-in (obligatoire), puis réserve transfert, spa, dîner ou guide. Pour le spa, il ne voit que les créneaux libres. Il suit le statut dans « Mon séjour ».</p></div>' +
      '<div class="card"><h2>L\'équipe</h2><p>Chaque demande arrive <b>sur Telegram</b> (bot @' + esc(bot) + ') et en <b>notification</b> sur le téléphone de la personne concernée et de la réception, avec le numéro WhatsApp du client. Accepter ou refuser, depuis Telegram ou l\'appli : tout se met à jour partout. La réception peut <b>attribuer</b> une demande à quelqu\'un depuis l\'agenda.</p></div>' +
      '<div class="card"><h2>Installer l\'appli</h2><p><b>iPhone</b> : ouvrir le lien dans Safari, bouton Partager, puis « Sur l\'écran d\'accueil ». Les notifications ne marchent qu\'une fois l\'appli installée (iOS 16.4 ou plus).<br><b>Android et ordinateur</b> : bouton « Installer l\'appli » (menu Plus, ou en bas de la barre latérale).<br>Ensuite : « Activer les notifications ».</p></div>' +
      '<div class="card"><h2>Tableau de bord</h2><p>Les chiffres viennent des exports CSV de Little Hotel. Pour les mettre à jour : Tableau de bord > Importer, puis déposer les fichiers (Réservations, Paiements, Listing clients). Les réservations déjà présentes sont mises à jour, rien n\'est doublé.</p></div>';
  });

  /* ---------- Plus (téléphone) ---------- */
  LM.view("plus", function () {
    var acc = LM.access(), tabsIds = { manager: ["jour", "agenda", "demandes", "stats"], reception: ["jour", "agenda", "demandes", "clients"], own: ["planning", "agenda"] }[acc];
    var more = LM.VIEWS.filter(function (v) { return !v.phoneOnly && v.acc.indexOf(acc) >= 0 && tabsIds.indexOf(v.id) < 0; });
    var sub = { clients: "Arrivées, départs, recherche", stats: "Chiffres Little Hotel", reglages: "Compte, équipe, ressources", aide: "Qui voit quoi, installation" };
    app.innerHTML = '<p class="muted small" style="margin:0 0 10px">' + esc(LM.me.name) + " · " + esc(LM.ACCESS[acc]) + "</p>" + (LM.pwa ? LM.pwa.bannerHtml(true) : "") +
      '<div class="menu">' + more.map(function (v) { return '<a href="#' + v.id + '">' + LM.icon(v.id) + "<span>" + esc(v.label) + (sub[v.id] ? '<span class="sub">' + sub[v.id] + "</span>" : "") + "</span></a>"; }).join("") +
      '<button type="button" data-install hidden>' + LM.icon("install") + "<span>Installer l'appli<span class='sub'>Sur l'écran d'accueil, comme une vraie appli</span></span></button>" +
      '<button type="button" data-notif hidden>' + LM.icon("bell") + "<span>Activer les notifications<span class='sub'>Nouvelles demandes et rappels</span></span></button>" +
      '<button type="button" data-pwd>' + LM.icon("key") + "<span>Changer mon mot de passe</span></button>" +
      '<button type="button" data-logout>' + LM.icon("logout") + "<span>Se déconnecter</span></button></div>";
    if (LM.pwa) { LM.pwa.bindBanner(app); LM.pwa.syncButtons(); }
  });
})();
