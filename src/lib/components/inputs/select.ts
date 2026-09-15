export interface SelectOption {
	value: string;
	label: string;
	/** Options with the same group are shown together under that heading. */
	group?: string;
	/** The name of an option whose label is a symbol, e.g. "Uppercase" for "AA". */
	title?: string;
}
