import { createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { codexSaleResponsesApi } from "./responses.ts";
import {
	API_KEY_ENV,
	BASE_URL_ENV,
	DEFAULT_API_BASE_URL,
	PROVIDER_ID,
	PROVIDER_NAME,
	USER_AGENT,
} from "./config.ts";
import { normalizeApiBaseUrl } from "./urls.ts";

function resolveBaseUrl(): string {
	const fromEnv = process.env[BASE_URL_ENV];
	return normalizeApiBaseUrl(fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_API_BASE_URL);
}

export default function codexSale(pi: ExtensionAPI): void {
	const baseUrl = resolveBaseUrl();

	pi.registerProvider(
		createProvider({
			id: PROVIDER_ID,
			name: PROVIDER_NAME,
			baseUrl,
			headers: { "User-Agent": USER_AGENT },
			auth: {
				apiKey: envApiKeyAuth(`${PROVIDER_NAME} API key`, [API_KEY_ENV]),
			},
			models: [],
			fetchModels: async ({ credential, signal }) => {
				const { apiKeyFromCredential, loadModels } = await import("./catalog.ts");
				return loadModels({
					baseUrl,
					apiKey: apiKeyFromCredential(credential),
					signal,
				});
			},
			api: codexSaleResponsesApi(),
		}),
	);

	// NOTE: No credits/balance status is registered. codex.sale exposes no
	// credits endpoint (the upstream Experiential Labs `/api/v1/credits` route
	// returns 404 here), so the account balance is only visible in the web UI.
}
