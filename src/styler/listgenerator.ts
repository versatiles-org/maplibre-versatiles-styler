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
	readonly input: HTMLInputElement;
	readonly key: string;
	defaultValue?: string;
	readonly list: ListGenerator;

	constructor(list: ListGenerator, key: string, title: string) {
		this.key = key;
		this.list = list;

		const { button, input, reset } = createElementsFromHTML(`
			<div id="button" class="entry">
				<label>${title}</label>
				<div class="space"></div>
				${this.getHtml()}
				<button id="reset" type="button" disabled>&circlearrowleft;</button>
			</div>
		`);

		reset.addEventListener('click', () => {
			reset.setAttribute('disabled', 'disabled');
			this.setValue(this.defaultValue ?? '');
			this.list.triggerChangeHandler()
		});

		input.addEventListener('change', () => {
			reset.removeAttribute('disabled');
			this.readValue();
			this.list.triggerChangeHandler()
		});

		this.list.appendChild(button);
		this.input = input as HTMLInputElement;
	}

	init() {
		const defaultValue = this.list.getDefaultValue(this.key);
		if (defaultValue == null) throw Error();

		this.defaultValue = this.value2text(defaultValue);
		this.setValue(this.defaultValue);
	}

	abstract readValue(): void;
	abstract getHtml(): string;
	value2text(value: unknown): string {
		return String(value);
	}
	setValue(text: string) {
		this.input.value = text;
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
	readValue() {
		this.input.style.backgroundColor = this.input.value;
		this.list.setValue(this.key, this.input.value);
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
	setValue(text: string) {
		this.input.value = text;
		this.list.setValue(this.key, parseFloat(text) / this.scale);
	}
	readValue() {
		this.list.setValue(this.key, parseFloat(this.input.value) / this.scale);
	}
}


class InputCheckbox extends Input {
	getHtml(): string {
		return `<input id="input" type="checkbox">`
	}
	setValue(text: string) {
		const value = text === 'true';
		this.input.checked = Boolean(value);
		this.list.setValue(this.key, Boolean(value));
	}
	readValue() {
		this.list.setValue(this.key, this.input.checked);
	}
}
