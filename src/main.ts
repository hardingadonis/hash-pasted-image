import {
	Plugin,
	TFile,
	TAbstractFile,
	PluginSettingTab,
	App,
	Setting,
	Notice,
} from 'obsidian';

import { hash, path, stringToHashAlgorithm } from './utils';
import { DEFAULT_SETTINGS, HashAlgorithm, PluginSettings } from 'settings';

const PASTED_IMAGE_PREFIX = 'Pasted image ';

//---------------------------------------------------------------------

export default class HashPastedImagePlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (!(file instanceof TFile)) return;

				const timeGapMs = new Date().getTime() - file.stat.ctime;
				if (timeGapMs > 1000) return;

				if (isMarkdownFile(file)) return;

				if (isPastedImage(file) || isImageFile(file)) {
					this.startRenameProcess(file);
				}
			}),
		);

		this.addSettingTab(new SettingTab(this.app, this));
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

		if (this.settings.notification) {
			new Notice(`Pasted image renamed to ${newName}`);
		}
	}

	generateNewName(file: TFile) {
		return (
			hash(this.settings.hashAlgorithm, file.name + new Date().toString()) +
			'.' +
			file.extension
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

const isPastedImage = (file: TAbstractFile): boolean => {
	if (file instanceof TFile) {
		if (file.name.startsWith(PASTED_IMAGE_PREFIX)) {
			return true;
		}
	}

	return false;
};

const isImageFile = (file: TAbstractFile): boolean => {
	if (file instanceof TFile) {
		const validExtensions = [
			'jpg',
			'jpeg',
			'png',
			'gif',
			'bmp',
			'tiff',
			'tif',
			'webp',
			'heif',
			'heic',
			'svg',
			'ico',
		];

		return validExtensions.includes(file.extension.toLowerCase());
	}

	return false;
};

const isMarkdownFile = (file: TAbstractFile): boolean => {
	if (file instanceof TFile) {
		if (file.extension === 'md') {
			return true;
		}
	}

	return false;
};

//---------------------------------------------------------------------

class SettingTab extends PluginSettingTab {
	plugin: HashPastedImagePlugin;

	constructor(app: App, plugin: HashPastedImagePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h3', { text: 'Hash Pasted Image Settings' });
		containerEl.createEl('p', {
			text: 'Auto rename pasted images added to the vault via hash algorithm SHA-512',
		});

		new Setting(containerEl)
			.setName('Hash Algorithm')
			.setDesc('Algorithm to hash the pasted image name.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption(HashAlgorithm.SHA256, 'SHA-256')
					.addOption(HashAlgorithm.SHA384, 'SHA-384')
					.addOption(HashAlgorithm.SHA512, 'SHA-512')
					.addOption(HashAlgorithm.MD5, 'MD5')
					.setValue(this.plugin.settings.hashAlgorithm)
					.onChange(async (value) => {
						this.plugin.settings.hashAlgorithm = stringToHashAlgorithm(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Notification')
			.setDesc('Show a notification when a pasted image is renamed.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.notification)
					.onChange(async (value) => {
						this.plugin.settings.notification = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	onClose() {
		this.plugin.saveSettings();
	}
}
