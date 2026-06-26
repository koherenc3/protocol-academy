/**
 * Minimal unit tests, run with the same tsx approach as the other scripts so we
 * avoid pulling in a full test framework. Add cases here as pure logic grows.
 *
 * Run with: npm test
 */
import assert from "node:assert/strict";
import { decodeJwt, describeClaim } from "../lib/jwt";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// A genuinely base64url-decodable token (matches the OIDC seed flow).
const SAMPLE =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS0yMDI0LTAxIn0.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiIyNDgyODk3NjEwMDEiLCJhdWQiOiJzNkJoZFJrcXQzIiwiZXhwIjoxNzM1NjkzMjAwLCJpYXQiOjE3MzU2ODk2MDAsImF1dGhfdGltZSI6MTczNTY4OTU5MCwibm9uY2UiOiJuLTBTNl9XekEyTWoiLCJuYW1lIjoiSmFuZSBEb2UiLCJlbWFpbCI6ImphbmVAZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0.rN1tQ5Hk0Yk7c9mJ2pXqWb3vZ4F8dL6sT0aG1hC2iU";

console.log("decodeJwt:");

test("decodes header and payload of a valid token", () => {
  const d = decodeJwt(SAMPLE);
  assert.equal(d.error, undefined);
  assert.equal(d.header?.alg, "RS256");
  assert.equal(d.payload?.iss, "https://auth.example.com");
  assert.equal(d.payload?.sub, "248289761001");
  assert.equal(d.payload?.email_verified, true);
});

test("splits the three raw segments", () => {
  const d = decodeJwt(SAMPLE);
  assert.equal(d.raw.signature, "rN1tQ5Hk0Yk7c9mJ2pXqWb3vZ4F8dL6sT0aG1hC2iU");
});

test("reports an error for a malformed token", () => {
  const d = decodeJwt("not-a-jwt");
  assert.ok(d.error);
});

console.log("describeClaim:");

test("renders time claims as ISO strings", () => {
  assert.equal(describeClaim("exp", 1735693200), "2025-01-01T01:00:00.000Z");
  assert.equal(describeClaim("name", "Jane"), null);
});

console.log(`\n✓ ${passed} test(s) passed.`);
