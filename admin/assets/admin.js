/* Kasbah La Moun, appli équipe : agenda maître, demandes, clients, réglages.
   Données lues et écrites directement dans Supabase (règles RLS : membres de l'équipe seulement) ;
   les changements de statut et les demandes manuelles passent par les fonctions /status et /order
   pour que Telegram soit tenu à jour. */
(function () {
  "use strict";
  var C = window.CONFIG || {};
  var app = document.getElementById("app"), nav = document.getElementById("nav"), panel = document.getElementById("panel"), toastEl = document.getElementById("toast");
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) { app.innerHTML = '<div class="card">Renseignez <code>assets/config.js</code> (URL et clé anonyme du projet Supabase).</div>'; return; }
  var FN = (C.FUNCTIONS_URL || C.SUPABASE_URL + "/functions/v1").replace(/\/$/, "");
  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  var TZ = "Africa/Casablanca";
  var KIND = { transfer: "Transfert", spa: "Spa", dinner: "Dîner", concierge: "Conciergerie", block: "Fermeture" };
  var COLOR = { transfer: "#4b5c60", spa: "#8a6d9b", dinner: "#b07a3a", concierge: "#3f7d6a", block: "#9a9e9b" };
  var STATUS = { pending: "En attente", confirmed: "Confirmé", declined: "Refusé", cancelled: "Annulé", done: "Terminé" };
  var ROLE = { reception: "Réception", driver: "Chauffeur", spa: "Spa", kitchen: "Cuisine", guide: "Guide", housekeeping: "Ménage" };
  var RKIND = { spa: "Spa", vehicle: "Véhicule", dining: "Table", guide: "Guide" };
  var DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  var me = null, cache = { staff: [], resources: [], settings: {} }, cal = null, session = null;

  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmt(iso, opts) { try { return new Intl.DateTimeFormat("fr-FR", Object.assign({ timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }, opts || {})).format(new Date(iso)); } catch (e) { return iso; } }
  function fmtDay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : iso || ""; }
  function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); }
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.hidden = true; }, 2600); }
  function guestName(o) { var g = o && o.guests; return g ? [g.first_name, g.last_name].filter(Boolean).join(" ") : ""; }
  function wa(phone, text) { return "https://wa.me/" + String(phone || "").replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : ""); }
  function openPanel(html) { panel.querySelector(".panel-inner").innerHTML = '<button type="button" class="btn sm close" data-close>Fermer</button>' + html; panel.hidden = false; }
  function closePanel() { panel.hidden = true; }
  panel.addEventListener("click", function (e) { if (e.target === panel || e.target.closest("[data-close]")) closePanel(); });

  function api(path, body, method) {
    return sb.auth.getSession().then(function (r) {
      var token = r.data.session && r.data.session.access_token;
      return fetch(FN + path, { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: C.SUPABASE_ANON_KEY }, body: body ? JSON.stringify(body) : undefined });
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.message || "Erreur " + r.status); return j; }); });
  }
  function fail(e) { console.error(e); toast(e.message || "Erreur"); }

  /* ---------- Connexion ---------- */
  function loginView(msg) {
    nav.hidden = true;
    app.innerHTML = '<div class="card login"><h1>Équipe La Moun</h1><p class="muted">Entrez votre e-mail : vous recevrez un lien de connexion.</p>' +
      '<form id="login" class="row"><label class="f" style="flex:1"><span>E-mail</span><input type="email" name="email" required autocomplete="email"></label><button class="btn solid" type="submit">Recevoir le lien</button></form>' +
      (msg ? '<p class="small muted">' + esc(msg) + "</p>" : "") + "</div>";
    document.getElementById("login").addEventListener("submit", function (e) {
      e.preventDefault(); var email = e.target.email.value.trim();
      sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r.error) return fail(r.error); loginView("Lien envoyé à " + email + ". Ouvrez-le sur cet appareil.");
      });
    });
  }

  function boot() {
    return sb.auth.getSession().then(function (r) {
      session = r.data.session;
      if (!session) { loginView(); return; }
      return sb.from("staff").select("*").ilike("email", session.user.email).eq("active", true).maybeSingle().then(function (q) {
        if (q.error || !q.data) { loginView("Ce compte (" + session.user.email + ") n'est pas dans l'équipe. Demandez à la réception de l'ajouter dans Réglages."); return; }
        me = q.data; nav.hidden = false;
        return loadCache().then(function () { route(); listen(); });
      });
    });
  }
  function loadCache() {
    return Promise.all([sb.from("staff").select("*").order("name"), sb.from("resources").select("*").order("name"), sb.from("settings").select("*")]).then(function (r) {
      cache.staff = r[0].data || []; cache.resources = r[1].data || []; cache.settings = {};
      (r[2].data || []).forEach(function (s) { cache.settings[s.key] = s.value || ""; });
      return countPending();
    });
  }
  function countPending() {
    return sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").then(function (r) {
      var b = document.getElementById("pendingCount"); b.hidden = !r.count; b.textContent = r.count || "";
    });
  }
  document.getElementById("logout").addEventListener("click", function () { sb.auth.signOut().then(function () { location.hash = ""; loginView(); }); });
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_IN" && !me) boot(); });

  /* ---------- Temps réel (repli : rafraîchissement toutes les 60 s) ---------- */
  var listening = false;
  function listen() {
    if (listening) return; listening = true;
    function bump() { countPending(); if (cal) cal.refetchEvents(); if (current === "demandes") demandes(); }
    try { sb.channel("pms").on("postgres_changes", { event: "*", schema: "public", table: "events" }, bump).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, bump).subscribe(); } catch (e) { /* sans temps réel */ }
    setInterval(bump, 60000);
  }

  /* ---------- Navigation ---------- */
  var current = "";
  function route() {
    var v = (location.hash || "#agenda").slice(1).split("/")[0];
    if (!{ agenda: 1, demandes: 1, clients: 1, reglages: 1 }[v]) v = "agenda";
    current = v; closePanel();
    nav.querySelectorAll("a[data-view]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-view") === v); });
    ({ agenda: agenda, demandes: demandes, clients: clients, reglages: reglages })[v]();
  }
  window.addEventListener("hashchange", route);

  /* ---------- Agenda ---------- */
  function agenda() {
    cal = null;
    app.innerHTML = '<div class="row between"><h1>Agenda</h1><div class="row"><button class="btn" id="newBlock">Fermer un créneau</button><button class="btn solid" id="newOrder">Nouvelle demande</button></div></div>' +
      '<div class="filters"><select id="fStaff"><option value="">Toute l\'équipe</option>' + cache.staff.filter(function (s) { return s.active; }).map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + " · " + esc(ROLE[s.role] || s.role) + "</option>"; }).join("") + "</select>" +
      '<select id="fRes"><option value="">Toutes les ressources</option>' + cache.resources.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") + "</select>" +
      '<select id="fStatus"><option value="">Actifs (en attente + confirmés)</option><option value="all">Tout, refus et annulations compris</option></select></div><div id="cal"></div>';
    var el = document.getElementById("cal");
    cal = new FullCalendar.Calendar(el, {
      locale: "fr", timeZone: TZ, initialView: window.innerWidth < 700 ? "listWeek" : "timeGridWeek", height: "auto", nowIndicator: true, firstDay: 1, slotMinTime: "06:00:00", slotMaxTime: "24:00:00",
      headerToolbar: { left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth,listWeek" },
      events: function (info, ok, ko) {
        var q = sb.from("events").select("*, orders(short_id, kind, status, guests(first_name, last_name, phone_e164), stays(suite)), resources(name), staff(name)")
          .gte("starts_at", info.start.toISOString()).lte("starts_at", info.end.toISOString());
        var fs = document.getElementById("fStaff").value, fr = document.getElementById("fRes").value, fst = document.getElementById("fStatus").value;
        if (fs) q = q.eq("staff_id", fs); if (fr) q = q.eq("resource_id", fr); if (fst !== "all") q = q.in("status", ["pending", "confirmed", "done"]);
        q.then(function (r) {
          if (r.error) return ko(r.error);
          ok((r.data || []).map(function (e) {
            var k = e.kind === "block" ? "block" : (e.orders && e.orders.kind) || "concierge";
            return { id: e.id, title: (e.status === "pending" ? "⏳ " : "") + e.title + (guestName(e.orders) ? " · " + guestName(e.orders) : ""), start: e.starts_at, end: e.ends_at, color: COLOR[k], classNames: [e.status], extendedProps: e };
          }));
        });
      },
      eventClick: function (i) { openEvent(i.event.extendedProps); }
    });
    cal.render();
    ["fStaff", "fRes", "fStatus"].forEach(function (id) { document.getElementById(id).addEventListener("change", function () { cal.refetchEvents(); }); });
    document.getElementById("newBlock").addEventListener("click", blockForm);
    document.getElementById("newOrder").addEventListener("click", orderForm);
  }

  function orderCard(o, full) {
    var g = o.guests || {}, evs = (o.events || []).slice().sort(function (a, b) { return a.starts_at.localeCompare(b.starts_at); });
    var h = '<div class="order"><div class="row between"><span class="kind">' + esc(KIND[o.kind]) + " · n° " + esc(o.short_id) + '</span><span class="status ' + esc(o.status) + '">' + esc(STATUS[o.status]) + "</span></div>";
    h += '<div class="title">' + esc(guestName(o) || (o.details && o.details.guestName) || "Client") + (o.stays && o.stays.suite ? " · Suite " + esc(o.stays.suite) : o.details && o.details.suite ? " · Suite " + esc(o.details.suite) : "") + "</div>";
    evs.forEach(function (e) { h += "<div>🗓 " + esc(e.title) + " · <b>" + fmt(e.starts_at) + "</b></div>"; });
    if (g.phone_e164) h += '<div>📱 <a href="' + wa(g.phone_e164) + '" target="_blank" rel="noreferrer">' + esc(g.phone_e164) + "</a>" + (o.lang && o.lang !== "fr" ? " · langue : " + esc(o.lang) : "") + "</div>";
    var d = o.details || {};
    if (o.kind === "transfer") h += "<div>✈️ Vol " + esc(d.flight || "?") + " · " + esc(d.people || 1) + " pers." + (d.round ? " · retour vol " + esc(d.backFlight) + " le " + fmtDay(d.backDate) + " à " + esc(d.backTime) : "") + "</div>";
    if (o.kind === "dinner") h += "<div>🍽 " + esc(d.guests || "?") + " convives" + (d.allergies ? " · " + esc(d.allergies) : "") + "</div>";
    if (o.kind === "concierge" && d.details) h += "<div>" + esc(d.details) + "</div>";
    if (o.order_items && o.order_items.length) h += "<ul>" + o.order_items.map(function (i) { return "<li>" + i.qty + " x " + esc(i.label_fr) + (i.unit_price_mad ? " · " + i.unit_price_mad * i.qty + " MAD" : "") + "</li>"; }).join("") + "</ul>";
    if (o.total_mad) h += "<div><b>Total : " + o.total_mad + " MAD</b></div>";
    if (o.notes) h += '<div class="muted">Remarques : ' + esc(o.notes) + "</div>";
    if (full && o.guest_message) h += '<details><summary class="small muted">Message d\'origine</summary><pre class="small" style="white-space:pre-wrap">' + esc(o.guest_message) + "</pre></details>";
    h += '<div class="small muted">Reçu le ' + fmt(o.requested_at) + (o.decided_at ? " · " + esc(STATUS[o.status]).toLowerCase() + " le " + fmt(o.decided_at) + (o.decided_by_name ? " par " + esc(o.decided_by_name) : "") : "") + "</div>";
    h += '<div class="row" data-actions="' + o.id + '">' + actions(o) + "</div></div>";
    return h;
  }
  function actions(o) {
    var b = [];
    if (o.status === "pending") b.push(['confirmed', 'ok', '✅ Accepter'], ['declined', 'no', '❌ Refuser']);
    else if (o.status === "confirmed") b.push(['done', '', '✔️ Terminé'], ['cancelled', 'no', 'Annuler']);
    else b.push(['pending', '', 'Remettre en attente']);
    var h = b.map(function (x) { return '<button class="btn sm ' + x[1] + '" data-status="' + x[0] + '" data-order="' + o.id + '">' + x[2] + "</button>"; }).join("");
    if (o.guests && o.guests.phone_e164) h += '<a class="btn sm" target="_blank" rel="noreferrer" href="' + wa(o.guests.phone_e164, o.status === "confirmed" ? "Bonjour " + (o.guests.first_name || "") + ", Kasbah La Moun : votre demande n° " + o.short_id + " est confirmée. À très bientôt !" : "") + '">💬 WhatsApp</a>';
    return h;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-status][data-order]"); if (!b) return;
    b.disabled = true;
    api("/status", { orderId: b.getAttribute("data-order"), status: b.getAttribute("data-status") }).then(function () { toast("Statut : " + STATUS[b.getAttribute("data-status")]); countPending(); if (cal) cal.refetchEvents(); if (current === "demandes") demandes(); else if (!panel.hidden) closePanel(); }, function (err) { b.disabled = false; fail(err); });
  });

  function openEvent(e) {
    if (e.kind === "block") {
      return openPanel("<h2>Fermeture</h2><p>" + esc(e.title) + "</p><p>" + fmt(e.starts_at) + " → " + fmt(e.ends_at) + "</p>" + (e.resources ? "<p>" + esc(e.resources.name) + "</p>" : "") +
        '<button class="btn no" id="delBlock">Supprimer la fermeture</button>').querySelector ? null : document.getElementById("delBlock").addEventListener("click", function () {
          sb.from("events").delete().eq("id", e.id).then(function (r) { if (r.error) return fail(r.error); toast("Fermeture supprimée"); closePanel(); cal.refetchEvents(); });
        });
    }
    sb.from("orders").select("*, guests(*), stays(*), order_items(*), events(*)").eq("id", e.order_id).maybeSingle().then(function (r) {
      if (r.error || !r.data) return fail(r.error || new Error("Commande introuvable"));
      var o = r.data; var by = cache.staff.find(function (s) { return s.id === o.decided_by; }); if (by) o.decided_by_name = by.name;
      openPanel('<div class="card">' + orderCard(o, true) + "</div>" + '<p class="small muted">Ressource : ' + esc(e.resources ? e.resources.name : "—") + " · Personne : " + esc(e.staff ? e.staff.name : "—") + "</p>");
    });
  }

  function blockForm() {
    openPanel("<h2>Fermer un créneau</h2><p class='small muted'>Jour de repos, nettoyage, spa indisponible : rien ne pourra être réservé sur cette ressource pendant ce temps.</p>" +
      '<form id="blockF" class="order"><label class="f"><span>Ressource</span><select name="resource" required>' + cache.resources.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") + "</select></label>" +
      '<label class="f"><span>Début</span><input type="datetime-local" name="start" required></label><label class="f"><span>Fin</span><input type="datetime-local" name="end" required></label>' +
      '<label class="f"><span>Motif</span><input name="reason" placeholder="Fermeture, repos, entretien"></label><button class="btn solid" type="submit">Enregistrer</button></form>');
    document.getElementById("blockF").addEventListener("submit", function (ev) {
      ev.preventDefault(); var f = ev.target;
      sb.from("events").insert({ kind: "block", resource_id: f.resource.value, starts_at: new Date(f.start.value).toISOString(), ends_at: new Date(f.end.value).toISOString(), title: f.reason.value || "Fermeture", status: "confirmed", exclusive: true })
        .then(function (r) { if (r.error) return fail(r.error.code === "23P01" ? new Error("Un créneau existe déjà sur cette période.") : r.error); toast("Créneau fermé"); closePanel(); cal.refetchEvents(); });
    });
  }

  function orderForm() {
    openPanel("<h2>Nouvelle demande</h2><p class='small muted'>Demande reçue par téléphone ou au comptoir : elle rejoint l'agenda et Telegram comme les autres.</p>" +
      '<form id="orderF" class="order"><label class="f"><span>Type</span><select name="kind"><option value="transfer">Transfert</option><option value="spa">Spa</option><option value="dinner">Dîner</option><option value="concierge">Conciergerie</option></select></label>' +
      '<label class="f"><span>Nom du client</span><input name="name" required></label><label class="f"><span>WhatsApp</span><input name="phone" type="tel" required placeholder="+33 6…"></label><label class="f"><span>Suite</span><input name="suite"></label>' +
      '<label class="f"><span>Date</span><input type="date" name="date" required value="' + today() + '"></label><label class="f"><span>Heure</span><input type="time" name="time" required value="19:00"></label>' +
      '<label class="f"><span>Personnes</span><input type="number" name="people" min="1" value="2"></label>' +
      '<label class="f" data-k="transfer"><span>Numéro de vol</span><input name="flight"></label>' +
      '<label class="f" data-k="spa concierge"><span>Intitulé (soin, excursion, demande)</span><input name="label"></label><label class="f" data-k="spa"><span>Durée (min)</span><input type="number" name="duration" value="60" min="15" step="15"></label>' +
      '<label class="f" data-k="spa concierge transfer"><span>Prix (MAD)</span><input type="number" name="price" min="0"></label>' +
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
      api("/order", { kind: k, lang: "fr", guest: { name: f.name.value, phone: f.phone.value, suite: f.suite.value }, items: items, details: details, notes: f.notes.value, message: "Saisie par " + me.name })
        .then(function (r) { toast("Demande n° " + r.orderId + " enregistrée"); closePanel(); if (cal) cal.refetchEvents(); countPending(); }, fail);
    });
  }

  /* ---------- Demandes ---------- */
  function demandes() {
    app.innerHTML = "<h1>Demandes</h1><p class='muted'>Chargement…</p>";
    var since = new Date(Date.now() - 2 * 86400000).toISOString();
    sb.from("orders").select("*, guests(*), stays(suite), order_items(*), events(title, starts_at)").or("status.eq.pending,requested_at.gte." + since).order("requested_at", { ascending: false }).limit(200).then(function (r) {
      if (r.error) return fail(r.error);
      var list = r.data || [], pend = list.filter(function (o) { return o.status === "pending"; }), rest = list.filter(function (o) { return o.status !== "pending"; });
      list.forEach(function (o) { var by = cache.staff.find(function (s) { return s.id === o.decided_by; }); if (by) o.decided_by_name = by.name; });
      app.innerHTML = "<h1>Demandes</h1><h2>En attente (" + pend.length + ")</h2>" + (pend.length ? '<div class="grid">' + pend.map(function (o) { return '<div class="card">' + orderCard(o) + "</div>"; }).join("") + "</div>" : "<p class='muted'>Rien en attente.</p>") +
        "<h2>Récentes</h2>" + (rest.length ? '<div class="grid">' + rest.map(function (o) { return '<div class="card">' + orderCard(o) + "</div>"; }).join("") + "</div>" : "<p class='muted'>Aucune demande récente.</p>");
    });
  }

  /* ---------- Clients ---------- */
  function clients() {
    var d = today();
    app.innerHTML = '<div class="row between"><h1>Clients</h1><form id="search" class="row"><input name="q" placeholder="Nom ou téléphone" style="font:inherit;font-size:16px;padding:8px 10px;border:1px solid var(--line-strong);border-radius:6px"><button class="btn" type="submit">Chercher</button></form></div><div id="clist"><p class="muted">Chargement…</p></div>';
    function show(title, rows) {
      return "<h2>" + title + " (" + rows.length + ")</h2>" + (rows.length ? "<div class='card'><table><thead><tr><th>Client</th><th>Séjour</th><th>Suite</th><th>Pers.</th><th>Transfert</th><th>Contact</th></tr></thead><tbody>" + rows.map(function (s) {
        var g = s.guests || {};
        return "<tr><td>" + esc([g.first_name, g.last_name].filter(Boolean).join(" ")) + "<br><span class='small muted'>" + esc(g.nationality || "") + (g.lang && g.lang !== "fr" ? " · " + esc(g.lang) : "") + "</span></td><td>" + fmtDay(s.arrival) + " → " + fmtDay(s.departure) + (s.checkout_time ? "<br><span class='small muted'>départ " + String(s.checkout_time).slice(0, 5) + "</span>" : "") + "</td><td>" + esc(s.suite || "—") + "</td><td>" + s.people + "</td><td>" + esc({ yes: "souhaité", no: "non", maybe: "?" }[s.transfer_wish] || "—") + (s.flight_out ? "<br><span class='small muted'>vol " + String(s.flight_out).slice(0, 5) + "</span>" : "") + "</td><td>" + (g.phone_e164 ? '<a href="' + wa(g.phone_e164) + '" target="_blank" rel="noreferrer">' + esc(g.phone_e164) + "</a>" : "") + (g.email ? "<br><span class='small'>" + esc(g.email) + "</span>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : "<p class='muted'>Personne.</p>");
    }
    var sel = "*, guests(*)";
    Promise.all([sb.from("stays").select(sel).eq("arrival", d), sb.from("stays").select(sel).eq("departure", d), sb.from("stays").select(sel).lte("arrival", d).gt("departure", d).order("arrival")]).then(function (r) {
      document.getElementById("clist").innerHTML = show("Arrivées aujourd'hui", r[0].data || []) + show("Départs aujourd'hui", r[1].data || []) + show("Dans la maison", r[2].data || []);
    });
    document.getElementById("search").addEventListener("submit", function (e) {
      e.preventDefault(); var q = e.target.q.value.trim(); if (!q) return;
      sb.from("guests").select("*, stays(*)").or("first_name.ilike.%" + q + "%,last_name.ilike.%" + q + "%,phone_e164.ilike.%" + q + "%").limit(30).then(function (r) {
        var rows = []; (r.data || []).forEach(function (g) { (g.stays || []).forEach(function (s) { s.guests = g; rows.push(s); }); });
        rows.sort(function (a, b) { return (b.arrival || "").localeCompare(a.arrival || ""); });
        document.getElementById("clist").innerHTML = show("Résultats pour « " + esc(q) + " »", rows);
      });
    });
  }

  /* ---------- Réglages ---------- */
  function reglages() {
    var s = cache.settings, bot = s.telegram_bot_username || "<bot>";
    var h = "<h1>Réglages</h1>";
    h += '<div class="card"><h2>Équipe</h2><p class="small muted">Chaque personne ouvre le bot Telegram une fois avec son lien de liaison ; elle reçoit ensuite ses demandes et ses rappels en privé. L\'e-mail sert à se connecter ici.</p>' +
      '<table><thead><tr><th>Nom</th><th>Rôle</th><th>Téléphone</th><th>E-mail (connexion)</th><th>Telegram</th><th>Actif</th><th></th></tr></thead><tbody>' +
      cache.staff.map(function (st) {
        return '<tr data-staff="' + st.id + '"><td><input name="name" value="' + esc(st.name) + '"></td><td><select name="role">' + Object.keys(ROLE).map(function (r) { return '<option value="' + r + '"' + (st.role === r ? " selected" : "") + ">" + ROLE[r] + "</option>"; }).join("") + '</select></td><td><input name="phone" value="' + esc(st.phone || "") + '"></td><td><input name="email" type="email" value="' + esc(st.email || "") + '"></td>' +
          "<td>" + (st.telegram_chat_id ? "✅ lié" : '<a class="small" href="https://t.me/' + esc(bot) + "?start=" + esc(st.link_code) + '" target="_blank" rel="noreferrer">lien de liaison</a><br><code class="small">/start ' + esc(st.link_code) + "</code>") + '</td><td><input type="checkbox" name="active"' + (st.active ? " checked" : "") + '></td><td><button class="btn sm" data-save-staff>OK</button><br><a class="small" href="' + FN + "/ical/" + esc(st.ical_token) + '.ics">iCal</a></td></tr>';
      }).join("") + "</tbody></table>" +
      '<form id="addStaff" class="inline" style="margin-top:12px"><label class="f"><span>Nom</span><input name="name" required></label><label class="f"><span>Rôle</span><select name="role">' + Object.keys(ROLE).map(function (r) { return '<option value="' + r + '">' + ROLE[r] + "</option>"; }).join("") + '</select></label><label class="f"><span>Téléphone</span><input name="phone"></label><label class="f"><span>E-mail</span><input name="email" type="email"></label><button class="btn solid" type="submit">Ajouter</button></form></div>';
    h += '<div class="card"><h2>Ressources</h2><p class="small muted">Exclusif : un seul créneau à la fois (spa, guide). Sinon, la capacité limite le nombre de personnes en même temps (table). Marge : minutes bloquées après chaque créneau.</p>' +
      '<table><thead><tr><th>Nom</th><th>Type</th><th>Exclusif</th><th>Capacité</th><th>Marge</th><th>Personne par défaut</th><th>Actif</th><th></th></tr></thead><tbody>' +
      cache.resources.map(function (r) {
        return '<tr data-res="' + r.id + '"><td><input name="name" value="' + esc(r.name) + '"></td><td>' + esc(RKIND[r.kind]) + '</td><td><input type="checkbox" name="exclusive"' + (r.exclusive ? " checked" : "") + '></td><td><input type="number" name="capacity" value="' + r.capacity + '" min="1"></td><td><input type="number" name="buffer_min" value="' + r.buffer_min + '" min="0" step="5"></td>' +
          '<td><select name="default_staff_id"><option value="">—</option>' + cache.staff.map(function (st) { return '<option value="' + st.id + '"' + (r.default_staff_id === st.id ? " selected" : "") + ">" + esc(st.name) + "</option>"; }).join("") + '</select></td><td><input type="checkbox" name="active"' + (r.active ? " checked" : "") + '></td><td><button class="btn sm" data-save-res>OK</button><br><button class="btn sm" data-hours="' + r.id + '">Horaires</button></td></tr>';
      }).join("") + "</tbody></table></div>";
    h += '<div class="card"><h2>Telegram et rappels</h2><form id="settingsF" class="inline">' +
      [["telegram_bot_username", "Nom du bot (sans @)"], ["telegram_group_id", "Id du groupe (/id dans le groupe)"], ["topic_transfer", "Sujet Transferts"], ["topic_spa", "Sujet Spa"], ["topic_dinner", "Sujet Table"], ["topic_concierge", "Sujet Conciergerie"], ["topic_checkin", "Sujet Check-ins"], ["reminder_eve_hour", "Heure du récap du soir"], ["reminder_before_min", "Rappel avant (min)"], ["apps_script_url", "URL Apps Script (Google Sheet)"]].map(function (x) {
        return '<label class="f"><span>' + x[1] + '</span><input name="' + x[0] + '" value="' + esc(s[x[0]] || "") + '"></label>';
      }).join("") + '<button class="btn solid" type="submit">Enregistrer</button></form>' +
      '<p class="small muted" style="margin-top:10px">Calendrier maître (iCal, à ajouter sur un téléphone ou dans Google Agenda) : <code>' + FN + "/ical/" + esc(s.master_ical_token || "") + ".ics</code></p></div>";
    app.innerHTML = h;

    app.querySelectorAll("[data-save-staff]").forEach(function (b) {
      b.addEventListener("click", function () {
        var tr = b.closest("tr"), row = { name: tr.querySelector("[name=name]").value, role: tr.querySelector("[name=role]").value, phone: tr.querySelector("[name=phone]").value || null, email: tr.querySelector("[name=email]").value || null, active: tr.querySelector("[name=active]").checked };
        sb.from("staff").update(row).eq("id", tr.getAttribute("data-staff")).then(function (r) { if (r.error) return fail(r.error); toast("Enregistré"); loadCache(); });
      });
    });
    document.getElementById("addStaff").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target;
      sb.from("staff").insert({ name: f.name.value, role: f.role.value, phone: f.phone.value || null, email: f.email.value || null }).then(function (r) { if (r.error) return fail(r.error); toast("Ajouté"); loadCache().then(reglages); });
    });
    app.querySelectorAll("[data-save-res]").forEach(function (b) {
      b.addEventListener("click", function () {
        var tr = b.closest("tr"), row = { name: tr.querySelector("[name=name]").value, exclusive: tr.querySelector("[name=exclusive]").checked, capacity: Number(tr.querySelector("[name=capacity]").value) || 1, buffer_min: Number(tr.querySelector("[name=buffer_min]").value) || 0, default_staff_id: tr.querySelector("[name=default_staff_id]").value || null, active: tr.querySelector("[name=active]").checked };
        sb.from("resources").update(row).eq("id", tr.getAttribute("data-res")).then(function (r) { if (r.error) return fail(r.error); toast("Enregistré"); loadCache(); });
      });
    });
    app.querySelectorAll("[data-hours]").forEach(function (b) { b.addEventListener("click", function () { hoursForm(b.getAttribute("data-hours")); }); });
    document.getElementById("settingsF").addEventListener("submit", function (e) {
      e.preventDefault(); var rows = []; Array.prototype.forEach.call(e.target.elements, function (el) { if (el.name) rows.push({ key: el.name, value: el.value.trim() }); });
      sb.from("settings").upsert(rows).then(function (r) { if (r.error) return fail(r.error); toast("Réglages enregistrés"); loadCache(); });
    });
  }
  function hoursForm(resId) {
    var res = cache.resources.find(function (r) { return r.id === resId; });
    sb.from("resource_hours").select("*").eq("resource_id", resId).order("weekday").then(function (r) {
      var rows = r.data || [];
      openPanel("<h2>Horaires · " + esc(res.name) + "</h2><p class='small muted'>Un jour sans ligne est fermé. Pas : durée entre deux débuts de créneau proposés au client.</p>" +
        '<table><thead><tr><th>Jour</th><th>Ouvre</th><th>Ferme</th><th>Pas</th><th></th></tr></thead><tbody id="hrows">' + rows.map(hourRow).join("") + "</tbody></table>" +
        '<div class="row" style="margin-top:10px"><button class="btn" id="addHour">Ajouter un jour</button><button class="btn solid" id="saveHours">Enregistrer</button></div>');
      function hourRow(x) { return '<tr><td><select name="weekday">' + DAYS.map(function (d, i) { return '<option value="' + i + '"' + (x.weekday === i ? " selected" : "") + ">" + d + "</option>"; }).join("") + '</select></td><td><input type="time" name="open" value="' + String(x.open_time).slice(0, 5) + '"></td><td><input type="time" name="close" value="' + String(x.close_time).slice(0, 5) + '"></td><td><input type="number" name="slot" value="' + x.slot_minutes + '" min="15" step="15"></td><td><button class="btn sm" data-del>×</button></td></tr>'; }
      document.getElementById("addHour").addEventListener("click", function () { document.getElementById("hrows").insertAdjacentHTML("beforeend", hourRow({ weekday: 1, open_time: "10:00", close_time: "20:00", slot_minutes: 30 })); });
      document.getElementById("hrows").addEventListener("click", function (e) { if (e.target.closest("[data-del]")) e.target.closest("tr").remove(); });
      document.getElementById("saveHours").addEventListener("click", function () {
        var out = []; document.querySelectorAll("#hrows tr").forEach(function (tr) { out.push({ resource_id: resId, weekday: Number(tr.querySelector("[name=weekday]").value), open_time: tr.querySelector("[name=open]").value, close_time: tr.querySelector("[name=close]").value, slot_minutes: Number(tr.querySelector("[name=slot]").value) || 30 }); });
        sb.from("resource_hours").delete().eq("resource_id", resId).then(function () { return out.length ? sb.from("resource_hours").insert(out) : { error: null }; }).then(function (r) { if (r.error) return fail(r.error); toast("Horaires enregistrés"); closePanel(); });
      });
    });
  }

  boot();
})();
