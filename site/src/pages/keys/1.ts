import type { APIRoute } from "astro";

// ECDSA P-256 public key for signed-data.org (v0.3.0+)
// Multicodec: p256-pub (0x1200), encoded as multibase base58btc
// Private key stored in AWS Secrets Manager: cds/signing-private-key-ecdsa-v1
const MULTIKEY_DOCUMENT = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/security/multikey/v1",
  ],
  id: "https://signed-data.org/keys/1",
  type: "Multikey",
  controller: "https://signed-data.org",
  publicKeyMultibase: "zDnaeR28kGoWmjbXUk53waM4rxQZdV3KG2QzKSGCEG9dgPw38",
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify(MULTIKEY_DOCUMENT, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
