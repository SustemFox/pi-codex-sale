import assert from "node:assert/strict";
import test from "node:test";
import { catalogListUrl, normalizeApiBaseUrl } from "../src/urls.ts";

test("normalizeApiBaseUrl adds exactly one /v1 suffix", () => {
	assert.equal(normalizeApiBaseUrl("https://codex.sale"), "https://codex.sale/v1");
	assert.equal(normalizeApiBaseUrl("https://codex.sale/v1/"), "https://codex.sale/v1");
	assert.equal(
		normalizeApiBaseUrl("https://proxy.example/prefix/"),
		"https://proxy.example/prefix/v1",
	);
});

test("normalizeApiBaseUrl discards query strings and fragments", () => {
	assert.equal(
		normalizeApiBaseUrl("https://codex.sale/v1/?old=1#fragment"),
		"https://codex.sale/v1",
	);
});

test("normalizeApiBaseUrl rejects empty, malformed and non-HTTP URLs", () => {
	assert.throws(() => normalizeApiBaseUrl("   "), /empty/);
	assert.throws(() => normalizeApiBaseUrl("not a URL"), /invalid/);
	assert.throws(() => normalizeApiBaseUrl("file:///tmp/api"), /HTTP or HTTPS/);
});

test("catalogListUrl includes pagination parameters", () => {
	assert.equal(
		catalogListUrl("https://codex.sale/v1", 200, 50),
		"https://codex.sale/v1/models?limit=50&offset=200",
	);
});
