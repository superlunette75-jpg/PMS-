# Kasbah La Moun : guide de bienvenue + PMS

Trois parties, aucune étape de build :

- `guide/` : le guide de bienvenue des clients (site statique, Netlify). Check-in en ligne, transfert, spa, dîner, conciergerie, page « Mon séjour ».
- `admin/` : l'appli équipe (site statique, Netlify, second site). Agenda maître, demandes, clients, réglages.
- `supabase/` : base de données, règles de sécurité et fonctions (check-in, commandes, disponibilités, bot Telegram, rappels, iCal).

Flux : le client fait son check-in (obligatoire) → fiche enregistrée + copiée dans la Google Sheet + réception prévenue sur Telegram →
il commande depuis le guide → la demande est mise au calendrier de la bonne personne (spa sur un créneau libre) → cette personne
et la réception la reçoivent sur Telegram, en privé et dans le groupe, avec le numéro WhatsApp du client et des boutons Accepter /
Refuser → le client suit le statut dans « Mon séjour » → rappels automatiques avant chaque créneau et récap chaque soir.

## 1. Mise en place (une fois)

### Supabase
1. Créer un projet (région EU). Noter l'URL du projet, la clé `anon` et la clé `service_role` (tableau de bord > Project Settings > API).
2. Éditeur SQL : coller `supabase/migrations/0001_schema.sql`, exécuter. Puis `supabase/seed.sql` (adapter noms, e-mails, horaires).
3. Authentication > Providers : laisser **Email** activé (connexion par lien magique). Authentication > URL Configuration : ajouter l'URL de l'appli équipe dans *Redirect URLs*.
4. Edge Functions > Secrets : `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (chaîne au hasard), `CRON_SECRET` (chaîne au hasard), `APPS_SCRIPT_URL` (voir Google Sheet).
5. Déployer les fonctions. Avec le CLI (`brew install supabase/tap/supabase`, puis `supabase login`, `supabase link --project-ref <ref>`) :
   ```bash
   supabase functions deploy checkin order availability telegram remind ical status --no-verify-jwt
   ```
   Sans CLI : chaque fonction se colle dans Edge Functions > *Deploy a new function* (éditeur en ligne), en décochant *Verify JWT*. Les fichiers `_shared/*.ts` doivent être ajoutés comme fichiers supplémentaires de chaque fonction.
6. Rappels : Database > Extensions, activer `pg_cron` et `pg_net`, puis dans l'éditeur SQL :
   ```sql
   select cron.schedule('lamoun-remind', '*/15 * * * *', $$
     select net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/remind',
       headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
       body := '{}'::jsonb);
   $$);
   ```

### Telegram
1. Dans Telegram, parler à **@BotFather** : `/newbot`, choisir un nom (ex. « La Moun Équipe ») et un identifiant (ex. `LaMounOpsBot`). Copier le jeton dans le secret `TELEGRAM_BOT_TOKEN`.
2. Toujours dans BotFather : `/setprivacy` → *Disable* (le bot lit les commandes dans le groupe).
3. Déclarer le webhook (une fois, dans un navigateur ou avec curl) :
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ref>.supabase.co/functions/v1/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```
4. Créer le groupe « Kasbah La Moun » (idéalement un groupe avec *Sujets* activés : Transferts, Spa, Table, Conciergerie, Check-ins), y ajouter le bot. Taper `/id` dans le groupe, puis dans chaque sujet : le bot répond l'identifiant du groupe et du sujet. Les reporter dans l'appli équipe > Réglages (avec le nom du bot).
5. Chaque membre ouvre le lien de liaison affiché dans Réglages (`t.me/<bot>?start=<code>`) et appuie sur *Démarrer*. Il reçoit ensuite ses demandes en privé ; `/agenda` lui donne son programme.

### Google Sheet (check-ins)
1. Ouvrir la Google Sheet du riad (ou en créer une), Extensions > Apps Script, coller `guide/docs/google-sheet-apps-script.gs`, déployer en *Application Web* (exécuter en tant que moi, accès : tout le monde).
2. Copier l'URL `/exec` dans le secret `APPS_SCRIPT_URL` (ou dans Réglages > URL Apps Script). Chaque check-in ajoute une ligne, avec le jeton du séjour.

