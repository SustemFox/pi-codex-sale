import assert from "node:assert/strict";
import test from "node:test";
import { isNativeOpenAIModel, stripNonOpenAIReasoningFields } from "../src/responses.ts";

test("stripNonOpenAIReasoningFields removes unsupported reasoning fields", () => {
	assert.deepEqual(
		stripNonOpenAIReasoningFields({
			reasoning: { effort: "high", summary: "auto" },
			include: ["reasoning.encrypted_content", "message.output_text.logprobs"],
		}),
		{
			reasoning: { effort: "high" },
			include: ["message.output_text.logprobs"],
		},
	);
});

test("stripNonOpenAIReasoningFields removes empty containers", () => {
	assert.deepEqual(
		stripNonOpenAIReasoningFields({
			reasoning: { summary: "auto" },
			include: ["reasoning.encrypted_content"],
		}),
		{},
	);
});

test("stripNonOpenAIReasoningFields does not mutate the source payload", () => {
	const source = {
		reasoning: { effort: "medium", summary: "auto" },
		include: ["reasoning.encrypted_content"],
	};
	stripNonOpenAIReasoningFields(source);
	assert.deepEqual(source, {
		reasoning: { effort: "medium", summary: "auto" },
		include: ["reasoning.encrypted_content"],
	});
});

test("isNativeOpenAIModel relies on the catalog route marker", () => {
	assert.equal(isNativeOpenAIModel({ id: "gpt", nativeOpenAIRoute: true }), true);
	assert.equal(isNativeOpenAIModel({ id: "gpt", nativeOpenAIRoute: false }), false);
	assert.equal(isNativeOpenAIModel({ id: "gpt" }), false);
});
