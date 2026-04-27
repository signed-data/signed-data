import type { APIRoute } from "astro";

const ISSUER_DOCUMENT = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://schema.org/",
  ],
  "@type": "Organization",
  "@id": "https://signed-data.org",
  name: "SignedData.Org",
  legalName: "wdotnet",
  taxID: "24.921.472/0001-45",
  country: "BR",
  url: "https://signed-data.org",
  email: "marco@signed-data.org",
  verificationMethod: "https://signed-data.org/keys/1",
  sameAs: [
    "https://github.com/signed-data",
    "https://pypi.org/org/signed-data",
  ],
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify(ISSUER_DOCUMENT, null, 2), {
    headers: {
      "Content-Type": "application/ld+json",
      "Access-Control-Allow-Origin": "*",
    },
  });
