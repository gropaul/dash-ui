export function deepEqual(obj1: any, obj2: any) {
    if (obj1 === obj2) return true; // Reference equality check
    if (
        typeof obj1 !== 'object' || obj1 === null ||
        typeof obj2 !== 'object' || obj2 === null
    ) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}


// formatDuration takes a duration in seconds and returns a string representation of the duration
export function formatDuration(duration: number): string {
    if (duration < 1) {
        return `${Math.round(duration * 1000)}ms`;
    } else if (duration < 60) {
        // with two decimal places
        return `${duration.toFixed(2)}s`;
    } else if (duration < 3600) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.round(duration % 60);
        return `${minutes}m ${seconds}s`;
    } else {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}