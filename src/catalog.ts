import {
	API,
	CATALOG_MAX_PAGES,
	CATALOG_PAGE_SIZE,
	DEFAULT_CONTEXT_WINDOW,
	DEFAULT_MAX_TOKENS,
	MODEL_FETCH_TIMEOUT_MS,
	PROVIDER_ID,
	USER_AGENT,
} from "./config.ts";
import type {
	CatalogListResponse,
	CatalogModel,
	CatalogProvider,
	CatalogRow,
	ExplabsModel,
	ThinkingLevel,
	ThinkingLevelMap,
} from "./types.ts";
import { catalogListUrl, normalizeApiBaseUrl } from "./urls.ts";

export { catalogListUrl, normalizeApiBaseUrl } from "./urls.ts";

const PI_THINKING_LEVELS = [
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
] as const satisfies readonly ThinkingLevel[];

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function parseModel(value: unknown): CatalogModel | undefined {
	const record = asRecord(value);
	if (!record) {
		return undefined;
	}
	const slug = asString(record.slug);
	if (!slug) {
		return undefined;
	}
	return {
		slug,
		display_name: asString(record.display_name),
		status: asString(record.status),
		context_window: asNumber(record.context_window),
		max_output_tokens: asNumber(record.max_output_tokens),
		input_modalities: asStringArray(record.input_modalities),
		output_modalities: asStringArray(record.output_modalities),
		supported_params: asRecord(record.supported_params) as CatalogModel["supported_params"],
	};
}

function parseProvider(value: unknown): CatalogProvider | undefined {
	const record = asRecord(value);
	if (!record) {
		return undefined;
	}
	const capabilities = asRecord(record.capabilities);
	return {
		id: asString(record.id),
		provider: asString(record.provider),
		billing_source: asString(record.billing_source),
		input_micro_usd_per_million: asNumber(record.input_micro_usd_per_million) ?? null,
		cached_input_micro_usd_per_million: asNumber(record.cached_input_micro_usd_per_million) ?? null,
		output_micro_usd_per_million: asNumber(record.output_micro_usd_per_million) ?? null,
		capabilities: capabilities
			? {
					supports_developer_messages: asBoolean(capabilities.supports_developer_messages),
					supports_strict_tools: asBoolean(capabilities.supports_strict_tools),
					supports_reasoning: asBoolean(capabilities.supports_reasoning),
					supported_reasoning_efforts: asStringArray(capabilities.supported_reasoning_efforts),
				}
			: undefined,
	};
}

/**
 * Fallback metadata for models whose capabilities are no longer returned by the
 * `/v1/models` endpoint (upstream dropped the `metadata` field).
 */
interface KnownModelInfo {
	display_name?: string;
	context_window?: number;
	max_output_tokens?: number;
	input_modalities: string[];
	reasoning_levels?: string[];
}

const KNOWN_MODELS: Record<string, KnownModelInfo> = {
	"claude-haiku-4-5": { context_window: 200_000, input_modalities: ["text"] },
	"claude-opus-4-6": { context_window: 1_000_000, input_modalities: ["text"] },
	"claude-opus-4-7": { context_window: 1_000_000, input_modalities: ["text"] },
	"claude-opus-4-8": { context_window: 1_000_000, input_modalities: ["text"] },
	"claude-sonnet-4-6": { context_window: 1_000_000, input_modalities: ["text"] },
	"deepseek-v4-flash": { context_window: 128_000, input_modalities: ["text"] },
	"deepseek-v4-pro": { context_window: 128_000, input_modalities: ["text"] },
	"glm-5.2": { context_window: 128_000, input_modalities: ["text"] },
	"glm-5.3": { context_window: 128_000, input_modalities: ["text"] },
	"glm-5.3-flash": { context_window: 128_000, input_modalities: ["text"] },
	"gpt-5.4-mini": {
		context_window: 200_000,
		input_modalities: ["text"],
		reasoning_levels: ["low", "medium", "high", "xhigh"],
	},
	"gpt-5.5": {
		context_window: 1_000_000,
		input_modalities: ["text"],
		reasoning_levels: ["low", "medium", "high", "xhigh"],
	},
	"gpt-5.6-luna": {
		context_window: 1_000_000,
		input_modalities: ["text", "image"],
		reasoning_levels: ["low", "medium", "high", "xhigh", "max"],
	},
	"gpt-5.6-sol": {
		context_window: 1_000_000,
		input_modalities: ["text", "image"],
		reasoning_levels: ["low", "medium", "high", "xhigh", "max"],
	},
	"gpt-5.6-terra": {
		context_window: 1_000_000,
		input_modalities: ["text", "image"],
		reasoning_levels: ["low", "medium", "high", "xhigh", "max"],
	},
	"gpt-6-astra": {
		context_window: 1_050_000,
		input_modalities: ["text", "image"],
		reasoning_levels: ["low", "medium", "high", "xhigh", "max", "ultra"],
	},
};

