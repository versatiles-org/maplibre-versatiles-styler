/**
 * A PMTiles archive (spec version 3) without any tile: a header, an empty root directory and the JSON
 * metadata, nothing compressed. Enough for a reader to learn what the archive holds, and every tile it
 * is asked for is an empty one.
 */
export function pmtilesArchive(
	metadata: object,
	{ tileType = 1, maxZoom = 15 }: { tileType?: number; maxZoom?: number } = {}
): Uint8Array {
	const HEADER = 127;
	const json = new TextEncoder().encode(JSON.stringify(metadata));
	const bytes = new Uint8Array(HEADER + 1 + json.length);
	const view = new DataView(bytes.buffer);
	const setUint64 = (offset: number, value: number) =>
		view.setBigUint64(offset, BigInt(value), true);

	bytes.set(new TextEncoder().encode('PMTiles'), 0);
	view.setUint8(7, 3);
	// The root directory: one byte, the number of its entries.
	setUint64(8, HEADER);
	setUint64(16, 1);
	setUint64(24, HEADER + 1);
	setUint64(32, json.length);
	// Leaf directories and tile data: none, at the end of the file.
	setUint64(40, bytes.length);
	setUint64(56, bytes.length);
	view.setUint8(96, 1); // clustered
	view.setUint8(97, 1); // internal compression: none
	view.setUint8(98, 1); // tile compression: none
	view.setUint8(99, tileType); // 1: vector tiles
	view.setUint8(100, 0);
	view.setUint8(101, maxZoom);
	view.setInt32(102, -180e7, true);
	view.setInt32(106, -85.0511287e7, true);
	view.setInt32(110, 180e7, true);
	view.setInt32(114, 85.0511287e7, true);
	bytes.set(json, HEADER + 1);
	return bytes;
}

/** The part of an archive a `Range` header asks for, and the `Content-Range` to answer it with. */
export function byteRange(
	archive: Uint8Array,
	range: string | null | undefined
): { body: Uint8Array; contentRange: string } {
	const match = /bytes=(\d+)-(\d+)/.exec(range ?? '');
	const start = match ? Number(match[1]) : 0;
	const end = Math.min(match ? Number(match[2]) : archive.length - 1, archive.length - 1);
	return {
		body: archive.slice(start, end + 1),
		contentRange: `bytes ${start}-${end}/${archive.length}`,
	};
}
