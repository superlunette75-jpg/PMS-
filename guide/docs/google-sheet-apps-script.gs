/**
 * Kasbah La Moun : réception du check-in en ligne dans une Google Sheet.
 *
 * Installation (5 minutes, une seule fois) :
 * 1. Ouvrir la Google Sheet du riad (ou en créer une), menu Extensions > Apps Script.
 * 2. Remplacer le contenu par ce fichier, enregistrer.
 * 3. Déployer > Nouveau déploiement > type « Application Web ».
 *    Exécuter en tant que : Moi. Qui a accès : Tout le monde.
 * 4. Autoriser l'accès, copier l'URL qui finit par /exec.
 * 5. Coller cette URL dans assets/common.js : var CHECKIN = { endpoint: "https://script.google.com/.../exec" };
 *
 * Chaque check-in ajoute une ligne dans l'onglet « Check-in » (créé automatiquement),
 * les en-têtes de colonnes sont écrits à la première réception.
 */
var SHEET_NAME = "Check-in";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    var keys = Object.keys(data);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Reçu le"].concat(keys));
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, keys.length + 1).setFontWeight("bold");
    }
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    /* Nouvelle colonne si le formulaire gagne un champ plus tard. */
    keys.forEach(function (k) {
      if (headers.indexOf(k) === -1) { headers.push(k); sheet.getRange(1, headers.length).setValue(k).setFontWeight("bold"); }
    });
    var row = headers.map(function (h) {
      if (h === "Reçu le") return new Date();
      var v = data[h];
      /* Texte brut : empêche une valeur commençant par = + - @ d'être lue comme une formule. */
      return v === undefined ? "" : (typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v);
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
