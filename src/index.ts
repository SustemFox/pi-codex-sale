import { createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { codexSaleResponsesApi } from "./responses.ts";
import {
	API_KEY_ENVS,
	PROVIDER_ID,
	PROVIDER_NAME,
	USER_AGENT,
	resolveBaseUrlFromEnv,
} from "./config.ts";

export default function codexSale(pi: ExtensionAPI): void {
	const baseUrl = resolveBaseUrlFromEnv();

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
