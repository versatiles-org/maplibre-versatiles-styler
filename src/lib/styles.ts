import styles from '../assets/control-style.scss?inline';

export function ensureStylesInjected() {
	if (typeof document === 'undefined') return;
	if (document.head.querySelector('style[data-versatiles-styler]')) return;

	const styleEl = document.createElement('style');
	styleEl.setAttribute('type', 'text/css');
	styleEl.setAttribute('data-versatiles-styler', '');
	styleEl.textContent = styles;
	document.head.appendChild(styleEl);
}
