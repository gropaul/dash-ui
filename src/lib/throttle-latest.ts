export function throttleLatest<T extends unknown[], R>(
    fn: (...args: T) => Promise<R> | R,
    wait: number
) {
    let timer: number | null = null;
    let latestArgs: T | null = null;
    let leadingCall = true;
    let lastPromise: Promise<R> | null = null;

    const fire = () => {
        if (latestArgs) {
            lastPromise = Promise.resolve(fn(...latestArgs));
            latestArgs = null;
        }
        timer = null;
    };

    const wrapped = (...args: T): Promise<R> | void => {
        if (leadingCall) {
            lastPromise = Promise.resolve(fn(...args));
            leadingCall = false;
            timer = window.setTimeout(() => {
                fire();
                leadingCall = true;
            }, wait);
            return lastPromise;
        } else {
            latestArgs = args;
            return lastPromise ?? Promise.resolve() as Promise<R>;
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

    return wrapped as ((...args: T) => Promise<R>) & { cancel: () => void };
}
