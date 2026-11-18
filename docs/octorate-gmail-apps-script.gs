/**
 * Kasbah La Moun : transmet les e-mails de réservation Octorate à l'appli équipe.
 * Chaque nouvelle réservation, modification ou annulation apparaît alors dans l'appli
 * (Aujourd'hui, planning ménage, tableau de bord) et l'équipe est prévenue.
 *
 * Installation (5 minutes, une seule fois), sur la boîte Gmail qui reçoit les e-mails d'Octorate :
 * 1. Aller sur https://script.google.com > Nouveau projet. Coller ce fichier à la place du contenu.
 * 2. Remplacer SECRET par le code affiché dans l'appli : Réglages > Octorate.
 * 3. Vérifier QUERY : l'adresse d'expédition des e-mails Octorate (voir un e-mail reçu).
 * 4. Choisir la fonction « installer » en haut, puis Exécuter. Autoriser l'accès à Gmail.
 *    Elle transmet les e-mails des 3 derniers jours, puis toutes les 5 minutes.
 * Si la boîte du riad n'est pas un Gmail : la faire transférer automatiquement vers un Gmail
 * et installer le script sur ce Gmail.
 */
var CONFIG = {
  ENDPOINT: "https://xysskjvpotmpekmtgzhp.supabase.co/functions/v1/octorate?action=mail",
  SECRET: "COLLER_ICI_LE_CODE_DE_L_APPLI",
  QUERY: "from:octorate newer_than:3d"
};

function transmettre() {
  var props = PropertiesService.getScriptProperties();
  var done = JSON.parse(props.getProperty("done") || "[]");
  var threads = GmailApp.search(CONFIG.QUERY, 0, 50);
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      var id = m.getId();
      if (done.indexOf(id) >= 0) return;
      var res = UrlFetchApp.fetch(CONFIG.ENDPOINT, {
        method: "post", contentType: "application/json", muteHttpExceptions: true,
        headers: { "x-mail-secret": CONFIG.SECRET },
        payload: JSON.stringify({ messageId: id, from: m.getFrom(), subject: m.getSubject(), date: m.getDate().toISOString(), html: m.getBody(), text: m.getPlainBody() })
      });
      if (res.getResponseCode() === 200) done.push(id);
      else console.log("Refusé (" + res.getResponseCode() + ") : " + res.getContentText());
    });
  });
  props.setProperty("done", JSON.stringify(done.slice(-400)));
}

function installer() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("transmettre").timeBased().everyMinutes(5).create();
  transmettre();
}
