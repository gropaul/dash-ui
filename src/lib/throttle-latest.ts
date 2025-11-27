export function throttleLatest<T extends unknown[], R>(
    fn: (...args: T) => Promise<R> | R,
    wait: number
) {
    let timer: number | null = null;
    let latestArgs: T | null = null;
    let running = false;
    let lastPromise: Promise<R> | null = null;
    let lastRunTime = 0;

    const scheduleNext = () => {
        if (latestArgs == null) {
            return;
        }

        const args = latestArgs;
        latestArgs = null;

        timer = window.setTimeout(async () => {
            timer = null;
            running = true;
            try {
                lastPromise = Promise.resolve(fn(...args));
                await lastPromise;
            } finally {
                lastRunTime = Date.now();
                running = false;
                scheduleNext();
            }
        }, wait);
    };

    const wrapped = (...args: T): Promise<R> | void => {
        const now = Date.now();
        const elapsed = now - lastRunTime;

        if (!running && timer == null && elapsed >= wait) {
            // Can run immediately
            running = true;
            lastPromise = Promise.resolve(fn(...args)).finally(() => {
                lastRunTime = Date.now();
                running = false;
                scheduleNext();
            });
            return lastPromise;
        } else {
            // Queue the latest call
            latestArgs = args;

            // If nothing is scheduled and nothing is running, schedule the next run
            if (!running && timer == null) {
                const delay = wait - elapsed;
                timer = window.setTimeout(() => {
                    timer = null;
                    scheduleNext();
                }, delay);
            }

            return lastPromise ?? Promise.resolve() as Promise<R>;
        }
    };

    wrapped.cancel = () => {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
        latestArgs = null;
        running = false;
    };

    return wrapped as ((...args: T) => Promise<R>) & { cancel: () => void };
}