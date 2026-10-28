# SUT · Site Survey

Application de rapports terrain (2 pages) — photos géolocalisées, export Excel, APK Android.


- **APK** : onglet *Releases* → `SUT-SiteSurvey-v1.0.apk`
- **Base** : Supabase (projet *SUT Survey*) — tables `users`, `rapports`, bucket `rapports`

## Fonctions

| Écran | Contenu |
|---|---|
| Connexion | nom d'utilisateur + mot de passe, inscription libre (1 compte par collègue) |
| Page 1 | A · Identification du site — B · Coordonnées & contacts |
| Page 2 | GPS auto — C · Terrain & environnement — D · Réseau — 10 emplacements photos |
| Export | Excel `.xlsx` nommé d'après le **Locality ID** |
| Admin | liste des utilisateurs, suppression de compte, tous les rapports |

Les champs sont **vides** : les valeurs proposées dessous sont des **suggestions** (un clic pour remplir).

## Photos

Chaque emplacement propose **📷 Appareil photo** et **🖼️ Galerie** (permission Android déclarée).
Les images d'exemple (`web/img/examples/`) servent de **modèle de cadrage** — remplace-les par les tiennes.

## Build

- Web : GitHub Actions `pages.yml` (à chaque push sur `main`)
- APK : GitHub Actions `build-apk.yml` → `android/prepare_assets.sh` copie `web/` dans les assets puis Gradle assemble
