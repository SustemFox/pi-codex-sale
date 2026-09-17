export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export type ThinkingLevelMap = Partial<Record<ThinkingLevel, string | null>>;

export interface CatalogModel {
	slug: string;
	display_name?: string;
	status?: string;
	context_window?: number;
	max_output_tokens?: number;
	input_modalities: string[];
	output_modalities: string[];
	supported_params?: {
		tools?: boolean;
		reasoning?: boolean;
		structured_outputs?: boolean;
		[key: string]: unknown;
	};
}

export interface CatalogProvider {
	id?: string;
	provider?: string;
	billing_source?: string;
	input_micro_usd_per_million?: number | null;
	cached_input_micro_usd_per_million?: number | null;
	output_micro_usd_per_million?: number | null;
	capabilities?: {
		supports_developer_messages?: boolean;
		supports_strict_tools?: boolean;
		supports_reasoning?: boolean;
		supported_reasoning_efforts?: string[];
	};
}

export interface CatalogRow {
	model: CatalogModel;
	providers: CatalogProvider[];
	default_provider_ids?: string[];
}

export interface CatalogListResponse {
	models: CatalogRow[];
	total: number;
	limit?: number;
	offset?: number;
}

export interface CodexSaleModel {
	id: string;
	name: string;
	api: "openai-responses";
	provider: "codexsale";
	baseUrl: string;
	headers?: Record<string, string>;
	reasoning: boolean;
	thinkingLevelMap?: ThinkingLevelMap;
	input: Array<"text" | "image">;
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
	};
	contextWindow: number;
	maxTokens: number;
	compat?: {
		supportsDeveloperRole?: boolean;
		supportsStrictMode?: boolean;
	};
	/** True when the default waterfall's first hop is a native OpenAI deployment. */
	nativeOpenAIRoute: boolean;
}
