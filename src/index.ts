import { createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { codexSaleResponsesApi } from "./responses.ts";
import {
	API_KEY_ENVS,
	BASE_URL_ENVS,
	DEFAULT_API_BASE_URL,
	PROVIDER_ID,
	PROVIDER_NAME,
	USER_AGENT,
} from "./config.ts";
import { normalizeApiBaseUrl } from "./urls.ts";

function resolveBaseUrl(): string {
	for (const name of BASE_URL_ENVS) {
		const fromEnv = process.env[name];
		if (fromEnv && fromEnv.length > 0) {
			return normalizeApiBaseUrl(fromEnv);
		}
	}
	return normalizeApiBaseUrl(DEFAULT_API_BASE_URL);
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
				apiKey: envApiKeyAuth(`${PROVIDER_NAME} API key`, API_KEY_ENVS),
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

	// NOTE: No credits/balance status is registered. Codex Sale exposes no
	// credits endpoint, so the account balance is only visible in the web UI.
}
