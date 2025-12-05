import styles from './control-style.scss';

export function createElementsFromHTML(htmlString: string): Record<string, HTMLElement> {
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlString, 'text/html');
	const elements = Array.from(doc.body.querySelectorAll('[name]').values()) as HTMLElement[];
	const obj = Object.fromEntries(
		elements.map((element) => [element.getAttribute('name')!, element])
	);
	elements.forEach((element) => element.removeAttribute('name'));
	return obj;
}

export function ensureStylesInjected() {
	if (typeof document === 'undefined') return;

	const styleEl = document.createElement('style');
	styleEl.setAttribute('type', 'text/css');
	styleEl.dataset.versatilesStyler = 'true';
	styleEl.textContent = styles;
	document.head.appendChild(styleEl);
}
