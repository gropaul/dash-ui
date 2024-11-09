export function validateUrl(value?: string, allowPort: boolean = true): string | undefined {
    if (!value) {
        return 'URL cannot be empty';
    }

    const urlPatternWithPort = /^(https?:\/\/)(([\da-z.-]+|localhost)|(\d{1,3}\.){3}\d{1,3})(:\d{1,5})?(\/[^\s]*)?$/;
    const urlPatternWithoutPort = /^(https?:\/\/)(([\da-z.-]+|localhost)|(\d{1,3}\.){3}\d{1,3})(\/[^\s]*)?$/;

    // Choose the appropriate pattern based on `allowPort`
    const pattern = allowPort ? urlPatternWithPort : urlPatternWithoutPort;

    if (!pattern.test(value)) {
        return `Invalid URL format${allowPort ? '' : ' (ports are not allowed)'}`;
    }

    return undefined; // Return undefined if the URL is valid
}


export function validateInteger(value?: string, min?: number, max?: number): string | undefined {
    if (!value) {
        return 'Value cannot be empty';
    }

    const intValue = parseInt(value, 10);
    if (isNaN(intValue)) {
        return 'Value must be a number';
    }

    if (min !== undefined && intValue < min) {
        return `Value must be at least ${min}`;
    }

    if (max !== undefined && intValue > max) {
        return `Value must be at most ${max}`;
    }

    return undefined; // Return undefined if the integer is valid
}