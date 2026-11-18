/* Réglages > Octorate (gérants) : e-mails de réservation transmis par le script Gmail, et liens iCal des suites. */
(function () {
  "use strict";
  var LM = window.LM; if (!LM || !LM.sb) return;
  var sb = LM.sb, esc = LM.esc;
  var STATUS = { parsed: ["ok", "lu"], cancelled: ["due", "annulation"], needs_review: ["due", "à vérifier"], ignored: ["", "ignoré"], error: ["due", "erreur"], new: ["", "reçu"] };
  var SUITES = [[1, "Suite 1 · Deluxe"], [2, "Suite 2 · Prestige"], [3, "Suite 3 · Prestige"], [4, "Suite 4 · Prestige"], [5, "Suite 5 · Prestige"], [6, "Suite 6 · Prestige"], [7, "Suite 7 · Royale"], [8, "Suite 8 · Prestige"]];

  function script(secret) {
    return [
      "/** Kasbah La Moun : transmet les e-mails de réservation Octorate à l'appli équipe.",
      " * Choisir la fonction « installer » en haut, puis Exécuter, et autoriser Gmail. Ensuite tout est automatique (toutes les 5 minutes). */",
      "var CONFIG = {",
      '  ENDPOINT: "' + LM.FN + '/octorate?action=mail",',
      '  SECRET: "' + secret + '",',
      '  QUERY: "from:octorate newer_than:3d"   // adresse d\'expédition des e-mails Octorate, à ajuster si besoin',
      "};",
      "function transmettre() {",
      '  var props = PropertiesService.getScriptProperties(), done = JSON.parse(props.getProperty("done") || "[]");',
      "  GmailApp.search(CONFIG.QUERY, 0, 50).forEach(function (t) {",
      "    t.getMessages().forEach(function (m) {",
      "      var id = m.getId(); if (done.indexOf(id) >= 0) return;",
      '      var res = UrlFetchApp.fetch(CONFIG.ENDPOINT, { method: "post", contentType: "application/json", muteHttpExceptions: true, headers: { "x-mail-secret": CONFIG.SECRET },',
      "        payload: JSON.stringify({ messageId: id, from: m.getFrom(), subject: m.getSubject(), date: m.getDate().toISOString(), html: m.getBody(), text: m.getPlainBody() }) });",
      '      if (res.getResponseCode() === 200) done.push(id); else console.log("Refusé : " + res.getContentText());',
      "    });",
      "  });",
      '  props.setProperty("done", JSON.stringify(done.slice(-400)));',
      "}",
      "function installer() {",
      "  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });",
      '  ScriptApp.newTrigger("transmettre").timeBased().everyMinutes(5).create();',
      "  transmettre();",
      "}"
    ].join("\n");
  }

  LM.octorateCard = function (el) {
    if (!el) return;
    var s = LM.cache.settings, feeds = {}, last = null;
    try { feeds = JSON.parse(s.ical_feeds || "{}"); } catch (e) { feeds = {}; }
    try { last = s.ical_last_sync ? JSON.parse(s.ical_last_sync) : null; } catch (e) { last = null; }
    el.innerHTML = "<h2>Octorate · réservations</h2><p class='small muted'>Chaque e-mail de réservation d'Octorate (nouvelle, modifiée, annulée) arrive dans l'appli : écran Aujourd'hui, planning ménage, tableau de bord, et l'équipe est prévenue. Les liens iCal confirment quelle suite est occupée.</p>" +
      "<h3>1. E-mails de réservation</h3><ol class='imp-steps'><li>Sur la boîte <b>Gmail</b> qui reçoit les e-mails d'Octorate, ouvrir <a href='https://script.google.com/home/projects/create' target='_blank' rel='noreferrer'>script.google.com</a> (nouveau projet).</li><li>Coller le script ci-dessous à la place du contenu (le code secret est déjà dedans).</li><li>En haut, choisir la fonction <b>installer</b>, puis <b>Exécuter</b>, et autoriser l'accès à Gmail.</li></ol>" +
      '<div class="row" style="margin-bottom:10px"><button class="btn solid" id="octCopy">Copier le script</button><button class="btn" id="octShow">Voir le script</button></div>' +
      "<p class='tiny muted'>Boîte du riad qui n'est pas un Gmail : la faire transférer automatiquement vers un Gmail, puis installer le script sur ce Gmail. Si l'adresse d'expédition d'Octorate ne contient pas « octorate », adapter la ligne QUERY.</p>" +
      '<div id="octMails" style="margin:12px 0 18px"><p class="muted small">Chargement des e-mails reçus…</p></div>' +
      "<h3>2. Liens iCal par suite</h3><p class='small muted'>Dans Octorate, copier le lien d'export iCal (calendrier) de chaque suite et le coller ici. Synchronisation automatique toutes les heures.</p>" +
      '<form id="octIcal" class="order">' + SUITES.map(function (x) { return '<label class="f"><span>' + x[1] + '</span><input name="s' + x[0] + '" value="' + esc(feeds[x[0]] || "") + '" placeholder="https://…ics" inputmode="url" autocapitalize="none"></label>'; }).join("") +
      '<div class="row"><button class="btn solid" type="submit">Enregistrer les liens</button><button class="btn" type="button" id="octSync">Synchroniser maintenant</button></div></form>' +
      '<p class="small muted" id="octLast" style="margin-top:10px">' + lastLine(last) + "</p>";

    var code = script(s.octorate_mail_secret || "");
    document.getElementById("octCopy").addEventListener("click", function () {
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { LM.toast("Script copié : collez-le dans script.google.com"); }, function () { showScript(); });
    });
    document.getElementById("octShow").addEventListener("click", showScript);
    function showScript() { LM.openPanel("<h2>Script Gmail</h2><p class='small muted'>À coller dans un nouveau projet sur script.google.com. Ne le partagez pas : il contient le code secret de l'appli.</p><textarea class='input' style='min-height:50vh;font-family:ui-monospace,monospace;font-size:12px' readonly>" + esc(code) + "</textarea>"); }

    document.getElementById("octIcal").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, out = {};
      SUITES.forEach(function (x) { var v = f["s" + x[0]].value.trim(); if (v) out[x[0]] = v; });
      var bad = Object.keys(out).filter(function (k) { return !/^https?:\/\//.test(out[k]); });
      if (bad.length) return LM.toast("Lien invalide pour la suite " + bad.join(", "));
      sb.from("settings").upsert({ key: "ical_feeds", value: JSON.stringify(out) }).then(function (r) { if (r.error) return LM.fail(r.error); LM.cache.settings.ical_feeds = JSON.stringify(out); LM.toast(Object.keys(out).length + " lien(s) enregistré(s)"); });
    });
    document.getElementById("octSync").addEventListener("click", function (e) {
      var b = e.target; b.disabled = true; b.textContent = "Synchronisation…";
      LM.api("/octorate?action=ical", {}).then(function (r) { b.disabled = false; b.textContent = "Synchroniser maintenant"; document.getElementById("octLast").innerHTML = lastLine(r.report); LM.toast("Synchronisé"); }, function (err) { b.disabled = false; b.textContent = "Synchroniser maintenant"; LM.fail(err); });
    });
    loadMails();
  };

  function lastLine(r) {
    if (!r) return "Aucune synchronisation iCal pour l'instant.";
    return "Dernière synchronisation : " + LM.fmt(r.at) + " · " + r.feeds + " suite(s), " + r.events + " séjour(s) lus, " + r.created + " ajouté(s), " + r.filled + " suite(s) complétée(s), " + r.removed + " retiré(s)" + (r.errors && r.errors.length ? "<br><span style='color:var(--no)'>" + r.errors.map(esc).join("<br>") + "</span>" : "");
  }

  function loadMails() {
    sb.from("inbound_emails").select("id, received_at, subject, status, ref, error").order("received_at", { ascending: false }).limit(15).then(function (r) {
      var box = document.getElementById("octMails"); if (!box) return;
      var list = r.data || [];
      if (!list.length) { box.innerHTML = "<div class='note'>Aucun e-mail reçu pour l'instant. Après l'installation du script, les e-mails Octorate des 3 derniers jours arrivent ici en quelques minutes.</div>"; return; }
      var review = list.filter(function (m) { return m.status === "needs_review" || m.status === "error"; }).length;
      box.innerHTML = "<p class='small'><b>" + list.length + " derniers e-mails</b>" + (review ? " · <span style='color:var(--no)'>" + review + " à vérifier</span>" : " · tout est lu") + "</p><ul class='imp-list'>" + list.map(function (m) {
        var st = STATUS[m.status] || ["", m.status];
        return "<li data-mail='" + m.id + "' style='cursor:pointer'><b>" + esc(m.subject || "(sans objet)") + " <span class='pill " + st[0] + "'>" + esc(st[1]) + "</span></b>" + LM.fmt(m.received_at) + (m.ref ? " · " + esc(m.ref) : "") + (m.error ? " · " + esc(m.error) : "") + "</li>";
      }).join("") + "</ul>";
      box.querySelectorAll("[data-mail]").forEach(function (li) { li.addEventListener("click", function () { openMail(li.getAttribute("data-mail")); }); });
    });
  }

  function openMail(id) {
    sb.from("inbound_emails").select("*").eq("id", id).maybeSingle().then(function (r) {
      var m = r.data; if (!m) return;
      var p = m.parsed || {}, rows = [["Type", { new: "nouvelle", modified: "modification", cancelled: "annulation" }[p.kind] || "—"], ["Référence", m.ref || p.ref || "—"], ["Canal", p.channel], ["Client", [p.firstName, p.lastName].filter(Boolean).join(" ")], ["Arrivée", LM.fmtDay(p.arrival)], ["Départ", LM.fmtDay(p.departure)], ["Suite", p.rooms || p.roomType], ["Personnes", p.adults != null ? p.adults + (p.children ? " + " + p.children + " enf." : "") : ""], ["Montant", p.total != null ? p.total + " " + (p.currency || "") : ""], ["Heure d'arrivée", p.eta], ["Remarques", p.notes]];
      var text = /<\w+[^>]*>/.test(m.body || "") ? new DOMParser().parseFromString(m.body, "text/html").body.innerText : m.body || "";
      LM.openPanel("<h2>" + esc(m.subject || "E-mail") + "</h2><p class='small muted'>Reçu le " + LM.fmt(m.received_at) + (m.error ? " · " + esc(m.error) : "") + "</p>" +
        "<div class='kv'>" + rows.map(function (x) { return "<span>" + esc(x[0]) + "</span><b>" + esc(x[1] || "—") + "</b>"; }).join("") + "</div>" +
        '<div class="row" style="margin:12px 0"><button class="btn" id="reparse">Réanalyser</button></div>' +
        "<details><summary class='small'>Texte de l'e-mail</summary><pre class='small' style='white-space:pre-wrap;overflow-wrap:anywhere'>" + esc(text.slice(0, 20000)) + "</pre></details>");
      document.getElementById("reparse").addEventListener("click", function (e) {
        e.target.disabled = true;
        LM.api("/octorate?action=reparse", { id: id }).then(function (x) { LM.toast("Réanalysé : " + ((STATUS[x.status] || [0, x.status])[1])); LM.closePanel(); loadMails(); }, function (err) { e.target.disabled = false; LM.fail(err); });
      });
    });
  }
})();
