import assert from "node:assert/strict";
import test from "node:test";
import { API_KEY_ENVS, resolveBaseUrlFromEnv } from "../src/config.ts";

test("resolveBaseUrlFromEnv uses the current default", () => {
	assert.equal(resolveBaseUrlFromEnv({}), "https://codex.sale/v1");
});

test("resolveBaseUrlFromEnv accepts both current Codex Sale variable names", () => {
	assert.equal(
		resolveBaseUrlFromEnv({ CODEX_SALE_BASE_URL: "https://proxy.example/api" }),
		"https://proxy.example/api/v1",
	);
	assert.equal(
		resolveBaseUrlFromEnv({ CODEXSALE_BASE_URL: "https://primary.example/v1" }),
		"https://primary.example/v1",
	);
});

test("CODEXSALE_BASE_URL takes priority", () => {
	assert.equal(
		resolveBaseUrlFromEnv({
			CODEXSALE_BASE_URL: "https://primary.example",
			CODEX_SALE_BASE_URL: "https://secondary.example",
		}),
		"https://primary.example/v1",
	);
});

test("API key variables are ordered from preferred to compatibility names", () => {
	assert.deepEqual(API_KEY_ENVS, [
		"CODEXSALE_API_KEY",
		"CODEX_SALE_API_KEY",
		"CODEX_LB_API_KEY",
	]);
});
