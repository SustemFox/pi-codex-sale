export function normalizeApiBaseUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) {
		throw new Error("Codex Sale base URL is empty");
	}

	let api: URL;
	try {
		api = new URL(trimmed);
	} catch {
		throw new Error(`Codex Sale base URL is invalid: ${trimmed}`);
	}
	if (api.protocol !== "http:" && api.protocol !== "https:") {
		throw new Error(`Codex Sale base URL must use HTTP or HTTPS: ${trimmed}`);
	}

	api.search = "";
	api.hash = "";
	const pathname = api.pathname.replace(/\/+$/, "");
	api.pathname = pathname.endsWith("/v1") ? pathname : `${pathname}/v1`;
	return api.toString();
}

export function catalogListUrl(apiBaseUrl: string, offset: number, limit: number): string {
	const api = new URL(normalizeApiBaseUrl(apiBaseUrl));
	api.pathname = `${api.pathname.replace(/\/+$/, "")}/models`;
	api.searchParams.set("limit", String(limit));
	api.searchParams.set("offset", String(offset));
	return api.toString();
}
