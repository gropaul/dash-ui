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

export function deepClone<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
        return obj.map(deepClone) as any;
    }

    const newObj = {} as T;
    for (const key in obj) {
        newObj[key] = deepClone(obj[key]);
    }

    return newObj;
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


export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function safeDeepUpdate<T extends Record<string, any>>(base: T, updates: DeepPartial<T>): T {
    for (const key in updates) {
        const updateValue = updates[key];
        const baseValue = base[key];

        // If the key doesn't exist in base, we may need to create it
        if (!(key in base)) {
            // If updateValue is an object, initialize an object and recurse
            if (
                updateValue &&
                typeof updateValue === 'object' &&
                !Array.isArray(updateValue)
            ) {
                base[key] = {} as T[typeof key];
                safeDeepUpdate(base[key], updateValue);
            } else {
                // If it's a primitive or array, just assign it directly
                base[key] = updateValue as T[typeof key];
            }
            continue;
        }

        // If both baseValue and updateValue are objects, recurse
        if (
            baseValue &&
            updateValue &&
            typeof baseValue === 'object' &&
            typeof updateValue === 'object' &&
            !Array.isArray(baseValue) &&
            !Array.isArray(updateValue)
        ) {
            safeDeepUpdate(baseValue, updateValue);
        } else {
            // Otherwise, overwrite the value directly
            base[key] = updateValue as T[typeof key];
        }
    }

    return base;
}
