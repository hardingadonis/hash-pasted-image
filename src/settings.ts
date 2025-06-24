export enum HashAlgorithm {
	SHA256 = 'sha256',
	SHA384 = 'sha384',
	SHA512 = 'sha512',
	MD5 = 'md5',
}

export enum EncodeDigest {
	HEX = 'hex',
	BASE64URL = 'base64url',
}

export interface PluginSettings {
	hashAlgorithm: HashAlgorithm;
	encodingDigest: EncodeDigest;
	copyImageFileSupport: boolean;
	notification: boolean;
	hashContext: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	hashAlgorithm: HashAlgorithm.SHA512,
	copyImageFileSupport: false,
	encodingDigest: EncodeDigest.HEX,
	notification: true,
	hashContext: false,
}
