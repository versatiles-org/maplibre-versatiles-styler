import { describe, it, expect } from 'vitest';
import { tokenize, truncateCode, type Token, type TokenKind } from './highlight';

/** The tokens of one kind, in order — what a test usually wants to assert. */
function of(code: string, kind: TokenKind): string[] {
	return tokenize(code)
		.filter((token) => token.kind === kind)
		.map((token) => token.text);
}

function joined(tokens: Token[]): string {
	return tokens.map((token) => token.text).join('');
}

describe('tokenize', () => {
	it('loses nothing: the tokens join back into the input', () => {
		for (const code of [
			'{"a": 1}',
			"import { osm } from '@versatiles/style';",
			'<script>\n  const x = await f({ a: -1.5e3 });\n</script>',
			'// a comment\n{}',
			'',
			'   ',
			'{"unterminated: "',
			'{"escaped\\": still a string"}',
		]) {
			expect(joined(tokenize(code)), code).toBe(code);
		}
	});

	it('marks quoted JSON keys as keys and their values as strings', () => {
		const code = '{\n  "theme": "gray"\n}';
		expect(of(code, 'key')).toEqual(['"theme"']);
		expect(of(code, 'string')).toEqual(['"gray"']);
	});

	it('marks unquoted keys of the JS snippet as keys', () => {
		// `toCode` writes identifier keys unquoted, so both shapes appear in the dialog.
		const code = 'osm({\n  theme: "gray",\n  text: { scale: 1.5 }\n})';
		expect(of(code, 'key')).toEqual(['theme', 'text', 'scale']);
		expect(of(code, 'string')).toEqual(['"gray"']);
	});

	it('sees a key through the whitespace before the colon', () => {
		expect(of('{ "a" : 1 }', 'key')).toEqual(['"a"']);
		expect(of('{ a : 1 }', 'key')).toEqual(['a']);
	});

	it('keeps a string that is not followed by a colon a string', () => {
		expect(of('["a", "b"]', 'string')).toEqual(['"a"', '"b"']);
		expect(of('["a", "b"]', 'key')).toEqual([]);
	});

	it('reads numbers, including negative and exponent forms', () => {
		expect(of('[1, -2, 1.5, -0.25, 2e3, 1.5e-4]', 'number')).toEqual([
			'1',
			'-2',
			'1.5',
			'-0.25',
			'2e3',
			'1.5e-4',
		]);
	});

	it('does not swallow the separator after a number', () => {
		// a `+`/`-` only belongs to the number right after an exponent marker
		expect(of('[1-2]', 'number')).toEqual(['1', '-2']);
		expect(joined(tokenize('[1-2]'))).toBe('[1-2]');
	});

	it('distinguishes booleans and null from other identifiers', () => {
		const code = '{ "a": true, "b": false, "c": null, "d": other }';
		expect(of(code, 'boolean')).toEqual(['true', 'false']);
		expect(of(code, 'null')).toEqual(['null']);
		// `other` is plain, merged with the whitespace around it
		expect(of(code, 'plain').join('')).toContain('other');
	});

	it('marks the keywords of the npm snippet', () => {
		const code =
			"import { osm, inlineSources } from '@versatiles/style';\n\nconst style = await inlineSources(osm());";
		expect(of(code, 'keyword')).toEqual(['import', 'from', 'const', 'await']);
		expect(of(code, 'string')).toEqual(["'@versatiles/style'"]);
	});

	it('marks the script tags of the browser snippet', () => {
		const code =
			'<script src="https://example.org/x.js"></script>\n<script>\n  const a = 1;\n</script>';
		expect(of(code, 'tag')).toEqual([
			'<script src="https://example.org/x.js">',
			'</script>',
			'<script>',
			'</script>',
		]);
		// the URL is inside the tag, not a string of its own
		expect(of(code, 'string')).toEqual([]);
	});

	it('leaves a bare < as punctuation, not a tag', () => {
		expect(of('a < b', 'tag')).toEqual([]);
		expect(of('a < b', 'punct')).toEqual(['<']);
	});

	it('reads line comments to the end of the line only', () => {
		const code = '// note\nconst a = 1;';
		expect(of(code, 'comment')).toEqual(['// note']);
		expect(of(code, 'keyword')).toEqual(['const']);
	});

	it('honours backslash escapes inside strings', () => {
		const code = '{ "a": "he said \\"hi\\"", "b": 1 }';
		expect(of(code, 'string')).toEqual(['"he said \\"hi\\""']);
		expect(of(code, 'key')).toEqual(['"a"', '"b"']);
	});

	it('ends an unterminated string at the end of the input rather than looping', () => {
		expect(joined(tokenize('{ "a": "unterminated'))).toBe('{ "a": "unterminated');
	});

	it('merges runs of the same kind, so a preview is not one node per character', () => {
		// `}}}` is one punctuation token, not three
		const tokens = tokenize('{"a":{"b":{}}}');
		expect(tokens.filter((t) => t.kind === 'punct').some((t) => t.text.length > 1)).toBe(true);
	});
});

describe('truncateCode', () => {
	it('leaves code that fits alone', () => {
		expect(truncateCode('abc', 10)).toEqual({ code: 'abc', dropped: 0 });
		expect(truncateCode('abc', 3)).toEqual({ code: 'abc', dropped: 0 });
	});

	it('cuts on a line boundary and reports what it dropped', () => {
		const code = 'line one\nline two\nline three';
		const result = truncateCode(code, 12);
		expect(result.code).toBe('line one');
		expect(result.dropped).toBe(code.length - 'line one'.length);
	});

	it('falls back to a hard cut when there is no newline to cut on', () => {
		const result = truncateCode('a'.repeat(100), 10);
		expect(result.code).toHaveLength(10);
		expect(result.dropped).toBe(90);
	});

	it('keeps the kept text plus the dropped count equal to the original length', () => {
		const code = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
		for (const max of [1, 7, 20, 100, 10_000]) {
			const { code: kept, dropped } = truncateCode(code, max);
			expect(kept.length + dropped, `max=${max}`).toBe(code.length);
		}
	});
});
