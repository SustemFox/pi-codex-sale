import assert from "node:assert/strict";
import test from "node:test";
import { loadModels, parseCatalogPage } from "../src/catalog.ts";

test("parseCatalogPage maps the live data[] shape and filters image-only models", () => {
	const page = parseCatalogPage({
		data: [
			{ id: "gpt-image-2", type: "model", display_name: "Image" },
			{ id: "gpt-5.5", type: "model", display_name: "gpt-5.5" },
			{ id: "friendly", display_name: "Friendly Model" },
			{ id: "retired", status: "retired" },
		],
	});

	assert.equal(page.itemsRead, 4);
	assert.deepEqual(page.models.map((row) => row.model.slug), ["gpt-5.5", "friendly", "retired"]);
	assert.equal(page.models[0]?.model.display_name, "GPT 5.5");
	assert.equal(page.models[1]?.model.display_name, "Friendly Model");
	assert.equal(page.models[2]?.model.status, "retired");
});

test("parseCatalogPage accepts object and string reasoning levels in rich catalogs", () => {
	const page = parseCatalogPage({
		models: [{
			model: {
				slug: "reasoner",
				input_modalities: ["text"],
				output_modalities: ["text"],
				supported_params: { tools: true, reasoning: true },
			},
			providers: [{
				provider: "proxy",
				capabilities: {
					supports_reasoning: true,
					supported_reasoning_efforts: ["low", { effort: "high" }],
				},
			}],
		}],
	});

	assert.deepEqual(
		page.models[0]?.providers[0]?.capabilities?.supported_reasoning_efforts,
		["low", "high"],
	);
});

test("loadModels applies agent-model filters to the live data[] shape", async () => {
	const fakeFetch: typeof fetch = async () => ({
		ok: true,
		json: async () => ({
			data: [
				{ id: "active" },
				{ id: "retired", status: "retired" },
				{ id: "queued-batch" },
				{ id: "no-tools", metadata: { supports_parallel_tool_calls: false } },
				{ id: "gpt-image-2" },
			],
		}),
	}) as Response;

	const models = await loadModels({ baseUrl: "https://example.com/v1", fetch: fakeFetch });
	assert.deepEqual(models.map((model) => model.id), ["active"]);
});

test("loadModels paginates the rich models[] shape", async () => {
	const urls: string[] = [];
	const fakeFetch: typeof fetch = async (input) => {
		const url = String(input);
		urls.push(url);
		const offset = Number(new URL(url).searchParams.get("offset"));
		const ids = offset === 0 ? ["first", "second"] : ["third"];
		return {
			ok: true,
			json: async () => ({
				models: ids.map((id) => ({
					model: {
						slug: id,
						input_modalities: ["text"],
						output_modalities: ["text"],
						supported_params: { tools: true },
					},
					providers: [],
				})),
				total: 3,
			}),
		} as Response;
	};

	const models = await loadModels({
		baseUrl: "https://example.com/v1",
		fetch: fakeFetch,
		pageSize: 2,
	});

	assert.deepEqual(models.map((model) => model.id), ["first", "second", "third"]);
	assert.deepEqual(urls, [
		"https://example.com/v1/models?limit=2&offset=0",
		"https://example.com/v1/models?limit=2&offset=2",
	]);
});

test("loadModels advances by raw rows when data[] filtering removes models", async () => {
	const offsets: number[] = [];
	const fakeFetch: typeof fetch = async (input) => {
		const offset = Number(new URL(String(input)).searchParams.get("offset"));
		offsets.push(offset);
		return {
			ok: true,
			json: async () => ({
				data:
					offset === 0
						? [{ id: "gpt-image-2" }, { id: "first-agent" }]
						: [{ id: "second-agent" }],
				total: 3,
			}),
		} as Response;
	};

	const models = await loadModels({
		baseUrl: "https://example.com/v1",
		fetch: fakeFetch,
		pageSize: 2,
	});

	assert.deepEqual(offsets, [0, 2]);
	assert.deepEqual(models.map((model) => model.id), ["first-agent", "second-agent"]);
});

test("loadModels stops when an endpoint repeats a page", async () => {
	let calls = 0;
	const fakeFetch: typeof fetch = async () => {
		calls += 1;
		return {
			ok: true,
			json: async () => ({
				models: ["first", "second"].map((id) => ({
					model: {
						slug: id,
						input_modalities: ["text"],
						output_modalities: ["text"],
						supported_params: { tools: true },
					},
					providers: [],
				})),
				total: 100,
			}),
		} as Response;
	};

	const models = await loadModels({
		baseUrl: "https://example.com/v1",
		fetch: fakeFetch,
		pageSize: 2,
	});

	assert.equal(calls, 2);
	assert.deepEqual(models.map((model) => model.id), ["first", "second"]);
});
