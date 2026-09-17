import { openAIResponsesApi } from "@earendil-works/pi-ai/compat";
import type { Api, Model, ProviderStreams, StreamOptions } from "@earendil-works/pi-ai";

const ENCRYPTED_REASONING = "reasoning.encrypted_content";

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function isNativeOpenAIModel(model: Pick<Model<Api>, "id"> & { nativeOpenAIRoute?: boolean }): boolean {
	return model.nativeOpenAIRoute === true;
}

export function stripNonOpenAIReasoningFields(payload: unknown): unknown {
	const record = asRecord(payload);
	if (!record) {
		return payload;
	}

	const next = { ...record };
	const reasoning = asRecord(next.reasoning);
	if (reasoning && "summary" in reasoning) {
		const { summary: _summary, ...rest } = reasoning;
		if (Object.keys(rest).length === 0) {
			delete next.reasoning;
		} else {
			next.reasoning = rest;
		}
	}

	if (Array.isArray(next.include)) {
		const include = next.include.filter((item) => item !== ENCRYPTED_REASONING);
		if (include.length === 0) {
			delete next.include;
		} else {
			next.include = include;
		}
	}

	return next;
}

function withPayloadRewrite<TOptions extends StreamOptions>(
	options: TOptions | undefined,
	model: Model<Api>,
): TOptions | undefined {
	if (isNativeOpenAIModel(model)) {
		return options;
	}

	const previous = options?.onPayload;
	return {
		...options,
		onPayload: async (payload: unknown, nextModel: Model<Api>) => {
			const rewritten = previous ? ((await previous(payload, nextModel)) ?? payload) : payload;
			return stripNonOpenAIReasoningFields(rewritten);
		},
	} as TOptions;
}

export function codexSaleResponsesApi(): ProviderStreams {
	const api = openAIResponsesApi();
	return {
		stream(model, context, options) {
			return api.stream(model, context, withPayloadRewrite(options, model));
		},
		streamSimple(model, context, options) {
			return api.streamSimple(model, context, withPayloadRewrite(options, model));
		},
		fetchDeferred: api.fetchDeferred
			? (model, handle, options) => api.fetchDeferred!(model, handle, withPayloadRewrite(options, model))
			: undefined,
		cancelDeferred: api.cancelDeferred
			? (model, handle, options) => api.cancelDeferred!(model, handle, options)
			: undefined,
	};
}
