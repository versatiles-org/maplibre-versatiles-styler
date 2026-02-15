import type { StyleSpecification } from 'maplibre-gl';
import { colorful, eclipse, graybeard, neutrino, shadow, satellite } from '@versatiles/style';
import type {
	StyleBuilderFunction,
	StyleBuilderOptions,
	SatelliteStyleOptions,
} from '@versatiles/style';
import { removeRecursively } from './utils';

export const vectorStyles = { colorful, eclipse, graybeard, shadow, neutrino } satisfies Record<
	string,
	StyleBuilderFunction
>;

export type VectorStyleKey = keyof typeof vectorStyles;
export type StyleKey = VectorStyleKey | 'satellite';

export type EnforcedStyleBuilderOptions = StyleBuilderOptions & {
	colors: NonNullable<StyleBuilderOptions['colors']>;
	recolor: NonNullable<StyleBuilderOptions['recolor']>;
	fonts: NonNullable<StyleBuilderOptions['fonts']>;
};

export const defaultSatelliteOptions = {
	overlay: true,
	rasterOpacity: 1,
	rasterHueRotate: 0,
	rasterBrightnessMin: 0,
	rasterBrightnessMax: 1,
	rasterSaturation: 0,
	rasterContrast: 0,
};

export async function getStyle(
	styleKey: StyleKey,
	vectorOptions: EnforcedStyleBuilderOptions,
	satelliteOptions: SatelliteStyleOptions,
	origin: string
): Promise<StyleSpecification> {
	if (styleKey === 'satellite') {
		return await satellite({ ...satelliteOptions, baseUrl: origin });
	}
	return vectorStyles[styleKey]({
		...vectorOptions,
		baseUrl: origin,
	});
}

export function getMinimalOptions(
	styleKey: StyleKey,
	vectorOptions: EnforcedStyleBuilderOptions,
	satelliteOptions: SatelliteStyleOptions
): StyleBuilderOptions | SatelliteStyleOptions {
	if (styleKey === 'satellite') {
		return removeRecursively(
			JSON.parse(JSON.stringify(satelliteOptions)),
			defaultSatelliteOptions
		) as SatelliteStyleOptions;
	}
	return removeRecursively(
		JSON.parse(JSON.stringify(vectorOptions)),
		vectorStyles[styleKey].getOptions()
	) as StyleBuilderOptions;
}