function isImageOnlyModel(id: string): boolean {
	return /(^|[-_/])image([-_/]|$)/i.test(id) || /dall-e|stable-diffusion|(^|[-_/])flux([-_/]|$)/i.test(id);
}

/** Accepts both `[{effort:"high"}]` and `["high"]` shapes. */
function parseReasoningLevels(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.flatMap((entry) => {
		const effort = asString(entry) ?? asString(asRecord(entry)?.effort);
		return effort ? [effort] : [];
	});
}

export function parseCatalogPage(value: unknown): CatalogListResponse {
	const record = asRecord(value);
	if (record && Array.isArray(record.data)) {
		const models = record.data.flatMap((item) => {
			const row = asRecord(item);
			const id = asString(row?.id);
			if (!id || isImageOnlyModel(id)) return [];
			const metadata = asRecord(row?.metadata);
			const known = KNOWN_MODELS[id];

			const modalities = Array.isArray(metadata?.input_modalities)
				? asStringArray(metadata.input_modalities)
				: (known?.input_modalities ?? ["text"]);
			const levels = Array.isArray(metadata?.supported_reasoning_levels)
				? parseReasoningLevels(metadata.supported_reasoning_levels)
				: (known?.reasoning_levels ?? []);
			const reasoning = levels.length > 0;
			const supportsParallelToolCalls =
				typeof metadata?.supports_parallel_tool_calls === "boolean"
					? metadata.supports_parallel_tool_calls
					: true;

			return [{
				model: {
					slug: id,
					display_name: asString(metadata?.display_name) ?? known?.display_name ?? id,
					context_window: asNumber(metadata?.context_window) ?? known?.context_window,
					max_output_tokens: asNumber(metadata?.max_output_tokens) ?? known?.max_output_tokens,
					input_modalities: modalities,
					output_modalities: ["text"],
					supported_params: { tools: supportsParallelToolCalls, reasoning },
				},
				providers: [{
					provider: "codex.sale",
					capabilities: { supports_reasoning: reasoning, supported_reasoning_efforts: levels },
				}],
			} satisfies CatalogRow];
		});
		return { models, total: models.length };
	}
	if (!record || !Array.isArray(record.models)) {
		throw new Error("Codex Sale catalog response is invalid");
	}
	const models = record.models.flatMap((row) => {
		const item = asRecord(row);
		if (!item) {
			return [];
		}
		const model = parseModel(item.model);
		if (!model) {
			return [];
		}
		const providers = Array.isArray(item.providers)
			? item.providers.flatMap((provider) => {
					const parsed = parseProvider(provider);
					return parsed ? [parsed] : [];
				})
			: [];
		return [
			{
				model,
				providers,
				default_provider_ids: asStringArray(item.default_provider_ids),
			},
		];
	});
	return {
		models,
		total: asNumber(record.total) ?? models.length,
		limit: asNumber(record.limit),
		offset: asNumber(record.offset),
	};
}

export function isNativeOpenAIRoute(
	providers: CatalogProvider[],
	defaultProviderIds?: string[],
): boolean {
	const firstId = defaultProviderIds?.find((id) => id.length > 0);
	if (firstId) {
		const hop = providers.find((provider) => provider.id === firstId);
		return hop?.provider === "openai";
	}
	return providers[0]?.provider === "openai";
}

function microToUsdPerMillion(micro: number | null | undefined): number {
	if (micro == null) {
		return 0;
	}
	return micro / 1_000_000;
}

export function pickCost(providers: CatalogProvider[]): ExplabsModel["cost"] {
	const priced = providers.filter((provider) => provider.input_micro_usd_per_million != null);
	const hostManaged = priced.filter((provider) => provider.billing_source === "host_managed");
	const pool = (hostManaged.length > 0 ? hostManaged : priced).slice();
	pool.sort(
		(a, b) => (a.input_micro_usd_per_million ?? Infinity) - (b.input_micro_usd_per_million ?? Infinity),
	);
	const cheapest = pool[0];
	if (!cheapest) {
		return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
	}
	return {
		input: microToUsdPerMillion(cheapest.input_micro_usd_per_million),
		output: microToUsdPerMillion(cheapest.output_micro_usd_per_million),
		cacheRead: microToUsdPerMillion(cheapest.cached_input_micro_usd_per_million),
		cacheWrite: 0,
	};
}

