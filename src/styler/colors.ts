import Color from "color";
import { createElementsFromHTML } from "./html";


export function fillColorList(list:HTMLElement, renderStyle:() => void, currentColors: Record<string, string>, defaultColors: Record<string, string>) {
	list.innerHTML = '';

	Object.entries(defaultColors).forEach(([name, defaultColor]) => {
		const hex = new Color(currentColors[name]).hex();
		const { button, input, reset } = createElementsFromHTML(`
			<div id="button" class="entry">
				<label>${name}</label>
				<div class="space"></div>
				<input id="input" type="color" value="${hex}" style="background-color:${hex}">
				<button id="reset" type="button" disabled>&circlearrowleft;</button>
			</div>
		`);

		const setColor = (color: string) => {
			currentColors[name] = color;
			input.style.backgroundColor = color;
			renderStyle()
		}

		reset.addEventListener('click', () => {
			reset.setAttribute('disabled', 'disabled');
			setColor(defaultColor);
		});

		input.addEventListener('change', () => {
			reset.removeAttribute('disabled');
			setColor((input as HTMLInputElement).value);
		});

		list.appendChild(button);
	});
}
