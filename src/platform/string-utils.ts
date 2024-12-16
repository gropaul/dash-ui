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
