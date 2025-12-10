# services/auth/apps/accounts/jwks.py
import json
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from jwcrypto import jwk

def load_jwk_from_pem(pub_pem_path):
    with open(pub_pem_path, "rb") as f:
        keydata = f.read()
    jwk_obj = jwk.JWK.from_pem(keydata)
    # add kid (match with kong.jwt_secrets.key)
    jwk_json = json.loads(jwk_obj.export_public())
    jwk_json["kid"] = "prod-client-kid"
    jwk_json["alg"] = "RS256"
    jwk_json["use"] = "sig"
    return jwk_json
