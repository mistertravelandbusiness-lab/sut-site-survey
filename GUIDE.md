# SUT · Site Survey — guide

## 0. Deux applications séparées

| APK | Pour qui | Contenu |
|---|---|---|
| **SUT-Survey-v1.0.apk** | les techniciens (collègues) | rapports terrain, photos, export Excel — inscription libre |
| **SUT-Admin-v1.0.apk** | l'administrateur | tableau de bord, comptes, suppression d'utilisateur, tous les rapports |

L'APK Admin refuse un compte non-administrateur. Aucun site web : tout se fait dans les applications.

## 1. Accès

| | |
|---|---|
| **APK terrain (utilisateurs)** | `SUT-Survey-v1.0.apk` — https://github.com/mistertravelandbusiness-lab/sut-site-survey/releases/latest |
| **APK administrateur** | `SUT-Admin-v1.0.apk` — même page Releases |
| **Site web** | aucun (les deux applications sont des APK) |
| **Base de données** | Supabase → projet **SUT Survey** (`cyvmkvhnympziikfiqca`) |

### Compte administrateur (créé pour toi)

- nom d'utilisateur : **admin**
- mot de passe : **SUTadmin2026!**

⚠️ Change ce mot de passe dès la première connexion (ou demande-moi de le changer).

### Collègues — APK *SUT Survey*

Chaque collègue installe **SUT-Survey-v1.0.apk** → **Créer un compte** → choisit son nom d'utilisateur et son mot de passe.
L'inscription est **libre** (pas de validation par e-mail). Chaque compte ne voit **que ses propres rapports** :
aucun mélange entre collègues.

## 2. Les deux pages du rapport

### Page 1 — Fiche
- **A · Identification du site** : Locality ID, Locality Name, Site Type, Région, Commune, Agglomération, Date, RT possible
- **B · Coordonnées & contacts** : tél./e-mail acquisition, contact village, propriétaire du terrain

### Page 2 — Réseau & photos
- **GPS automatique** : un bouton remplit latitude / longitude / altitude (plus d'erreur de saisie)
- **C · Terrain & environnement** : hauteur rurale, espace requis/disponible, accès, largeur et distance route, sol, topographie, électricité, relief, saison des pluies, remarque, mode d'acquisition, livraison matériaux
- **D · Réseau & présence** : réseaux voix/data, qualité, débit, représentants sous-traitant et Huawei
- **10 emplacements photos**

### Les cases sont vides
Tous les champs sont **vides** à la création. Sous chaque champ, les valeurs apparaissent en
**pastilles de suggestion** : un clic remplit le champ, tu peux toujours corriger ou effacer.

## 3. Photos

- Chaque emplacement propose **📷 Appareil photo** et **🖼️ Galerie** (les deux autorisations sont demandées par l'APK).
- Les photos sont **compressées** automatiquement (max 1600 px) avant l'envoi : rapide même en 3G.
- Les images livrées avec l'application sont marquées **EXEMPLE** : ce sont des **modèles de cadrage**.
  Dès que tu prends ta propre photo, elle remplace l'exemple.
- **Remplace les exemples** : dépose tes photos dans `web/img/examples/` en gardant les mêmes noms
  (`01-panorama.jpg`, `02-antenne.jpg`, `03-acces.jpg`, `04-local-technique.jpg`, `05-sol.jpg`, `06-village.jpg`).
  Le build APK et le site se mettent à jour automatiquement.

### Éviter les erreurs de rapport / décalage / faux cadrage
L'application t'aide :
- **GPS automatique** → latitude / longitude / altitude justes (fini les décalages de site).
- **Un emplacement = une photo** → impossible de mettre la même image dans « Panorama » et « Voie d'accès ».
- **Compteur de photos obligatoires** (6/6) affiché en direct + alerte avant d'enregistrer si une photo manque.
- **Contrôles de saisie** : Locality ID et Locality Name obligatoires, e-mail et coordonnées vérifiés
  (latitude entre −90 et 90, longitude entre −180 et 180).
- Guide de cadrage intégré (menu **Aide & guide photo**).

## 4. Export Excel

- Un rapport → **`LOCALITY-ID.xlsx`** (ex. `ORA-BEJ-0142.xlsx`)
- Plusieurs rapports sélectionnés → `ID1-ID2_export.xlsx`
- Tous les rapports → `EXPORT_SUT_AAAA-MM-JJ.xlsx`

Le fichier contient 2 onglets :
1. **SUT Survey** — les 36 colonnes du rapport (mêmes intitulés que la fiche)
2. **Photos** — lien direct de chaque photo (contrôle qualité)

Le fichier arrive dans le dossier **Téléchargements** du téléphone.

## 5. Hors ligne (terrain sans réseau)

Le rapport est d'abord gardé **sur le téléphone** (brouillon + file d'attente), puis envoyé dès le retour du réseau.
Onglet **Synchronisation** pour voir ce qui reste à envoyer. Rien n'est perdu si la connexion coupe.

## 6. Administration — APK *SUT Admin*

Installer **SUT-Admin-v1.0.apk**, se connecter avec le compte `admin` (un compte non-administrateur est refusé).
Menu **Utilisateurs** :
- liste des comptes, rôle, nombre de rapports, date de création
- **supprimer un utilisateur** (bouton rouge)
- **Tous les rapports** : tous les rapports de tous les collègues, avec export

## 7. Installation de l'APK

1. Télécharger `SUT-SiteSurvey-v1.0.apk` depuis la page *Releases*.
2. Sur le téléphone : **Paramètres → Sécurité → Installer des applications inconnues** → autoriser le navigateur / gestionnaire de fichiers.
3. Ouvrir le fichier APK → **Installer**.
4. Au premier lancement, accepter **Appareil photo**, **Photos/Médias** et **Localisation**.

Android 7 (API 24) minimum. Aucun Play Store nécessaire.

## 8. Maintenance technique

| Élément | Emplacement |
|---|---|
| Code de l'app web | `web/` |
| Champs du rapport / suggestions | `web/js/fields.js` |
| Thème, boutons, animations | `web/css/app.css` |
| Photos d'exemple | `web/img/examples/` |
| App Android (WebView) | `android/site-survey/` |
| Déploiement web | `.github/workflows/pages.yml` |
| Build APK | `.github/workflows/build-apk.yml` |
| Base de données | Supabase (tables `users`, `rapports`, bucket `rapports`) |

La clé `anon` publique est dans `web/supabase-config.js` (normal : elle est protégée par les règles RLS).
La clé `service_role` n'apparaît **jamais** dans le code du dépôt.

### Signature APK
Les mises à jour doivent être signées avec **la même clé** que la v1.0 (sinon Android refuse de mettre à jour).
La clé est conservée dans les secrets GitHub (`SUT_KEY_PEM_B64`, `SUT_CERT_PEM_B64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