### Sites
- `guide/assets/common.js` : `API.base = "https://<ref>.supabase.co/functions/v1"`. Vide, le guide marche comme avant (WhatsApp seul).
- `admin/assets/config.js` : URL du projet et clé `anon`.
- Netlify : déployer `guide/` sur le projet existant (onglet Deploys, glisser le dossier) et `admin/` comme nouveau site (ex. `lamoun-equipe.netlify.app`). Ajouter cette URL dans Supabase > Authentication > Redirect URLs.
- Connexion à l'appli équipe : identifiant + mot de passe, créés par un gérant dans Réglages > Équipe (bouton « Mot de passe »).
- Migrations : `0001_schema.sql` puis `0002_access_dashboard.sql` (niveaux d'accès, tables Little Hotel, notifications push). Les deux se rejouent sans risque.
- Notifications push : secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` dans Supabase ; la clé publique est aussi dans `admin/assets/config.js`.

## 2. Au quotidien
- **Demandes** : chaque nouvelle demande arrive sur Telegram (privé + groupe) et dans Demandes. Accepter / Refuser depuis Telegram ou l'appli : tous les messages se mettent à jour, le client voit le statut dans « Mon séjour ». Le bouton *WhatsApp le client* ouvre la conversation avec un message de confirmation déjà écrit.
- **Agenda** : filtrer par personne ou ressource ; *Fermer un créneau* bloque le spa, le guide ou la table ; *Nouvelle demande* saisit une demande reçue par téléphone.
- **Rappels** : à chaque personne, en privé, N minutes avant son créneau ; le soir, programme de demain à chacun et récap (arrivées, départs, programme) dans le groupe.
- **Calendriers sur téléphone** : Réglages donne un lien iCal par personne et un lien maître (iPhone : Réglages > Calendrier > Comptes > Ajouter un abonnement ; Google Agenda : Autres agendas > À partir de l'URL).

## 2 bis. Accès, tableau de bord, appli installée
- **Niveaux d'accès** (Réglages > Équipe, colonne Accès) : *Gérant* voit tout, dont le Tableau de bord et la gestion de l'équipe ; *Réception* voit Aujourd'hui, Agenda, Demandes, Clients, sans les paiements ; *Métier* (chauffeur, spa, cuisine, guide, ménage) ne voit que « Mon planning » et ses créneaux. Ces règles sont dans la base (RLS, `0002_access_dashboard.sql`), pas seulement dans l'écran.
- **Attribuer** une demande à quelqu'un : dans l'agenda, toucher le créneau > « Attribuer à ». La personne la reçoit sur Telegram et en notification.
- **Aujourd'hui** : le « Morning briefing » du tableau KLM (mêmes couleurs) : arrivées, départs, départs demain, hammam, massages, dîners, transferts, clients présents, puis le planning des 14 jours.
- **Tableau de bord** (gérants) : chiffre d'affaires, occupation, prix moyen, RevPAR, canaux, pays, suites, encaissements, délai de réservation, soldes à encaisser. Source : exports CSV Little Hotel.
- **Mettre à jour les chiffres** : Little Hotel > exporter les CSV (Réservations, Paiements, Listing clients) > Tableau de bord > Importer > déposer les fichiers. Réimporter ne crée pas de doublons. Import initial en ligne de commande : `scripts/import_littlehotel.py`.
- **Installer l'appli** : proposée automatiquement après la connexion sur téléphone (bouton natif sur Android, mode d'emploi illustré sur iPhone). Ensuite « Activer les notifications » (sur iPhone, uniquement depuis l'appli installée, iOS 16.4+).

## 2 ter. Réservations Octorate (depuis novembre 2026)
- **E-mails** : chaque e-mail Octorate (nouvelle réservation, modification, annulation) est transmis par un petit script Google Apps Script installé sur la boîte Gmail qui les reçoit (`docs/octorate-gmail-apps-script.gs` ; l'appli donne le script prêt à coller avec son code secret : Réglages > Octorate). La fonction `octorate?action=mail` garde l'e-mail, le lit (`_shared/octorate.ts`), crée ou met à jour la réservation dans `lh_reservations` (colonne `source = octorate-mail`) et prévient l'équipe (notification + groupe Telegram).
- Les références Booking et Expedia prennent la forme Little Hotel (`BDC-…`, `EXP-…`) pour éviter les doublons ; les autres `OCT-…`. Les montants en euros sont gardés à part (colonne `currency`) et ne sont pas ajoutés au chiffre d'affaires en dirhams.
- Un e-mail mal compris reste « à vérifier » dans Réglages > Octorate, avec son texte complet et un bouton « Réanalyser ».
- **iCal** : un lien d'export par suite (Réglages > Octorate). Synchronisation toutes les heures (`pg_cron` job `lamoun-ical`) : complète la suite des réservations venues par e-mail, ajoute les séjours inconnus (`source = ical`), annule ceux qui disparaissent du calendrier. Les fermetures (« Not available », « Closed ») sont ignorées.
- Migration : `0003_octorate.sql`.

## 3. Développement local
`.claude/launch.json` lance `guide/` sur http://127.0.0.1:8787 et `admin/` sur http://127.0.0.1:8788 (serveur Python intégré). Sans `API.base`, le guide fonctionne en mode WhatsApp ; avec un projet Supabase de test, tout le circuit se teste en local.

## 4. Phase 2 (idées prêtes)
- WhatsApp Business (Cloud API) : confirmation automatique au client quand l'équipe accepte, rappels au client, bot entrant. Le point d'entrée est `applyDecision` dans `supabase/functions/_shared/notify.ts`.
- Catalogue (prix, soins) édité depuis l'appli équipe au lieu des fichiers `spa.js`, `transfer.js`, `marrakech.js`.
- Import iCal Booking.com / Airbnb par suite pour afficher l'occupation des chambres dans l'agenda.

## 5. Dépôts GitHub
- `superlunette75-jpg/PMS-` : tout le projet (ce dépôt).
- `superlunette75-jpg/Lamoun-ekip` : le dossier `admin/` seul, relié à Netlify (site lamoun-equip.netlify.app, répertoire de publication `/`, pas de build). Après un commit sur `main` ici, `scripts/push-admin.sh` y pousse la nouvelle version.
- `superlunette75-jpg/Lamoun-guide` : le dossier `guide/` seul, à relier au projet Netlify du guide (répertoire de publication `/`, pas de build). `scripts/push-guide.sh` y pousse la nouvelle version.

L'appli équipe s'installe comme une appli sur le téléphone : l'appli le propose elle-même après la connexion (voir 2 bis).
