/* Kasbah La Moun, appli équipe : noyau (connexion, niveaux d'accès, navigation, outils partagés).
   Les écrans sont déclarés dans ops.js (opérations), dash.js (aujourd'hui, tableau de bord).
   La sécurité est dans la base (règles RLS par niveau d'accès) : cacher un écran n'est qu'un confort. */
(function () {
  "use strict";
  var C = window.CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var app = $("app"), tabs = $("tabs"), panel = $("panel"), toastEl = $("toast");
  var LM = window.LM = { views: {}, cache: { staff: [], resources: [], settings: {} }, me: null, session: null, current: "" };
  LM.app = app;
  LM.DESKTOP = window.matchMedia("(min-width: 900px)");
  LM.TZ = "Africa/Casablanca";
  LM.FN = (C.FUNCTIONS_URL || (C.SUPABASE_URL || "") + "/functions/v1").replace(/\/$/, "");
  LM.KIND = { transfer: "Transfert", spa: "Spa", dinner: "Dîner", concierge: "Conciergerie", block: "Fermeture" };
  LM.COLOR = { transfer: "#2f6f7a", spa: "#6b5a9e", dinner: "#a07a1c", concierge: "#3f7d4a", block: "#9a9e9b" };
  LM.STATUS = { pending: "En attente", confirmed: "Confirmé", declined: "Refusé", cancelled: "Annulé", done: "Terminé" };
  LM.ROLE = { reception: "Réception", driver: "Chauffeur", spa: "Spa", kitchen: "Cuisine", guide: "Guide", housekeeping: "Ménage" };
  LM.ACCESS = { manager: "Gérant", reception: "Réception", own: "Métier (son planning)" };
  LM.ACCESS_HELP = { manager: "voit tout, y compris le tableau de bord et les chiffres", reception: "agenda, demandes et clients, sans les chiffres", own: "seulement son planning et ses créneaux" };

  /* ---------- Icônes ---------- */
  var P = {
    jour: '<path d="M12 3v2M12 19v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M3 12h2M19 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
    planning: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    agenda: '<rect x="4" y="5.5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    demandes: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    clients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/>',
    reglages: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.5"/><circle cx="8" cy="17" r="2.5"/>',
    aide: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
    plus: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    install: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/>',
    addbox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
    map: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'
  };
  LM.icon = function (n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || "") + "</svg>"; };

  /* ---------- Écrans et accès ---------- */
  var ALL = ["manager", "reception", "own"], OFFICE = ["manager", "reception"];
  LM.VIEWS = [
    { id: "jour", label: "Aujourd'hui", acc: OFFICE },
    { id: "planning", label: "Mon planning", short: "Planning", acc: ["own"] },
    { id: "agenda", label: "Agenda", acc: ALL },
    { id: "demandes", label: "Demandes", acc: OFFICE, badge: true },
    { id: "stats", label: "Tableau de bord", short: "Chiffres", acc: ["manager"] },
    { id: "clients", label: "Clients", acc: OFFICE },
    { id: "reglages", label: "Réglages", acc: ALL },
    { id: "aide", label: "Aide", acc: ALL },
    { id: "plus", label: "Plus", acc: ALL, phoneOnly: true }
  ];
  var TABS = { manager: ["jour", "agenda", "demandes", "stats", "plus"], reception: ["jour", "agenda", "demandes", "clients", "plus"], own: ["planning", "agenda", "plus"] };
  LM.access = function () { return (LM.me && LM.me.access) || "own"; };
  LM.isOffice = function () { return LM.access() === "manager" || LM.access() === "reception"; };
  LM.isManager = function () { return LM.access() === "manager"; };
  LM.can = function (id) { var v = LM.VIEWS.find(function (x) { return x.id === id; }); return !!v && v.acc.indexOf(LM.access()) >= 0; };
  LM.home = function () { return LM.isOffice() ? "jour" : "planning"; };
  LM.view = function (id, fn) { LM.views[id] = fn; };

  /* ---------- Outils ---------- */
  LM.esc = function (v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); };
  LM.fmt = function (iso, opts) { try { return new Intl.DateTimeFormat("fr-FR", Object.assign({ timeZone: LM.TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }, opts || {})).format(new Date(iso)); } catch (e) { return iso; } };
  LM.time = function (iso) { return LM.fmt(iso, { weekday: undefined, day: undefined, month: undefined }); };
  LM.fmtDay = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : iso || ""; };
  LM.dm = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? m[3] + "/" + m[2] : ""; };
  LM.today = function (offsetDays) { return new Intl.DateTimeFormat("en-CA", { timeZone: LM.TZ }).format(new Date(Date.now() + (offsetDays || 0) * 86400000)); };
  LM.addDays = function (iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  LM.dayLabel = function (iso) {
    if (iso === LM.today()) return "Aujourd'hui"; if (iso === LM.today(1)) return "Demain";
    return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z")).replace(/^./, function (c) { return c.toUpperCase(); });
  };
  /* Heure d'arrivée Little Hotel « 03:00 PM » -> « 15:00 ». */
  LM.eta = function (v) { var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(v || "").trim()); if (!m) return v || ""; var h = Number(m[1]) % 12 + (/pm/i.test(m[3] || "") ? 12 : 0); if (!m[3]) h = Number(m[1]); return String(h).padStart(2, "0") + ":" + m[2]; };
  LM.mad = function (n, dec) { return (n == null || isNaN(n)) ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: dec || 0 }).format(n) + " MAD"; };
  LM.num = function (n, dec) { return (n == null || isNaN(n)) ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: dec == null ? 0 : dec, minimumFractionDigits: dec || 0 }).format(n); };
  LM.toast = function (msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(LM.toast.t); LM.toast.t = setTimeout(function () { toastEl.hidden = true; }, 2800); };
  LM.guestName = function (o) { var g = o && (o.guests || o.guest); return g ? [g.first_name, g.last_name].filter(Boolean).join(" ") : ""; };
  LM.wa = function (phone, text) { return "https://wa.me/" + String(phone || "").replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : ""); };
  LM.fail = function (e) { console.error(e); LM.toast((e && e.message) || "Erreur"); };
  /* « Deluxe, Suite prestige 4, Suite Royal 7 » -> « 1 · 4 · 7 » (numéros du tableau du riad). */
  LM.suiteNos = function (rooms) {
    if (!rooms) return "";
    return String(rooms).split(",").map(function (r) { r = r.trim(); if (/deluxe/i.test(r)) return "1"; var m = /(\d+)\s*$/.exec(r); return m ? m[1] : r; }).filter(Boolean).join(" · ");
  };
  LM.openPanel = function (html) { panel.querySelector(".panel-inner").innerHTML = '<button type="button" class="btn sm close" data-close>Fermer</button>' + html; panel.hidden = false; document.body.classList.add("locked"); panel.querySelector(".panel-inner").scrollTop = 0; return panel; };
  LM.closePanel = function () { panel.hidden = true; document.body.classList.remove("locked"); };
  panel.addEventListener("click", function (e) { if (e.target === panel || e.target.closest("[data-close]")) LM.closePanel(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") LM.closePanel(); });

  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) { app.innerHTML = '<div class="card">Renseignez <code>assets/config.js</code> (URL et clé anonyme du projet Supabase).</div>'; return; }
  var sb = LM.sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

  LM.api = function (path, body, method) {
    return sb.auth.getSession().then(function (r) {
      var token = r.data.session && r.data.session.access_token;
      return fetch(LM.FN + path, { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: C.SUPABASE_ANON_KEY }, body: body ? JSON.stringify(body) : undefined });
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.message || "Erreur " + r.status); return j; }); });
  };

  /* ---------- Connexion ---------- */
  var LOGIN_DOMAIN = "kasbahlamoun.app";
  LM.toEmail = function (u) { u = String(u || "").trim().toLowerCase(); return u.indexOf("@") >= 0 ? u : u + "@" + LOGIN_DOMAIN; };
  LM.shortLogin = function (email) { email = String(email || ""); return email.slice(-LOGIN_DOMAIN.length - 1) === "@" + LOGIN_DOMAIN ? email.slice(0, -LOGIN_DOMAIN.length - 1) : email; };
  function loginView(msg) {
    document.body.classList.remove("authed"); tabs.hidden = true; $("appbar").hidden = true;
    app.innerHTML = '<div class="card login"><img class="logo" src="logo-mark.png" alt=""><h1>Équipe La Moun</h1><p class="muted" style="text-align:center">Connectez-vous avec l\'identifiant et le mot de passe donnés par la gérance.</p>' +
      '<form id="login" class="order"><label class="f"><span>Identifiant</span><input name="user" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="ex. mouna"></label>' +
      '<label class="f"><span>Mot de passe</span><input type="password" name="password" required autocomplete="current-password"></label>' +
      '<button class="btn solid" type="submit">Se connecter</button></form>' +
      (msg ? '<p class="small" style="color:var(--no);margin-top:10px">' + LM.esc(msg) + "</p>" : "") + '<div id="loginInstall"></div></div>';
    $("login").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target; f.querySelector("button").disabled = true;
      sb.auth.signInWithPassword({ email: LM.toEmail(f.user.value), password: f.password.value }).then(function (r) {
        if (r.error) { loginView("Identifiant ou mot de passe incorrect."); return; }
        boot();
      });
    });
    if (LM.pwa) LM.pwa.loginHint($("loginInstall"));
  }
  LM.loginView = loginView;
  LM.changeMyPassword = function () {
    var p = prompt("Nouveau mot de passe (6 caractères minimum) :"); if (!p) return;
    if (p.length < 6) return LM.toast("6 caractères minimum");
    sb.auth.updateUser({ password: p }).then(function (r) { if (r.error) return LM.fail(r.error); LM.toast("Mot de passe changé"); });
  };
  LM.logout = function () { sb.auth.signOut().then(function () { LM.me = null; location.hash = ""; loginView(); }); };

  function boot() {
    return sb.auth.getSession().then(function (r) {
      LM.session = r.data.session;
      if (!LM.session) { loginView(); return; }
      return sb.from("staff").select("*").ilike("email", LM.session.user.email).eq("active", true).maybeSingle().then(function (q) {
        if (q.error || !q.data) { loginView("Ce compte (" + LM.shortLogin(LM.session.user.email) + ") n'est relié à aucun membre de l'équipe. Demandez à la gérance."); sb.auth.signOut(); return; }
        LM.me = q.data;
        document.body.classList.add("authed"); $("appbar").hidden = false; tabs.hidden = false;
        buildNav();
        return LM.loadCache().then(function () { route(); listen(); if (LM.pwa) LM.pwa.afterLogin(); });
      });
    });
  }
  LM.boot = boot;
  LM.loadCache = function () {
    var reqs = [sb.from("staff").select("*").order("name"), sb.from("resources").select("*").order("name")];
    if (LM.isOffice()) reqs.push(sb.from("settings").select("*"));
    return Promise.all(reqs).then(function (r) {
      LM.cache.staff = r[0].data || []; LM.cache.resources = r[1].data || []; LM.cache.settings = {};
      ((r[2] && r[2].data) || []).forEach(function (s) { LM.cache.settings[s.key] = s.value || ""; });
      return LM.countPending();
    });
  };
  LM.countPending = function () {
    if (!LM.isOffice()) return Promise.resolve();
    return sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").then(function (r) {
      document.querySelectorAll("[data-badge]").forEach(function (b) { b.hidden = !r.count; b.textContent = r.count || ""; });
      LM.pendingCount = r.count || 0;
    });
  };

  /* ---------- Navigation ---------- */
  function link(v, tab) { return '<a href="#' + v.id + '" data-view="' + v.id + '">' + LM.icon(v.id) + "<span>" + LM.esc(tab && v.short ? v.short : v.label) + "</span>" + (v.badge ? '<b class="badge" data-badge hidden></b>' : "") + "</a>"; }
  function buildNav() {
    var acc = LM.access();
    $("sideNav").innerHTML = LM.VIEWS.filter(function (v) { return !v.phoneOnly && v.acc.indexOf(acc) >= 0; }).map(function (v) { return link(v); }).join("");
    $("sideFoot").innerHTML = '<div class="who"><b>' + LM.esc(LM.me.name) + "</b>" + LM.esc(LM.ACCESS[acc] || "") + "</div>" +
      '<button type="button" class="act" data-install hidden>' + LM.icon("install") + "<span>Installer l'appli</span></button>" +
      '<button type="button" class="act" data-notif hidden>' + LM.icon("bell") + "<span>Activer les notifications</span></button>" +
      '<button type="button" class="act" data-pwd>' + LM.icon("key") + "<span>Mot de passe</span></button>" +
      '<button type="button" class="act" data-logout>' + LM.icon("logout") + "<span>Se déconnecter</span></button>";
    tabs.innerHTML = TABS[acc].map(function (id) { return link(LM.VIEWS.find(function (v) { return v.id === id; }), true); }).join("");
    tabs.style.setProperty("--n", TABS[acc].length);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-pwd],[data-logout],[data-install],[data-notif]"); if (!t) return;
    if (t.hasAttribute("data-pwd")) LM.changeMyPassword();
    else if (t.hasAttribute("data-logout")) LM.logout();
    else if (t.hasAttribute("data-install") && LM.pwa) LM.pwa.install();
    else if (t.hasAttribute("data-notif") && LM.pwa) LM.pwa.enablePush();
  });
  $("refresh").addEventListener("click", function () { LM.loadCache().then(route); });

  function route() {
    if (!LM.me) return;
    var v = (location.hash || "").slice(1).split("/")[0];
    if (!v || !LM.views[v] || !LM.can(v)) v = LM.home();
    if (v === "plus" && LM.DESKTOP.matches) v = LM.home();
    LM.current = v; LM.closePanel();
    var meta = LM.VIEWS.find(function (x) { return x.id === v; });
    $("appTitle").textContent = meta ? meta.label : "La Moun";
    document.title = (meta ? meta.label + " · " : "") + "La Moun Équipe";
    document.querySelectorAll("#sideNav a, #tabs a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-view") === v); });
    if (TABS[LM.access()].indexOf(v) < 0) { var p = tabs.querySelector('[data-view="plus"]'); if (p) p.classList.add("on"); }
    window.scrollTo(0, 0);
    LM.cal = null; LM.refresh = null;
    try { LM.views[v](); } catch (err) { LM.fail(err); }
    if (LM.pwa) LM.pwa.syncButtons();
  }
  LM.route = route;
  window.addEventListener("hashchange", route);
  LM.DESKTOP.addEventListener && LM.DESKTOP.addEventListener("change", function () { if (LM.current === "plus" || LM.current === "agenda") route(); });

  /* ---------- Temps réel (repli : toutes les 60 s) ---------- */
  var listening = false;
  function listen() {
    if (listening) return; listening = true;
    function bump() { LM.countPending(); if (LM.cal) LM.cal.refetchEvents(); if (LM.refresh) LM.refresh(); }
    try {
      var ch = sb.channel("pms").on("postgres_changes", { event: "*", schema: "public", table: "events" }, bump);
      if (LM.isOffice()) ch = ch.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, bump);
      ch.subscribe();
    } catch (e) { /* sans temps réel */ }
    setInterval(bump, 60000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) bump(); });
  }

  LM.start = function () { boot(); };
})();
