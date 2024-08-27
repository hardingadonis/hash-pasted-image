export enum HashAlgorithm {
	SHA256 = 'sha256',
	SHA384 = 'sha384',
	SHA512 = 'sha512',
	MD5 = 'md5',
}

export interface PluginSettings {
	hashAlgorithm: HashAlgorithm;
	copyImageFileSupport: boolean;
	notification: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	hashAlgorithm: HashAlgorithm.SHA512,
	copyImageFileSupport: false,
	notification: true,
};
