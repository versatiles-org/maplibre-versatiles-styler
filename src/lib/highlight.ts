/**
 * A very small syntax highlighter for the code the export dialog shows.
 *
 * It only ever sees code this styler generated — a `style.json`, the `@versatiles/style` ES module
 * snippet, or that snippet wrapped in `<script>` tags — so one lexer covers all three and there is no
 * language to choose. A real highlighter would be a dependency measured in tens of kilobytes for two
 * machine-generated shapes; this is a hundred lines and tested.
 *
 * It produces tokens, not markup: the caller renders them as elements, so nothing is ever interpolated
 * as HTML.
 */

export type TokenKind =
	| 'key'
	| 'string'
	| 'number'
	| 'keyword'
	| 'boolean'
	| 'null'
	| 'comment'
	| 'tag'
	| 'punct'
	| 'plain';

export interface Token {
	text: string;
	kind: TokenKind;
}

const KEYWORDS = new Set([
	'import',
	'from',
	'export',
	'const',
	'let',
	'var',
	'await',
	'async',
	'return',
	'new',
	'function',
]);

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[\w$]/;
const DIGIT = /[0-9]/;

/** Whether a `:` follows at `index`, ignoring spaces — which makes the token before it a key. */
function colonFollows(code: string, index: number): boolean {
	let i = index;
	while (i < code.length && (code[i] === ' ' || code[i] === '\t')) i++;
	return code[i] === ':';
}

/** Reads a quoted string starting at `start`, honouring backslash escapes. Returns the end index. */
function endOfString(code: string, start: number): number {
	const quote = code[start];
	let i = start + 1;
	while (i < code.length) {
		if (code[i] === '\\') {
			i += 2;
			continue;
		}
		if (code[i] === quote) return i + 1;
		i++;
	}
	return code.length;
}

/**
 * Splits `code` into tokens. Every character of the input lands in exactly one token, so joining the
 * token texts gives the input back — which is what lets the caller render them without losing anything.
 */
export function tokenize(code: string): Token[] {
	const tokens: Token[] = [];
	const push = (text: string, kind: TokenKind) => {
		if (text === '') return;
		// Runs of whitespace and punctuation merge into one node — in a JSON preview that is most of the
		// characters, and they all render the same. Meaningful kinds stay separate tokens.
		const last = tokens[tokens.length - 1];
		if (last && last.kind === kind && (kind === 'plain' || kind === 'punct')) last.text += text;
		else tokens.push({ text, kind });
	};

	let i = 0;
	while (i < code.length) {
		const char = code[i];

		// An HTML tag — only in the browser snippet, and only where a tag name really follows, so that a
		// `<` used as an operator stays punctuation.
		if (char === '<' && /^<\/?[a-zA-Z]/.test(code.slice(i, i + 3))) {
			const end = code.indexOf('>', i);
			if (end !== -1) {
				push(code.slice(i, end + 1), 'tag');
				i = end + 1;
				continue;
			}
		}

		if (char === '/' && code[i + 1] === '/') {
			const newline = code.indexOf('\n', i);
			const end = newline === -1 ? code.length : newline;
			push(code.slice(i, end), 'comment');
			i = end;
			continue;
		}

		if (char === '"' || char === "'") {
			const end = endOfString(code, i);
			const text = code.slice(i, end);
			// `"theme":` in JSON is a key, `"gray"` on the right of one is a value.
			push(text, colonFollows(code, end) ? 'key' : 'string');
			i = end;
			continue;
		}

		if (DIGIT.test(char) || (char === '-' && DIGIT.test(code[i + 1] ?? ''))) {
			let end = i + 1;
			while (end < code.length && /[0-9.eE+-]/.test(code[end])) {
				// `e+`/`e-` belong to the number; a bare `+`/`-` after a digit does not.
				if ((code[end] === '+' || code[end] === '-') && !/[eE]/.test(code[end - 1])) break;
				end++;
			}
			push(code.slice(i, end), 'number');
			i = end;
			continue;
		}

		if (IDENT_START.test(char)) {
			let end = i + 1;
			while (end < code.length && IDENT_PART.test(code[end])) end++;
			const word = code.slice(i, end);
			// `theme:` in the JS snippet is a key, written unquoted.
			if (colonFollows(code, end)) push(word, 'key');
			else if (word === 'true' || word === 'false') push(word, 'boolean');
			else if (word === 'null') push(word, 'null');
			else if (KEYWORDS.has(word)) push(word, 'keyword');
			else push(word, 'plain');
			i = end;
			continue;
		}

		if (/\s/.test(char)) {
			let end = i + 1;
			while (end < code.length && /\s/.test(code[end])) end++;
			push(code.slice(i, end), 'plain');
			i = end;
			continue;
		}

		push(char, 'punct');
		i++;
	}

	return tokens;
}

export interface TruncatedCode {
	code: string;
	/** How many characters were dropped; 0 when the whole thing fits. */
	dropped: number;
}

/**
 * Caps `code` for preview. A full style.json runs to hundreds of kilobytes, which would mean tens of
 * thousands of DOM nodes for a preview nobody reads to the end — the download is the artefact, this is
 * only a look at it. Cuts on a line boundary so the preview never ends mid-token.
 */
export function truncateCode(code: string, maxChars: number): TruncatedCode {
	if (code.length <= maxChars) return { code, dropped: 0 };
	const cut = code.lastIndexOf('\n', maxChars);
	const end = cut > 0 ? cut : maxChars;
	return { code: code.slice(0, end), dropped: code.length - end };
}
