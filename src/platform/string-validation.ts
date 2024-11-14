type PortOption = "no_port_allowed" | "port_allowed" | "port_required";

export function validateUrl(
    value?: string,
    portOption: PortOption = "port_allowed",
    missingPortMessage: string = "URL must include a port"
): string | undefined {
    if (!value) {
        return "URL cannot be empty";
    }

    const urlPatternWithPort = /^(https?:\/\/)(([\da-z.-]+|localhost)|(\d{1,3}\.){3}\d{1,3})(:\d{1,5})(\/[^\s]*)?$/;
    const urlPatternWithoutPort = /^(https?:\/\/)(([\da-z.-]+|localhost)|(\d{1,3}\.){3}\d{1,3})(\/[^\s]*)?$/;
    const optionalPortPattern = /^(https?:\/\/)(([\da-z.-]+|localhost)|(\d{1,3}\.){3}\d{1,3})(:\d{1,5})?(\/[^\s]*)?$/;

    // Select the appropriate pattern based on the `portOption`
    let pattern;
    switch (portOption) {
        case "port_required":
            pattern = urlPatternWithPort;
            break;
        case "no_port_allowed":
            pattern = urlPatternWithoutPort;
            break;
        case "port_allowed":
        default:
            pattern = optionalPortPattern;
            break;
    }

    if (!pattern.test(value)) {
        return `Invalid URL format${portOption === "no_port_allowed" ? " (ports are not allowed)" : ""}`;
    }

    // Additional check if port is required but missing
    if (portOption === "port_required" && !/:\d{1,5}/.test(value)) {
        return missingPortMessage;
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