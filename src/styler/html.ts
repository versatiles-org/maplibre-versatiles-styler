
function createElementsFromHTML(htmlString: string): Record<string, HTMLElement> {
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlString, 'text/html');
	const elements = Array.from(doc.body.querySelectorAll('[id]').values()) as HTMLElement[];
	const obj = Object.fromEntries(elements.map(element => [element.id, element]));
	elements.forEach(element => element.removeAttribute('id'));
	return obj;
}
