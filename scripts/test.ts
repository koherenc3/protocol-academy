/**
 * Minimal unit tests, run with the same tsx approach as the other scripts so we
 * avoid pulling in a full test framework. Add cases here as pure logic grows.
 *
 * Run with: npm test
 */
import assert from "node:assert/strict";
import { decodeJwt, describeClaim } from "../lib/jwt";
import { formatXml } from "../lib/xml";

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

console.log("formatXml:");

test("indents by nesting depth and classifies tokens", () => {
  const lines = formatXml('<a><b x="1">hi</b></a>');
  assert.equal(lines.length, 5);
  assert.deepEqual(
    lines.map((l) => [l.depth, l.kind]),
    [
      [0, "open"],
      [1, "open"],
      [2, "text"],
      [1, "close"],
      [0, "close"],
    ],
  );
  assert.equal(lines[2].raw, "hi");
});

test("handles self-closing tags and declarations", () => {
  const lines = formatXml('<?xml version="1.0"?><root><img/></root>');
  assert.equal(lines[0].kind, "decl");
  assert.equal(lines.find((l) => l.raw.includes("img"))?.kind, "self");
});

console.log(`\n✓ ${passed} test(s) passed.`);
