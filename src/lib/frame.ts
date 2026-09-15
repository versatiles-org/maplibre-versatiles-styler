/** Writes a value at most once per animation frame: the latest scheduled value wins. */
export interface FrameWriter<T> {
	/** Writes `value` in the next animation frame, replacing a value still waiting. */
	schedule(value: T): void;
	/** Writes the waiting value now, if there is one. */
	flush(): void;
	/** Drops the waiting value. */
	cancel(): void;
}

export function frameWriter<T>(
	write: (value: T) => void,
	requestFrame: (callback: () => void) => number = (callback) => requestAnimationFrame(callback),
	cancelFrame: (id: number) => void = (id) => cancelAnimationFrame(id)
): FrameWriter<T> {
	let waiting: { value: T } | undefined;
	let frame: number | undefined;

	const cancel = () => {
		if (frame !== undefined) cancelFrame(frame);
		frame = undefined;
		waiting = undefined;
	};

	const flush = () => {
		const next = waiting;
		cancel();
		if (next) write(next.value);
	};

	return {
		schedule(value) {
			waiting = { value };
			frame ??= requestFrame(() => {
				frame = undefined;
				flush();
			});
		},
		flush,
		cancel,
	};
}
