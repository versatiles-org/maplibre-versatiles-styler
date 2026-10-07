// Refuses to pack or release while a dependency is linked to a local checkout (`npm link`).
//
// The dependencies are bundled into the build, so a linked one would ship code that no published
// version has. `npm ci` or `npm install` puts the published versions back.
import { lstatSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const names = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });

const linked = names.filter((name) => {
	try {
		return lstatSync(new URL(`../node_modules/${name}`, import.meta.url)).isSymbolicLink();
	} catch {
		return false;
	}
});

if (linked.length > 0) {
	console.error(`Linked to a local checkout: ${linked.join(', ')}`);
	console.error('Run `npm install` to get the published versions back before a release.');
	process.exit(1);
}
