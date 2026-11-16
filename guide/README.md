# Kasbah La Moun : guide de bienvenue

Site statique multilingue (fr, en, es, de, ar), sans build. Déployer le dossier tel quel (Netlify, glisser-déposer ou lien au dépôt).

Pages : accueil, transfert, restaurant, spa, Marrakech, réserver (demandes envoyées sur WhatsApp).

## Check-in en ligne

Page `/checkin/` : reprend la fiche client papier. Les fiches partent dans une Google Sheet via Apps Script (`docs/google-sheet-apps-script.gs`, instructions dans le fichier), à brancher dans `assets/common.js` (`CHECKIN.endpoint`). Tant que l'URL est vide, la fiche part sur le WhatsApp du riad.
