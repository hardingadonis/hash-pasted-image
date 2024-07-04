import * as crypto from 'crypto';

export const md5 = (contents: string) =>
	crypto.createHash('md5').update(contents).digest('hex');

export const path = {
	join(...partSegments: string[]): string {
		let parts: string[] = [];

		for (let i = 0, l = partSegments.length; i < l; i++) {
			parts = parts.concat(partSegments[i].split('/'));
		}

		const newParts = [];

		for (let i = 0, l = parts.length; i < l; i++) {
			const part = parts[i];
			if (!part || part === '.') continue;
			else newParts.push(part);
		}

		if (parts[0] === '') newParts.unshift('');

		return newParts.join('/');
	},

	basename(fullpath: string): string {
		const sp = fullpath.split('/');

		return sp[sp.length - 1];
	},

	extension(fullpath: string): string {
		const positions = [...fullpath.matchAll(new RegExp('\\.', 'gi'))].map(
			(a) => a.index,
		);

		return fullpath.slice(positions[positions.length - 1] + 1);
	},
};
