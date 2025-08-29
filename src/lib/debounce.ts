export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer); // cancel previous run
        }

        timer = setTimeout(() => {
            fn(...args); // only the last call actually runs
            timer = null; // reset
        }, delay);
    };
}
