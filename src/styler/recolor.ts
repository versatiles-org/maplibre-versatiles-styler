import { RecolorOptions } from "@versatiles/style";
import { ListGenerator } from "./html";

export function fillRecolorList(container: HTMLElement, renderStyle: () => void, currentRecolor: RecolorOptions, defaultRecolor: RecolorOptions) {
	console.log(defaultRecolor);
	const list = new ListGenerator(container, currentRecolor, defaultRecolor, renderStyle);

	list.addCheckbox('invert', 'invert colors');
	list.addNumber('rotate', 'rotate hue');
	list.addNumber('saturate', 'saturate', 100);
	list.addNumber('gamma', 'gamma');
	list.addNumber('contrast', 'contrast', 100);
	list.addNumber('brightness', 'brightness', 100);
	list.addNumber('tint', 'tint', 100);
	list.addColor('tintColor', 'tint color');
}