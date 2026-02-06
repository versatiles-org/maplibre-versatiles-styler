export function removeRecursively(current: unknown, defaults: unknown): unknown {
	if (current === undefined) return undefined;
	if (current === null) return undefined;
	if (current === defaults) return undefined;
	if (typeof current === 'number') return current;
	if (typeof current === 'string') return current;
	if (typeof current === 'boolean') return current;
	if (typeof current === 'object') {
		if (Array.isArray(current)) {
			if (JSON.stringify(current) === JSON.stringify(defaults)) return undefined;
			return current;
		}
		const newObj: Record<string, unknown> = {};
		type R = Record<string, unknown>;
		let entryFound = false;
		for (const key of Object.keys(current as R)) {
			const cleaned = removeRecursively((current as R)[key], (defaults as R)?.[key]);
			if (cleaned !== undefined) {
				newObj[key] = cleaned;
				entryFound = true;
			}
		}
		return entryFound ? newObj : undefined;
	}

	console.log('Comparing', current, defaults);
	throw new Error('Not implemented');
}
