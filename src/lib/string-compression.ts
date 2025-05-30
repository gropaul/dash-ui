import { deflate, inflate } from 'pako';

// Base64 encode Uint8Array
function base64Encode(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Base64 decode to Uint8Array
function base64Decode(str: string): Uint8Array {
    const padded = str.padEnd(str.length + (4 - str.length % 4) % 4, '=')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Compress a string to URL-safe base64
export function compressString(input: string): string {
    try {
        const compressed = deflate(input);
        return base64Encode(compressed);
    } catch (e) {
        console.error("Compression failed:", e);
        return '';
    }
}

// Decompress a URL-safe base64 string back to the original string
export function decompressString(input: string): string {
    try {
        const compressed = base64Decode(input);
        const decompressed = inflate(compressed, { to: 'string' });
        return decompressed;
    } catch (e) {
        console.error("Decompression failed:", e);
        return '';
    }
}
