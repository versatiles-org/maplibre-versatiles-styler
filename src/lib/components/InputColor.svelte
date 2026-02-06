<script lang="ts">
	import { Color } from '@versatiles/style';

	let {
		label,
		value = $bindable(),
		defaultValue,
		onchange,
	}: {
		label: string;
		value: Color | string | undefined;
		defaultValue: Color | string | undefined;
		onchange?: () => void;
	} = $props();

	let isModified = $derived(String(value) !== String(defaultValue));

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		input.style.backgroundColor = input.value;
		value = Color.parse(input.value);
		onchange?.();
	}

	function reset() {
		value = defaultValue;
		onchange?.();
	}
</script>

<div class="entry color-container">
	<label>{label}</label>
	<div class="input">
		<input type="color" value={String(value)} onchange={handleChange} />
		<button type="button" disabled={!isModified} onclick={reset}>&circlearrowleft;</button>
	</div>
</div>
