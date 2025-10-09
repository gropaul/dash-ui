export function throttleLatest<T extends unknown[], R>(
    fn: (...args: T) => Promise<R> | R,
    wait: number
) {
    let timer: number | null = null;
    let latestArgs: T | null = null;
    let leadingCall = true;
    let running = false;
    let lastPromise: Promise<R> | null = null;

    const scheduleNext = () => {
        if (latestArgs == null) {
            // nothing queued — reset state so the next call can be immediate
            leadingCall = true;
            return;
        }

        // wait the throttle delay *after* the previous run has finished
        timer = window.setTimeout(async () => {
            const args = latestArgs!;
            latestArgs = null;
            running = true;
            try {
                lastPromise = Promise.resolve(fn(...args));
                await lastPromise;
            } finally {
                running = false;
                scheduleNext(); // check again if something new queued while we were running
            }
        }, wait);
    };

    const wrapped = (...args: T): Promise<R> | void => {
        if (leadingCall && !running) {
            // run immediately
            leadingCall = false;
            running = true;
            lastPromise = Promise.resolve(fn(...args)).finally(() => {
                running = false;
                scheduleNext();
            });

            return lastPromise;
        } else {
            // queue the latest call
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
        running = false;
    };

    return wrapped as ((...args: T) => Promise<R>) & { cancel: () => void };
}
