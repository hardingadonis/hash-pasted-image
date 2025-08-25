import crypto from 'crypto';

import { EncodeDigest, HashAlgorithm } from '@/settings';

export const hash = (
	algorithm: string,
	digest: EncodeDigest,
	contents: string | Uint8Array,
) => {
	const digenc: crypto.BinaryToTextEncoding = digest;

	return crypto
		.createHash(algorithm)
		.update(contents)
		.digest(digenc)
		.replaceAll('=', '');
};

export const stringToHashAlgorithm = (str: string): HashAlgorithm => {
	switch (str) {
		case 'sha256':
			return HashAlgorithm.SHA256;
		case 'sha384':
			return HashAlgorithm.SHA384;
		case 'sha512':
			return HashAlgorithm.SHA512;
		case 'md5':
			return HashAlgorithm.MD5;
		default:
			return HashAlgorithm.SHA512;
	}
};

export const stringToEncodeDigest = (str: string): EncodeDigest => {
	switch (str) {
		case 'hex':
			return EncodeDigest.HEX;
		case 'base64url':
			return EncodeDigest.BASE64URL;
		default:
			return EncodeDigest.HEX;
	}
};

export const arrayBufferEqual = (
	buf1: ArrayBuffer,
	buf2: ArrayBuffer,
): boolean => {
	if (buf1.byteLength != buf2.byteLength) return false;

	let dv1 = new Uint8Array(buf1);
	let dv2 = new Uint8Array(buf2);

	for (let i = 0; i < buf1.byteLength; i++) {
		if (dv1[i] != dv2[i]) return false;
	}

	return true;
};

export const delay = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};
