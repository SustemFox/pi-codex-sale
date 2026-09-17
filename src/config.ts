import { createRequire } from "node:module";

const packageJson = parsePackageJson(createRequire(import.meta.url)("../package.json"));

export const PROVIDER_ID = "codexsale";
export const PROVIDER_NAME = "Codex Sale";
export const DEFAULT_API_BASE_URL = "https://codex.sale/v1";
/**
 * API key environment variables, in priority order. The first two match the
 * names used by the install scripts on https://codex.sale/docs; `CODEX_LB_API_KEY`
 * is the legacy name those scripts still accept.
 */
export const API_KEY_ENVS = [
	"CODEXSALE_API_KEY",
	"CODEX_SALE_API_KEY",
	"CODEX_LB_API_KEY",
] as const;

/** Base URL environment variables, in priority order. */
export const BASE_URL_ENVS = ["CODEXSALE_BASE_URL", "CODEX_SALE_BASE_URL"] as const;
export const API = "openai-responses" as const;
export const USER_AGENT = `${packageJson.name.split("/").at(-1) ?? packageJson.name}/${packageJson.version}`;

export const CATALOG_PAGE_SIZE = 200;
export const CATALOG_MAX_PAGES = 50;
export const MODEL_FETCH_TIMEOUT_MS = 30_000;

export const DEFAULT_CONTEXT_WINDOW = 128_000;
export const DEFAULT_MAX_TOKENS = 16_384;

function parsePackageJson(payload: unknown): { name: string; version: string } {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		throw new Error("package.json must contain a JSON object");
	}
	const record = payload as Record<string, unknown>;
	const name = record.name;
	const version = record.version;
	if (typeof name !== "string" || !name.trim()) {
		throw new Error("package.json must contain a name");
	}
	if (typeof version !== "string" || !version.trim()) {
		throw new Error("package.json must contain a version");
	}
	return { name, version };
}
