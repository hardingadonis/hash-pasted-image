export enum HashAlgorithm {
	SHA256 = 'sha256',
	SHA384 = 'sha384',
	SHA512 = 'sha512',
	MD5 = 'md5',
}

export interface PluginSettings {
	hashAlgorithm: HashAlgorithm;
	notification: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	hashAlgorithm: HashAlgorithm.SHA512,
	notification: true,
};
