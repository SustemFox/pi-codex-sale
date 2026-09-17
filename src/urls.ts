export function normalizeApiBaseUrl(raw: string): string {
	const trimmed = raw.trim().replace(/\/+$/, "");
	if (!trimmed) {
		throw new Error("CODEXSALE_BASE_URL is empty");
	}
	return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function catalogListUrl(apiBaseUrl: string, _offset: number, _limit: number): string {
	const api = new URL(normalizeApiBaseUrl(apiBaseUrl));
	api.pathname = `${api.pathname.replace(/\/+$/, "")}/models`;
	api.search = "";
	return api.toString();
}
