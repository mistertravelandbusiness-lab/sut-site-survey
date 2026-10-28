# Signature SUT Survey (APK)

La clé de signature est stockée dans les **secrets GitHub** (jamais dans le dépôt) :
- SUT_KEY_PEM_B64   clé privée ed25519 (PKCS#8, PEM encodé base64)
- SUT_CERT_PEM_B64  certificat X.509 auto-signé (base64)
- KEYSTORE_PASSWORD / KEY_ALIAS / KEY_PASSWORD

`.github/workflows/build-apk.yml` appelle `android/make_keystore.py` qui reconstruit
un keystore PKCS#12 (`/tmp/sut-release.p12`) avant le build Gradle.

⚠️ Garde la même clé pour toutes les versions : sans elle, Android refuse
d'installer une mise à jour par-dessus une version déjà installée.

Sauvegarde locale de la clé : `release-signing-key-backup/` (dans ce dépôt privé
uniquement si tu le passes en privé — sinon garde-la hors du dépôt).
