type PortOption = "no_port_allowed" | "port_allowed" | "port_required";

export function validateUrl(
    value?: string,
    portOption: PortOption = "port_allowed",
): string | undefined {
    if (!value) {
        return 'URL cannot be empty';
    }

    let url: URL
    try {
        url = new URL(value);
    } catch (e) {
        return 'Invalid URL';
    }

    if (portOption === "no_port_allowed" && url.port) {
        return "URL must not include a port";
    } else if (portOption === "port_required" && !url.port) {
        return "URL must include a port";
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'URL must have http or https protocol';
    }
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