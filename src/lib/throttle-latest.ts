// "@/lib/throttleLatest.ts"
export function throttleLatest<T extends unknown[]>(
    fn: (...args: T) => void,
    wait: number
) {
    let timer: number | null = null;
    let latestArgs: T | null = null;
    let leadingCall = true;

    const fire = () => {
        if (latestArgs) {
            fn(...latestArgs);
            latestArgs = null;
        }
        timer = null;
    };

    const wrapped = (...args: T) => {
        if (leadingCall) {
            fn(...args); // fire immediately
            leadingCall = false;
            timer = window.setTimeout(() => {
                fire();
                leadingCall = true; // reset so next call fires immediately again
            }, wait);
        } else {
            latestArgs = args; // save latest args for trailing fire
        }
    };

    wrapped.cancel = () => {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
        latestArgs = null;
        leadingCall = true;
    };

    return wrapped as ((...args: T) => void) & { cancel: () => void };
}
