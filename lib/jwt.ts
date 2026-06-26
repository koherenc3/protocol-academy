/**
 * Tiny, dependency-free JWT decoder for the JwtViewer. Decodes (does NOT
 * verify) the header and payload segments client-side so learners can inspect
 * claims. Signature verification is intentionally out of scope — the point is
 * to teach structure, not to validate tokens.
 */

export interface DecodedJwt {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  raw: { header: string; payload: string; signature: string };
  error?: string;
}

function base64UrlDecode(segment: string): string {
  // base64url -> base64
  let b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  if (typeof atob === "function") {
    // Decode and handle UTF-8.
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // Node fallback (used by tests / SSR).
  return Buffer.from(b64, "base64").toString("utf-8");
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.split(".");
  const [h = "", p = "", s = ""] = parts;
  const result: DecodedJwt = {
    header: null,
    payload: null,
    signature: s,
    raw: { header: h, payload: p, signature: s },
  };

  if (parts.length !== 3) {
    result.error = `Expected 3 dot-separated segments, found ${parts.length}.`;
    return result;
  }

  try {
    result.header = JSON.parse(base64UrlDecode(h));
  } catch {
    result.error = "Header is not valid base64url-encoded JSON.";
  }
  try {
    result.payload = JSON.parse(base64UrlDecode(p));
  } catch {
    result.error = "Payload is not valid base64url-encoded JSON.";
  }
  return result;
}

/** Human-readable rendering of common time claims (exp, iat, nbf, auth_time). */
export function describeClaim(key: string, value: unknown): string | null {
  const timeClaims = new Set(["exp", "iat", "nbf", "auth_time"]);
  if (timeClaims.has(key) && typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }
  return null;
}
