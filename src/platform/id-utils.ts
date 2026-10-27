

export function getRandomId(length: number = 32): string {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length}, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}
// Lowercase so ids stay distinct as file names on case-insensitive file systems.
export function getRandomLowercaseId(length: number = 16): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.getRandomValues(new Uint32Array(length)), (v) => characters[v % characters.length]).join('');
}
