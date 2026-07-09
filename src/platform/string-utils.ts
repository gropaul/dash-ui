/**
 * Human-friendly relative time ("Just now", "5 mins ago", "2 days ago").
 * Returns `fallback` when the timestamp is missing (e.g. an element never viewed/edited).
 */
export function formatRelativeTime(timestamp?: number, fallback: string = "Never"): string {
    if (timestamp === undefined || timestamp === null || Number.isNaN(timestamp)) {
        return fallback;
    }

    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
}

export function toCamelCase(str: string): string {
    // Normalize the string by replacing non-alphanumeric characters with spaces
    // This handles underscores, hyphens, and potentially other punctuation
    const words = str
        .replace(/[^a-zA-Z0-9]+/g, ' ') // convert delimiters to spaces
        .trim()                         // remove leading/trailing whitespace
        .split(/\s+/);                  // split on whitespace

    if (words.length === 0) {
        return '';
    }

    // Lowercase all words
    const lowerCasedWords = words.map(word => word.toLowerCase());

    // The first word stays lowercase, subsequent words get capitalized first letter
    return lowerCasedWords
        .map((word, index) => index === 0
            ? word
            : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

export function toSnakeCase(str: string): string {
    // Normalize the string similarly to how we did in camelCase
    const words = str
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/);

    // Lowercase all words and join with underscore
    return words.map(word => word.toLowerCase()).join('_');
}
