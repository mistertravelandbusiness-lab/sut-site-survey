#!/usr/bin/env python3
"""Construit un keystore PKCS#12 pour signer l'APK SUT Survey.

Pourquoi un keystore maison ? Les runners GitHub n'ont pas `keytool` sur le JDK
par défaut, et la signature doit rester STABLE d'une version à l'autre
(sinon Android refuse d'installer une mise à jour par-dessus l'ancienne).

Entrées (secrets GitHub) :
  SUT_KEY_PEM_B64   clé privée ed25519 (PKCS#8, PEM, base64)
  SUT_CERT_PEM_B64  certificat X.509 auto-signé correspondant (base64)
Sortie :
  /tmp/sut-release.p12  (mot de passe : variable KEYSTORE_PASSWORD)
"""
import base64, os, sys

def main():
    key_b64 = os.environ.get("SUT_KEY_PEM_B64", "")
    cert_b64 = os.environ.get("SUT_CERT_PEM_B64", "")
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/sut-release.p12"
    pwd = os.environ.get("KEYSTORE_PASSWORD", "")
    alias = os.environ.get("KEY_ALIAS", "sutsurvey")
    if not key_b64 or not cert_b64:
        print("secrets absents : signature debug utilisee")
        return 2
    try:
        from cryptography.hazmat.primitives.serialization import (
            load_pem_private_key, BestAvailableEncryption)
        from cryptography.hazmat.primitives.serialization.pkcs12 import (
            serialize_key_and_certificates)
        from cryptography.x509 import load_pem_x509_certificate
    except Exception as e:
        print("cryptography manquant:", e)
        return 3
    key = load_pem_private_key(base64.b64decode(key_b64), password=None)
    cert = load_pem_x509_certificate(base64.b64decode(cert_b64))
    data = serialize_key_and_certificates(
        name=alias.encode(), key=key, cert=cert, cas=None,
        encryption_algorithm=BestAvailableEncryption(pwd.encode()))
    with open(out, "wb") as f:
        f.write(data)
    print("keystore genere:", out, len(data), "octets, alias", alias)
    return 0

if __name__ == "__main__":
    sys.exit(main())
