import type { Page } from '@playwright/test';

export interface MapStyle {
	version: number;
	name?: string;
	glyphs?: string;
	sources: Record<string, unknown>;
	layers: Array<{
		id: string;
		type: string;
		paint?: Record<string, unknown>;
		layout?: Record<string, unknown>;
	}>;
}

export async function getMapStyle(page: Page): Promise<MapStyle> {
	return page.evaluate(() => (window as any)._map.getStyle());
}
