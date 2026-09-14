export interface SelectOption {
	value: string;
	label: string;
	/** Options with the same group are shown together under that heading. */
	group?: string;
}
