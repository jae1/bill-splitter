const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const base64Url = (input: ArrayBuffer | string) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const pemToArrayBuffer = (pem: string) => {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
};

async function getAccessToken(serviceAccountJson: string) {
  const account = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string };
  if (!account.client_email || !account.private_key) throw new Error("Invalid Google service account JSON.");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/cloud-vision",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedJwt));
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const token = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !token.access_token) {
    throw new Error(token.error_description || "Google auth failed.");
  }
  return token.access_token;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Record<string, string | undefined> }) => {
  try {
    if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) return json({ error: "Google Vision is not configured." }, 503);
    const body = await request.json() as { imageBase64?: string };
    if (!body.imageBase64) return json({ error: "Missing imageBase64." }, 400);

    const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const visionResponse = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requests: [{
          image: { content: body.imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["en"] },
        }],
      }),
    });
    const result = await visionResponse.json() as {
      responses?: Array<{ fullTextAnnotation?: { text?: string }; textAnnotations?: Array<{ description?: string }>; error?: { message?: string } }>;
      error?: { message?: string };
    };
    const first = result.responses?.[0];
    if (!visionResponse.ok || result.error || first?.error) {
      return json({ error: result.error?.message || first?.error?.message || "Google Vision failed." }, 502);
    }
    return json({ text: first?.fullTextAnnotation?.text || first?.textAnnotations?.[0]?.description || "" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "OCR failed." }, 500);
  }
};

export const onRequest = async () => json({ error: "Method not allowed." }, 405);
