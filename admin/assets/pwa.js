/* Installation sur l'écran d'accueil et notifications push.
   - Android, Chrome, Edge : le vrai bouton d'installation du navigateur (beforeinstallprompt).
   - iPhone, iPad, Safari Mac : pas de bouton possible, on montre les 2 gestes à faire, avec les icônes.
   - Notifications : sur iPhone seulement une fois l'appli installée (iOS 16.4+). */
(function () {
  "use strict";
  var LM = window.LM; if (!LM) return;
  var C = window.CONFIG || {}, esc = LM.esc, deferred = null, pushState = { supported: false, subscribed: false };
  var ua = navigator.userAgent || "";
  var ANDROID = /android/i.test(ua);
  var IOS = !ANDROID && (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  var MAC_SAFARI = !IOS && /macintosh/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|edg|firefox/i.test(ua);
  var IOS_OTHER = IOS && /crios|fxios|edgios/i.test(ua);
  function standalone() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function canInstall() { return !standalone() && (!!deferred || IOS || MAC_SAFARI || ANDROID); }
  function dismissed() { var t = Number(store("lm_install_dismissed") || 0); return t && Date.now() - t < 5 * 86400000; }

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").then(checkPush).catch(function () {});
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; syncButtons(); });
  window.addEventListener("appinstalled", function () { deferred = null; LM.toast("Appli installée ✔︎"); syncButtons(); });

  function checkPush() {
    pushState.supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!C.VAPID_PUBLIC_KEY;
    if (!pushState.supported) return Promise.resolve();
    var ready = Promise.race([navigator.serviceWorker.ready, new Promise(function (_, ko) { setTimeout(function () { ko(new Error("sw")); }, 3000); })]);
    return ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      pushState.subscribed = !!sub && Notification.permission === "granted"; pushState.sub = sub; syncButtons();
    }).catch(function () {});
  }
  function needsPush() { return pushState.supported && !pushState.subscribed && (!IOS || standalone()) && (window.Notification && Notification.permission !== "denied"); }

  function syncButtons() {
    var inst = canInstall(), notif = needsPush();
    document.querySelectorAll("[data-install]").forEach(function (b) { b.hidden = !inst; });
    document.querySelectorAll("[data-notif]").forEach(function (b) { b.hidden = !notif; });
  }

  /* ---------- Installation ---------- */
  var ICON_SHARE = LM.icon("share"), ICON_ADD = LM.icon("addbox");
  function steps() {
    if (IOS) return "<ol class='steps'><li><span>Touchez <b>Partager</b> " + ICON_SHARE + " en bas de " + (IOS_OTHER ? "l'écran (ou ouvrez ce lien dans <b>Safari</b> si vous ne le voyez pas)" : "Safari") + ".</span></li><li><span>Faites défiler et touchez <b>Sur l'écran d'accueil</b> " + ICON_ADD + ".</span></li><li><span>Touchez <b>Ajouter</b>. L'icône La Moun apparaît sur votre écran d'accueil : ouvrez l'appli depuis cette icône.</span></li></ol>";
    if (MAC_SAFARI) return "<ol class='steps'><li><span>Menu <b>Fichier</b> de Safari.</span></li><li><span><b>Ajouter au Dock…</b> puis <b>Ajouter</b>.</span></li></ol>";
    if (ANDROID) return "<ol class='steps'><li><span>Touchez le menu <b>⋮</b> en haut à droite de Chrome.</span></li><li><span>Touchez <b>Installer l'application</b> (ou <b>Ajouter à l'écran d'accueil</b>).</span></li></ol>";
    return "<ol class='steps'><li><span>Dans Chrome ou Edge, cliquez sur l'icône d'installation " + LM.icon("install") + " à droite de la barre d'adresse.</span></li><li><span>Cliquez sur <b>Installer</b>.</span></li></ol>";
  }
  function install() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (c) { if (c.outcome !== "accepted") store("lm_install_dismissed", String(Date.now())); deferred = null; syncButtons(); });
      return;
    }
    LM.openPanel('<div style="text-align:center;margin:6px 0 4px"><img src="icon-192.png" alt="" width="72" height="72" style="border-radius:16px"></div><h2 style="text-align:center">Installer La Moun</h2>' +
      "<p class='muted' style='text-align:center'>L'appli s'ouvre en un geste depuis l'écran d'accueil, en plein écran, et peut vous envoyer les nouvelles demandes et les rappels.</p>" + steps() +
      (IOS ? "<p class='note'>Les notifications sur iPhone ne fonctionnent qu'une fois l'appli ajoutée à l'écran d'accueil et ouverte depuis son icône.</p>" : "") +
      '<div class="row" style="margin-top:12px"><button class="btn" data-close id="later">Plus tard</button></div>');
    var later = document.getElementById("later"); if (later) later.addEventListener("click", function () { store("lm_install_dismissed", String(Date.now())); });
  }

  /* Bandeau en haut des écrans d'accueil : installer, puis activer les notifications. */
  function bannerHtml(force) {
    if (canInstall() && (force || !dismissed())) return '<div class="install" data-banner="install"><img src="icon-192.png" alt=""><div class="txt"><b>Installez l\'appli</b>Sur l\'écran d\'accueil, comme une vraie appli, avec les notifications.</div><button class="btn sm" data-install>Installer</button>' + (force ? "" : '<button class="x" data-dismiss aria-label="Plus tard">×</button>') + "</div>";
    if (standalone() && needsPush() && (force || store("lm_push_dismissed") !== "1")) return '<div class="install" data-banner="push"><img src="icon-192.png" alt=""><div class="txt"><b>Activez les notifications</b>Nouvelles demandes et rappels, même appli fermée.</div><button class="btn sm" data-notif>Activer</button>' + (force ? "" : '<button class="x" data-dismiss aria-label="Plus tard">×</button>') + "</div>";
    return "";
  }
  function bindBanner(root) {
    root.querySelectorAll("[data-dismiss]").forEach(function (x) {
      x.addEventListener("click", function () { var b = x.closest("[data-banner]"); store(b.getAttribute("data-banner") === "push" ? "lm_push_dismissed" : "lm_install_dismissed", b.getAttribute("data-banner") === "push" ? "1" : String(Date.now())); b.remove(); });
    });
  }

  /* ---------- Notifications push ---------- */
  function urlB64(s) { var p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function enablePush() {
    if (!pushState.supported) return LM.toast(IOS ? "Installez d'abord l'appli sur l'écran d'accueil." : "Ce navigateur ne gère pas les notifications.");
    if (IOS && !standalone()) return install();
    if (Notification.permission === "denied") return LM.openPanel("<h2>Notifications bloquées</h2><p>Elles ont été refusées pour cette appli. Pour les autoriser : " + (IOS ? "Réglages de l'iPhone > Notifications > La Moun." : ANDROID ? "appui long sur l'icône La Moun > Infos sur l'appli > Notifications." : "cadenas à gauche de l'adresse > Notifications > Autoriser.") + "</p>");
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") { LM.toast("Notifications non autorisées"); return; }
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(C.VAPID_PUBLIC_KEY) }); });
      }).then(saveSub).then(function () { LM.toast("Notifications activées ✔︎"); document.querySelectorAll('[data-banner="push"]').forEach(function (b) { b.remove(); }); if (LM.current === "reglages") LM.route(); });
    }).catch(LM.fail);
  }
  function saveSub(sub) {
    var j = sub.toJSON();
    return LM.sb.rpc("save_push", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: ua }).then(function (r) {
      if (r.error) throw r.error; pushState.subscribed = true; pushState.sub = sub; syncButtons();
    });
  }
  function disablePush() {
    if (!pushState.sub) return;
    var ep = pushState.sub.endpoint;
    pushState.sub.unsubscribe().then(function () { return LM.sb.rpc("drop_push", { p_endpoint: ep }); }).then(function () { pushState.subscribed = false; pushState.sub = null; LM.toast("Notifications désactivées sur cet appareil"); LM.route(); });
  }
  function testPush() { LM.api("/push", { test: true }).then(function (r) { LM.toast(r.sent ? "Notification envoyée sur " + r.sent + " appareil(s)" : "Aucun appareil abonné"); }, LM.fail); }

  function settingsCard(el) {
    if (!el) return;
    var inst = standalone();
    el.innerHTML = "<h2>Appli et notifications</h2>" +
      "<p class='small'>" + (inst ? "✅ L'appli est installée sur cet appareil." : "📲 L'appli n'est pas encore installée sur cet appareil.") + "<br>" +
      (pushState.subscribed ? "🔔 Notifications activées sur cet appareil." : pushState.supported ? (IOS && !inst ? "🔕 Notifications : installez d'abord l'appli (iPhone)." : "🔕 Notifications pas encore activées sur cet appareil.") : "🔕 Ce navigateur ne gère pas les notifications.") + "</p>" +
      '<div class="row">' + (!inst ? '<button class="btn solid" data-install-btn>' + LM.icon("install") + " Installer l'appli</button>" : "") +
      (needsPush() ? '<button class="btn solid" data-notif>' + LM.icon("bell") + " Activer les notifications</button>" : "") +
      (pushState.subscribed ? '<button class="btn" id="pTest">Envoyer un test</button><button class="btn" id="pOff">Désactiver ici</button>' : "") + "</div>";
    var ib = el.querySelector("[data-install-btn]"); if (ib) ib.addEventListener("click", install);
    var t = el.querySelector("#pTest"); if (t) t.addEventListener("click", testPush);
    var o = el.querySelector("#pOff"); if (o) o.addEventListener("click", disablePush);
  }

  /* Après la connexion : on propose l'installation (téléphone), sinon les notifications. Une fois par session. */
  function afterLogin() {
    checkPush().then(function () {
      if (pushState.subscribed && pushState.sub) saveSub(pushState.sub).catch(function () {}); // rattache l'appareil au bon compte
      var phone = !LM.DESKTOP.matches, seen = sessionStorage.getItem("lm_prompted");
      if (seen) return; sessionStorage.setItem("lm_prompted", "1");
      setTimeout(function () {
        if (phone && canInstall() && !dismissed()) install();
        else if (standalone() && needsPush() && store("lm_push_dismissed") !== "1")
          LM.openPanel('<div style="text-align:center;margin:6px 0"><img src="icon-192.png" alt="" width="64" height="64" style="border-radius:14px"></div><h2 style="text-align:center">Recevoir les demandes ?</h2><p class="muted" style="text-align:center">Une notification à chaque nouvelle demande qui vous concerne, et un rappel avant chaque créneau.</p><div class="row"><button class="btn" data-close id="pLater">Plus tard</button><button class="btn solid" data-notif style="flex:1">Activer les notifications</button></div>'),
          document.getElementById("pLater").addEventListener("click", function () { store("lm_push_dismissed", "1"); });
      }, 900);
    });
  }
  function loginHint(el) {
    if (!el || !canInstall()) return;
    el.innerHTML = '<p class="small" style="text-align:center;margin:14px 0 0"><a href="#" id="instHint">📲 Installer l\'appli sur ce téléphone</a></p>';
    document.getElementById("instHint").addEventListener("click", function (e) { e.preventDefault(); install(); });
  }

  LM.pwa = { install: install, enablePush: enablePush, syncButtons: syncButtons, bannerHtml: bannerHtml, bindBanner: bindBanner, settingsCard: settingsCard, afterLogin: afterLogin, loginHint: loginHint, standalone: standalone };
})();
