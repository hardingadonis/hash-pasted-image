import {
	Plugin,
	TFile,
	TAbstractFile,
	PluginSettingTab,
	App,
	Setting,
	Notice,
	normalizePath,
} from 'obsidian';

import {
	hash,
	path,
	stringToHashAlgorithm,
	stringToEncodeDigest,
	ArrayBufferEqual,
} from './utils';
import {
	DEFAULT_SETTINGS,
	HashAlgorithm,
	EncodeDigest,
	PluginSettings,
} from 'settings';

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

				let isImageFileSupport =
					this.settings.copyImageFileSupport && isImageFile(file);
				let isPasted = isPastedImage(file);

				if (isImageFileSupport || isPasted) {
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
		const newName = await this.generateNewName(file);
		const newPath = path.join(file.parent.path, newName);
		const isRename = await this.fixHashCollision(file, originName, newPath);

		if (isRename) {
			try {
				await this.app.fileManager.renameFile(file, newPath);
			} catch (err) {
				console.log(err);
				throw err;
			}
		}
		const editor = this.app.workspace.activeEditor?.editor;
		if (!editor) {
			return;
		}

		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		let replacedLine = line.replace(originName, newName);

		if (line == replacedLine) {
			replacedLine = line.replace(encodeURI(originName), newName);
		}

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

	async generateNewName(file: TFile): Promise<string> {
		let hashContext : string | Uint8Array;
		if( this.settings.hashContext) {
			const imageContent = await file.vault.readBinary(file);
   			hashContext = new Uint8Array(imageContent);
		}else{
			hashContext = file.name + new Date().toString();
		}
		return (
			hash(
				this.settings.hashAlgorithm,
				this.settings.encodingDigest,
				hashContext,
			) +
			'.' +
			file.extension
		);
	}

	async fixHashCollision(file: TFile, originName: string, newPath: string): Promise<boolean> {
		let isRename = true;
		if (this.settings.hashContext) {
			const renamedFile = this.app.vault.getAbstractFileByPath(normalizePath(newPath));
			if (renamedFile instanceof TFile) {
				const imageContent = await file.vault.readBinary(file);
				const renamedContext = await renamedFile.vault.readBinary(renamedFile);
				if (ArrayBufferEqual(imageContent, renamedContext)) {
					isRename = false;
					await this.app.fileManager.trashFile(file);
					if (this.settings.notification) {
						try{
							new Notice(`Pasted image ${originName} already exists hashed file, and has been removed.`);
						}catch(err){
							console.error(err);
						}
					}
				}
			}
		}
		return isRename;
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS, ...loadedData };
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
			.setName('Encoding Digest')
			.setDesc('Binary-to-text encoding.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption(EncodeDigest.HEX, 'Hex')
					.addOption(EncodeDigest.BASE64URL, 'Base64 URL')
					.setValue(this.plugin.settings.encodingDigest)
					.onChange(async (value) => {
						this.plugin.settings.encodingDigest = stringToEncodeDigest(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Copy Image File Support')
			.setDesc(
				'Turn on to rename image files (not copy from clipboard) copied to the vault. Support formats: jpg, jpeg, png, gif, bmp, tiff, tif, webp, heif, heic, svg, ico.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.copyImageFileSupport)
					.onChange(async (value) => {
						this.plugin.settings.copyImageFileSupport = value;
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
		new Setting(containerEl)
			.setName('HashContext')
			.setDesc('Gen hash by filename or file context')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hashContext)
					.onChange(async (value) => {
						this.plugin.settings.hashContext = value;
						await this.plugin.saveSettings();
					}),
			);
		
	}
}
