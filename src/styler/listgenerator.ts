import { createElementsFromHTML } from "./html";
import { Color } from "@versatiles/style";

type Value = Color | string | number | boolean | undefined;

export interface ValueStore {
	[key: string]: Value;
}

export class ListGenerator {
	readonly #defaultValues: ValueStore;
	readonly #values: ValueStore;
	readonly #changeHandler: () => void;
	readonly #container: HTMLElement;

	constructor(container: HTMLElement, values: ValueStore, defaultValues: ValueStore, changeHandler: () => void) {
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

	setValue(key: string, value: Value): void {
		this.#values[key] = value;
	}
	getDefaultValue(key: string): Value {
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
	defaultValue: Value;
	title: string;
	readonly list: ListGenerator;

	constructor(list: ListGenerator, key: string, title: string, defaultValue?: Value) {
		this.key = key;
		this.list = list;
		this.title = title;
		this.defaultValue = defaultValue;
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
			this.setValue(input, this.defaultValue);
			this.list.triggerChangeHandler()
		});

		input.addEventListener('change', () => {
			reset.removeAttribute('disabled');
			this.readValue(input);
			this.list.triggerChangeHandler()
		});

		this.list.appendChild(button);
		this.input = input as HTMLInputElement;

		this.defaultValue = this.list.getDefaultValue(this.key);
		this.setValue(input, this.defaultValue);
	}

	abstract readValue(input: HTMLInputElement): void;
	abstract getHtml(): string;
	value2text(value: Value): string {
		return String(value);
	}
	setValue(input: HTMLInputElement, value: Value) {
		input.value = String(value);
		this.list.setValue(this.key, value);
	}
}

class InputColor extends Input {
	getHtml(): string {
		return `<input id="input" type="color">`
	}
	readValue(input: HTMLInputElement) {
		input.style.backgroundColor = input.value;
		this.list.setValue(this.key, Color.parse(input.value));
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
	setValue(input: HTMLInputElement, value: number) {
		input.value = value.toString();
		this.list.setValue(this.key, value / this.scale);
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
	setValue(input: HTMLInputElement, value: boolean) {
		input.checked = value;
		this.list.setValue(this.key, value);
	}
	readValue(input: HTMLInputElement) {
		this.list.setValue(this.key, input.checked);
	}
}
