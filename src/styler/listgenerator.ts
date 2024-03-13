import Color from "color";
import { createElementsFromHTML } from "./html";

export class ListGenerator {
	readonly #defaultValues: Record<string, any>;
	readonly #values: Record<string, any>;
	readonly #changeHandler: () => void;
	readonly #container: HTMLElement;

	constructor(container: HTMLElement, values: Record<string, any> = {}, defaultValues: Record<string, any> = {}, changeHandler: () => void) {
		this.#container = container;
		this.#values = values;
		this.#defaultValues = defaultValues;
		this.#changeHandler = changeHandler;

		this.#container.innerHTML = '';
	}

	addCheckbox(key: string, title: string): ListGenerator {
		new InputCheckbox(this, key, title).init();
		return this;
	}

	addNumber(key: string, title: string, scale: number = 1): ListGenerator {
		new InputNumber(this, key, title, scale).init();
		return this;
	}

	addColor(key: string, title: string): ListGenerator {
		new InputColor(this, key, title).init();
		return this;
	}

	addSelect(key: string, title: string, options: Record<string, string>): ListGenerator {
		new InputSelect(this, key, title, options).init();
		return this;
	}

	setValue(key: string, value: unknown): void {
		this.#values[key] = value;
	}
	getDefaultValue(key: string): unknown {
		return this.#defaultValues[key];
	}
	appendChild(child: HTMLElement) {
		this.#container.appendChild(child);
	};
	triggerChangeHandler() {
		this.#changeHandler()
	}
}

abstract class Input {
	input?: HTMLInputElement;
	readonly key: string;
	defaultValue?: string;
	title: string;
	readonly list: ListGenerator;

	constructor(list: ListGenerator, key: string, title: string) {
		this.key = key;
		this.list = list;
		this.title = title;
	}

	init() {
		const { button, input, reset } = createElementsFromHTML(`
			<div id="button" class="entry">
				<label>${this.title}</label>
				<div class="space"></div>
				${this.getHtml()}
				<button id="reset" type="button" disabled>&circlearrowleft;</button>
			</div>
		`) as { button: HTMLDivElement; input: HTMLInputElement; reset: HTMLButtonElement };

		reset.addEventListener('click', () => {
			reset.setAttribute('disabled', 'disabled');
			this.setValue(input, this.defaultValue ?? '');
			this.list.triggerChangeHandler()
		});

		input.addEventListener('change', () => {
			reset.removeAttribute('disabled');
			this.readValue(input);
			this.list.triggerChangeHandler()
		});

		this.list.appendChild(button);
		this.input = input as HTMLInputElement;

		const defaultValue = this.list.getDefaultValue(this.key);

		this.defaultValue = this.value2text(defaultValue);
		this.setValue(input, this.defaultValue);
	}

	abstract readValue(input: HTMLInputElement): void;
	abstract getHtml(): string;
	value2text(value: unknown): string {
		return String(value);
	}
	setValue(input: HTMLInputElement, text: string) {
		input.value = text;
		this.list.setValue(this.key, text);
	}
}

class InputColor extends Input {
	getHtml(): string {
		return `<input id="input" type="color">`
	}
	value2text(value: unknown): string {
		return new Color(String(value)).hex();
	}
	readValue(input: HTMLInputElement,) {
		input.style.backgroundColor = input.value;
		this.list.setValue(this.key, input.value);
	}
}

class InputNumber extends Input {
	readonly scale: number;
	constructor(list: ListGenerator, key: string, title: string, scale: number = 1) {
		super(list, key, title);
		this.scale = scale;
	}
	getHtml(): string {
		return `<input id="input" type="number">`
	}
	value2text(value: unknown): string {
		return String(Number(value) * this.scale);
	}
	setValue(input: HTMLInputElement, text: string) {
		input.value = text;
		this.list.setValue(this.key, parseFloat(text) / this.scale);
	}
	readValue(input: HTMLInputElement) {
		this.list.setValue(this.key, parseFloat(input.value) / this.scale);
	}
}


class InputSelect extends Input {
	readonly options: Record<string, string>;
	constructor(list: ListGenerator, key: string, title: string, options: Record<string, string>) {
		console.log(options);
		super(list, key, title);
		this.options = options;
	}
	getHtml(): string {
		console.log(this.options);
		const options = Object.entries(this.options).map(([label, value]) => `<option value="${value}">${label}</option>`)
		return `<select id="input">${options.join('')}</select>`
	}
	setValue(input: HTMLInputElement, text: string) {
		input.value = text;
		this.list.setValue(this.key, text);
	}
	readValue(input: HTMLInputElement) {
		this.list.setValue(this.key, input.value);
	}
}

class InputCheckbox extends Input {
	getHtml(): string {
		return `<input id="input" type="checkbox">`
	}
	setValue(input: HTMLInputElement, text: string) {
		const value = text === 'true';
		input.checked = Boolean(value);
		this.list.setValue(this.key, Boolean(value));
	}
	readValue(input: HTMLInputElement) {
		this.list.setValue(this.key, input.checked);
	}
}
