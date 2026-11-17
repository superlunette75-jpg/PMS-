/* Import des exports CSV de Little Hotel (gérants) : mêmes règles que scripts/import_littlehotel.py.
   Réservations : mises à jour par référence. Paiements : empreinte stable par ligne (pas de doublon au réimport).
   Listing clients : complète le pays et la ville des réservations qui n'en ont pas. */
(function () {
  "use strict";
  var LM = window.LM; if (!LM || !LM.sb) return;
  var sb = LM.sb, esc = LM.esc;
  var MONTHS = { jan: 1, janv: 1, "fév": 2, fev: 2, "févr": 2, mar: 3, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, "août": 8, aout: 8, sept: 9, sep: 9, oct: 10, nov: 11, "déc": 12, dec: 12 };

  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    var head = rows.shift() || [];
    return rows.filter(function (r) { return r.length > 1 || (r[0] || "").trim(); }).map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = r[j] == null ? "" : r[j]; }); return o; });
  }
  function dSlash(v) { var m = /^\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/.exec(v || ""); return m ? m[3] + "-" + m[2] + "-" + m[1] : null; }
  function dFrench(v) { var m = /^\s*(\d{1,2})\s+([^\s.]+)\.?\s+(\d{4})/.exec(v || ""); if (!m || !MONTHS[m[2].toLowerCase()]) return null; return m[3] + "-" + String(MONTHS[m[2].toLowerCase()]).padStart(2, "0") + "-" + String(Number(m[1])).padStart(2, "0"); }
  function num(v) { v = String(v || "").replace(/[   ]/g, "").replace("DH", "").replace(",", "."); var n = parseFloat(v); return isNaN(n) || !/^-?[\d.]+$/.test(v) ? null : n; }
  function clean(v) { v = String(v || "").trim(); if (v === "" || v === ".") return null; v = v.replace(/^\.+/, ""); return v || null; }
  function int(v, d) { var n = num(v); return n == null ? d : Math.trunc(n); }
  function sha1(s) { return crypto.subtle.digest("SHA-1", new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join("").slice(0, 20); }); }

  function kindOf(rows) {
    var h = rows.length ? Object.keys(rows[0]) : [];
    if (h.indexOf("Référence de réservation") >= 0) return "reservations";
    if (h.indexOf("Passerelle de paiement") >= 0) return "payments";
    if (h.indexOf("Type de document") >= 0) return "guests";
    if (h.indexOf("Numéro de chambre") >= 0) return "arrivals";
    if (h.indexOf("Payment Method") >= 0) return "summary";
    return "unknown";
  }
  var LABEL = { reservations: "Réservations", payments: "Paiements", guests: "Listing clients", arrivals: "Arrivées / départs (déjà inclus dans Réservations, ignoré)", summary: "Résumé des paiements (recalculé automatiquement, ignoré)", unknown: "Format non reconnu, ignoré" };

  function mapRes(rows) {
    return rows.map(function (r) {
      var ref = clean(r["Référence de réservation"]); if (!ref) return null;
      return { ref: ref, booked_on: dSlash(r["Date de réservation"]), channel: clean(r["Nom du canal"]), first_name: clean(r["Prénom du client"]), last_name: clean(r["Nom du client"]), email: clean(r["E-mail"]), phone: clean(r["Numéro de téléphone du client"]),
        country: clean(r["Pays du client"]), city: clean(r["Ville du client"]), arrival: dSlash(r["Date d'arrivée"]), departure: dSlash(r["Date de départ"]), nights: int(r["Durée de séjour (en nuits)"], 0), eta: clean(r["Heure d'arrivée"]),
        comments: clean(r["Commentaires du client"]), notes: clean(r["Notes"]), status: clean(r["Statut de la réservation"]), cancelled_on: dSlash(r["Date d'annulation"]), room_types: clean(r["Type de chambre"]), rooms: clean(r["Chambre(s)"]),
        rooms_count: int(r["Nombre de chambres"], 1) || 1, adults: int(r["Nombre d'adultes"], 0), children: int(r["Nombre d'enfants"], 0), subtotal: num(r["Montant du sous-total (taxes comprises)"]), extras: num(r["Montant total des suppléments"]),
        tourist_tax: num(r["Total taxes fixes"]), total: num(r["Montant total"]), paid: num(r["Paiement reçu"]), due: num(r["Montant dû"]), invoice: clean(r["Numéro de facture"]), updated_at: new Date().toISOString() };
    }).filter(Boolean);
  }
  function mapPay(rows) {
    var seen = {};
    return Promise.all(rows.map(function (r) {
      var ref = clean(r["Numéro de réservation"]); if (!ref) return null;
      var base = [r["Date"] || "", r["HEURE"] || "", ref, r["Type de transaction"] || "", r["Type de paiement"] || "", r["Type de carte"] || "", (r["Description"] || "").trim(), r["Total"] || ""].join("|");
      seen[base] = (seen[base] || 0) + 1;
      return sha1(base + "|" + seen[base]).then(function (id) {
        return { id: id, paid_on: dSlash(r["Date"]), paid_time: clean(r["HEURE"]), ref: ref, guest: clean(r["Nom du client"]), txn_type: clean(r["Type de transaction"]), method: clean(r["Type de paiement"]), card: clean(r["Type de carte"]), description: clean(r["Description"]), amount: num(r["Total"]), updated_at: new Date().toISOString() };
      });
    })).then(function (x) { return x.filter(Boolean); });
  }
  function chunks(list, n) { var out = []; for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; }
  function upsertAll(table, rows, key) {
    return chunks(rows, 200).reduce(function (p, part) { return p.then(function () { return sb.from(table).upsert(part, { onConflict: key }).then(function (r) { if (r.error) throw r.error; }); }); }, Promise.resolve());
  }
  function patchCountries(rows) {
    var g = rows.map(function (r) { return { last: clean(r["Nom"]), arrival: dFrench(r["Date d'arrivée"]), country: clean(r["Pays"]), city: clean(r["Ville"]) }; }).filter(function (x) { return x.last && x.arrival && x.country; });
    return sb.from("lh_reservations").select("ref, last_name, arrival, city").is("country", null).limit(5000).then(function (r) {
      if (r.error) throw r.error;
      var patches = [];
      (r.data || []).forEach(function (res) {
        var m = g.find(function (x) { return x.arrival === res.arrival && x.last.toLowerCase() === String(res.last_name || "").toLowerCase(); });
        if (m) patches.push({ ref: res.ref, country: m.country, city: res.city || m.city });
      });
      return Promise.all(patches.map(function (p) { return sb.from("lh_reservations").update({ country: p.country, city: p.city }).eq("ref", p.ref); })).then(function () { return patches.length; });
    });
  }

  LM.lhImport = function () {
    LM.openPanel("<h2>Importer Little Hotel</h2><p class='small muted'>Dans Little Hotel : Rapports > exporter en CSV, puis déposez les fichiers ici. Utile : <b>Réservations</b> (de préférence de l'année passée à fin de l'année prochaine), <b>Paiements</b>, <b>Listing clients</b>. Rien n'est doublé : les réservations sont mises à jour par référence.</p>" +
      '<label class="drop" id="drop"><input type="file" id="files" accept=".csv,text/csv" multiple hidden><b>Choisir ou déposer les fichiers CSV</b><br><span class="small muted">plusieurs fichiers à la fois</span></label><div id="impOut" style="margin-top:12px"></div>');
    var drop = document.getElementById("drop"), input = document.getElementById("files"), out = document.getElementById("impOut");
    ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (ev) { handle(ev.dataTransfer.files); });
    input.addEventListener("change", function () { handle(input.files); });

    function handle(fileList) {
      var files = Array.prototype.slice.call(fileList || []); if (!files.length) return;
      Promise.all(files.map(function (f) { return f.text().then(function (t) { var rows = parseCSV(t); return { name: f.name, rows: rows, kind: kindOf(rows) }; }); })).then(function (parsed) {
        var order = { reservations: 0, payments: 1, guests: 2 };
        parsed.sort(function (a, b) { return (order[a.kind] == null ? 9 : order[a.kind]) - (order[b.kind] == null ? 9 : order[b.kind]); });
        out.innerHTML = "<ul class='small'>" + parsed.map(function (p) { return "<li><b>" + esc(p.name) + "</b> : " + esc(LABEL[p.kind]) + (order[p.kind] != null ? " · " + p.rows.length + " lignes" : "") + "</li>"; }).join("") + "</ul>" +
          (parsed.some(function (p) { return order[p.kind] != null; }) ? '<button class="btn solid" id="goImp">Importer</button>' : "<p class='small'>Aucun fichier utile.</p>");
        var go = document.getElementById("goImp"); if (!go) return;
        go.addEventListener("click", function () {
          go.disabled = true; go.textContent = "Import en cours…";
          var report = [];
          parsed.filter(function (p) { return order[p.kind] != null; }).reduce(function (prom, p) {
            return prom.then(function () {
              var step = p.kind === "reservations" ? (function () { var rows = mapRes(p.rows); return upsertAll("lh_reservations", rows, "ref").then(function () { return rows.length + " réservations"; }); })()
                : p.kind === "payments" ? mapPay(p.rows).then(function (rows) { return upsertAll("lh_payments", rows, "id").then(function () { return rows.length + " paiements"; }); })
                : patchCountries(p.rows).then(function (n) { return n + " pays complétés"; });
              return step.then(function (msg) { report.push(esc(p.name) + " : " + msg); return sb.from("lh_imports").insert({ kind: p.kind, file_name: p.name, rows: p.rows.length, imported_by: LM.me.name }); });
            });
          }, Promise.resolve()).then(function () {
            out.innerHTML = "<p class='small'>✅ Import terminé.<br>" + report.join("<br>") + "</p><button class='btn solid' data-close>Voir le tableau de bord</button>";
            out.querySelector("[data-close]").addEventListener("click", function () { LM.reloadDash && LM.reloadDash(); });
          }, function (e) { go.disabled = false; go.textContent = "Réessayer"; LM.fail(e); out.insertAdjacentHTML("beforeend", "<p class='small' style='color:var(--no)'>Erreur : " + esc(e.message || e) + "</p>"); });
        });
      });
    }
  };
  LM.lhParse = { parseCSV: parseCSV, mapRes: mapRes, mapPay: mapPay, kindOf: kindOf };
})();
