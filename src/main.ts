import { Plugin, TFile, TAbstractFile } from 'obsidian';

import { hash, path } from './utils';

const PASTED_IMAGE_PREFIX = 'Pasted image ';

export default class HashPastedImagePlugin extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (!(file instanceof TFile)) return;

				const timeGapMs = new Date().getTime() - file.stat.ctime;
				if (timeGapMs > 1000) return;

				if (isMarkdownFile(file)) return;

				if (isPastedImage(file)) {
					this.startRenameProcess(file);
				}
			}),
		);
	}

	async startRenameProcess(file: TFile) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return;
		}

		const originName = file.name;
		const newName = this.generateNewName(file);

		const newPath = path.join(file.parent.path, newName);
		try {
			await this.app.fileManager.renameFile(file, newPath);
		} catch (err) {
			console.log(err);
			throw err;
		}

		const editor = this.app.workspace.activeEditor?.editor;
		if (!editor) {
			return;
		}

		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const replacedLine = line.replace(originName, newName);

		editor.transaction({
			changes: [
				{
					from: { ...cursor, ch: 0 },
					to: { ...cursor, ch: line.length },
					text: replacedLine,
				},
			],
		});
	}

	generateNewName(file: TFile) {
		return hash(file.name + new Date().toString()) + '.' + file.extension;
	}
}

function isPastedImage(file: TAbstractFile): boolean {
	if (file instanceof TFile) {
		if (file.name.startsWith(PASTED_IMAGE_PREFIX)) {
			return true;
		}
	}

	return false;
}

function isMarkdownFile(file: TAbstractFile): boolean {
	if (file instanceof TFile) {
		if (file.extension === 'md') {
			return true;
		}
	}

	return false;
}
