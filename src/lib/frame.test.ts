import { describe, it, expect, vi } from 'vitest';
import { frameWriter } from './frame';

function fakeFrames() {
	const callbacks = new Map<number, () => void>();
	let next = 1;
	return {
		request: vi.fn((callback: () => void) => {
			callbacks.set(next, callback);
			return next++;
		}),
		cancel: vi.fn((id: number) => void callbacks.delete(id)),
		run() {
			const due = [...callbacks.values()];
			callbacks.clear();
			due.forEach((callback) => callback());
		},
	};
}

describe('frameWriter', () => {
	it('writes the latest value once per frame', () => {
		const frames = fakeFrames();
		const write = vi.fn();
		const writer = frameWriter(write, frames.request, frames.cancel);

		writer.schedule('a');
		writer.schedule('b');
		writer.schedule('c');
		expect(write).not.toHaveBeenCalled();
		expect(frames.request).toHaveBeenCalledTimes(1);

		frames.run();
		expect(write.mock.calls).toEqual([['c']]);

		writer.schedule('d');
		frames.run();
		expect(write.mock.calls).toEqual([['c'], ['d']]);
		frames.run();
		expect(write).toHaveBeenCalledTimes(2);
	});

	it('flushes the waiting value at once, and only once', () => {
		const frames = fakeFrames();
		const write = vi.fn();
		const writer = frameWriter(write, frames.request, frames.cancel);

		writer.flush();
		expect(write).not.toHaveBeenCalled();
		writer.schedule('a');
		writer.flush();
		expect(write.mock.calls).toEqual([['a']]);
		frames.run();
		expect(write).toHaveBeenCalledTimes(1);
	});

	it('drops the waiting value on cancel', () => {
		const frames = fakeFrames();
		const write = vi.fn();
		const writer = frameWriter(write, frames.request, frames.cancel);

		writer.schedule('a');
		writer.cancel();
		frames.run();
		writer.flush();
		expect(write).not.toHaveBeenCalled();
	});
});
