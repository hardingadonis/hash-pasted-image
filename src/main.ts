import { MarkdownView, Notice, Plugin, TFile, TAbstractFile } from 'obsidian';

import { md5, path } from './utils';

const PASTED_IMAGE_PREFIX = 'Pasted image ';

export default class HashPastedImage extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (!(file instanceof TFile)) return;

				const timeGapMs = new Date().getTime() - file.stat.ctime;
				if (timeGapMs > 1000) return;

				if (isMarkdownFile(file)) return;

				if (isPastedImage(file)) {
					this.startRenameProcess(file);
				} else {
					new Notice(`Created ${file.name}`);
				}
			}),
		);
	}

	async startRenameProcess(file: TFile) {
		const activeFile = this.getActiveFile();
		if (!activeFile) {
			new Notice('Error: No active file found.');
			return;
		}

		const originName = file.name;
		const newName = this.generateNewName(file);

		const newPath = path.join(file.parent.path, newName);
		try {
			await this.app.fileManager.renameFile(file, newPath);
		} catch (err) {
			new Notice(`Failed to rename ${newName}: ${err}`);
			throw err;
		}

		const editor = this.getActiveEditor();
		if (!editor) {
			new Notice(`Failed to rename ${newName}: no active editor`);
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

		new Notice(`Renamed ${originName} to ${newName}`);
	}

	generateNewName(file: TFile) {
		return md5(file.name + new Date().toString()) + '.' + file.extension;
	}

	getActiveFile() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file;

		return file;
	}

	getActiveEditor() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		return view?.editor;
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
