type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function removeRecursively<T>(current: T, defaults: unknown): T | undefined {
	if (current === undefined) return undefined;
	if (current === null) return undefined;
	if (current === defaults) return undefined;
	if (typeof current === 'number') return current;
	if (typeof current === 'string') return current;
	if (typeof current === 'boolean') return current;
	if (Array.isArray(current)) {
		if (JSON.stringify(current) === JSON.stringify(defaults)) return undefined;
		return current;
	}
	if (isPlainObject(current)) {
		const defaultObj = isPlainObject(defaults) ? defaults : {};
		const newObj: PlainObject = {};
		let entryFound = false;
		for (const key of Object.keys(current)) {
			const cleaned = removeRecursively(current[key], defaultObj[key]);
			if (cleaned !== undefined) {
				newObj[key] = cleaned;
				entryFound = true;
			}
		}
		return entryFound ? (newObj as T) : undefined;
	}

	throw new Error(`removeRecursively: unsupported type "${typeof current}"`);
}

export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}
