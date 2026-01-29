import { describe, expect, test } from "vitest";
import { splitKeywords } from "../splitKeywords";

describe("splitKeywords", () => {
	test("splits simple comma-separated keywords", () => {
		const input = "syntax, semantics, phonology";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "semantics", "phonology"]);
	});

	test("handles empty string", () => {
		const result = splitKeywords("");
		expect(result).toEqual([""]);
	});

	test("handles single keyword", () => {
		const result = splitKeywords("syntax");
		expect(result).toEqual(["syntax"]);
	});

	test("trims whitespace from keywords", () => {
		const input = "  syntax  ,  semantics  ,  phonology  ";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "semantics", "phonology"]);
	});

	test("preserves commas inside brackets", () => {
		const input = "syntax, (foo, bar), semantics";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "(foo, bar)", "semantics"]);
	});

	test("preserves commas inside square brackets", () => {
		const input = "syntax, [a, b, c], phonology";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "[a, b, c]", "phonology"]);
	});

	test("preserves commas inside curly braces", () => {
		const input = "syntax, {x, y}, morphology";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "{x, y}", "morphology"]);
	});

	test("splits on middle dot separator", () => {
		const input = "syntax ·semantics";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "semantics"]);
	});

	test("splits on hyphen separator", () => {
		const input = "syntax-semantics";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "semantics"]);
	});

	test("splits on en-dash separator", () => {
		const input = "syntax–semantics";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "semantics"]);
	});

	test("splits on slash separator", () => {
		const input = "syntax/ semantics";
		const result = splitKeywords(input);
		expect(result).toEqual(["syntax", "semantics"]);
	});

	test("handles complex mixed input", () => {
		const input = "morphology, syntax (generative, minimalist), phonology-phonetics";
		const result = splitKeywords(input);
		expect(result).toEqual([
			"morphology",
			"syntax (generative, minimalist)",
			"phonology",
			"phonetics",
		]);
	});
});