export function isAgentModel(model: CatalogModel): boolean {
	if (model.status && model.status !== "active") {
		return false;
	}
	if (model.slug.endsWith("-batch")) {
		return false;
	}
	if (!model.output_modalities.includes("text")) {
		return false;
	}
	return model.supported_params?.tools === true;
}

export function thinkingLevelMap(
	model: CatalogModel,
	providers: CatalogProvider[],
): ThinkingLevelMap | undefined {
	if (model.supported_params?.reasoning !== true) {
		return undefined;
	}

	const efforts = new Set<string>();
	for (const provider of providers) {
		for (const effort of provider.capabilities?.supported_reasoning_efforts ?? []) {
			efforts.add(effort);
		}
	}
	if (efforts.size === 0) {
		return undefined;
	}

	const map: ThinkingLevelMap = {
		off: efforts.has("none") ? "none" : efforts.has("off") ? "off" : null,
	};
	for (const level of PI_THINKING_LEVELS) {
		map[level] = efforts.has(level) ? level : null;
	}
	return map;
}

export function toExplabsModel(
	model: CatalogModel,
	providers: CatalogProvider[],
	baseUrl: string,
	defaultProviderIds?: string[],
): ExplabsModel | undefined {
	if (!isAgentModel(model)) {
		return undefined;
	}

	const reasoning = model.supported_params?.reasoning === true;
	const supportsDeveloperRole = providers.some(
		(provider) => provider.capabilities?.supports_developer_messages === true,
	);
	const supportsStrictMode =
		model.supported_params?.structured_outputs === true ||
		providers.some((provider) => provider.capabilities?.supports_strict_tools === true);

	return {
		id: model.slug,
		name: model.display_name ?? model.slug,
		api: API,
		provider: PROVIDER_ID,
		baseUrl,
		headers: { "User-Agent": USER_AGENT },
		reasoning,
		thinkingLevelMap: thinkingLevelMap(model, providers),
		input: model.input_modalities.includes("image") ? ["text", "image"] : ["text"],
		cost: pickCost(providers),
		contextWindow: model.context_window ?? DEFAULT_CONTEXT_WINDOW,
		maxTokens: model.max_output_tokens ?? DEFAULT_MAX_TOKENS,
		compat: {
			supportsDeveloperRole,
			supportsStrictMode,
		},
		nativeOpenAIRoute: isNativeOpenAIRoute(providers, defaultProviderIds),
	};
}

function jsonHeaders(apiKey?: string): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"User-Agent": USER_AGENT,
	};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}
	return headers;
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
	const timeout = AbortSignal.timeout(timeoutMs);
	return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function loadModels(options: {
	baseUrl: string;
	apiKey?: string;
	signal?: AbortSignal;
	fetch?: typeof fetch;
	pageSize?: number;
}): Promise<ExplabsModel[]> {
	const baseUrl = normalizeApiBaseUrl(options.baseUrl);
	const fetchImpl = options.fetch ?? fetch;
	const pageSize = options.pageSize ?? CATALOG_PAGE_SIZE;
	const signal = withTimeout(options.signal, MODEL_FETCH_TIMEOUT_MS);
	const headers = jsonHeaders(options.apiKey);

	const mapped: ExplabsModel[] = [];
	const seen = new Set<string>();
	let offset = 0;
	let total = Number.POSITIVE_INFINITY;

	for (let page = 0; page < CATALOG_MAX_PAGES && offset < total; page++) {
		signal.throwIfAborted();
		const url = catalogListUrl(baseUrl, offset, pageSize);
		const response = await fetchImpl(url, { headers, signal });
		if (!response.ok) {
			throw new Error(`Codex Sale catalog failed: HTTP ${response.status}`);
		}
		const payload = parseCatalogPage(await response.json());
		total = payload.total;
		if (payload.models.length === 0) {
			break;
		}
		for (const row of payload.models) {
			const model = toExplabsModel(row.model, row.providers, baseUrl, row.default_provider_ids);
			if (!model || seen.has(model.id)) {
				continue;
			}
			seen.add(model.id);
			mapped.push(model);
		}
		offset += payload.models.length;
		if (payload.models.length < pageSize) {
			break;
		}
	}

	if (mapped.length === 0) {
		throw new Error("Codex Sale catalog returned no models");
	}
	return mapped;
}

export function apiKeyFromCredential(credential: unknown): string | undefined {
	const record = asRecord(credential);
	if (!record) {
		return undefined;
	}
	if (record.type === "oauth") {
		return asString(record.access);
	}
	return asString(record.key);
}
