export class AsyncQueue<InputType, ReturnType> {
    private queue: {
        item: InputType;
        resolve: (value: ReturnType | PromiseLike<ReturnType>) => void;
        reject: (reason?: any) => void;
    }[] = [];
    private processing = false;

    clear: () => void = () => {
        this.queue = [];
    }

    constructor(private worker: (task: InputType) => Promise<ReturnType>) {
    }

    /**
     * Queues a new task, returning a promise that resolves/rejects
     * when the worker finishes.
     */
    public add(item: InputType): Promise<ReturnType> {
        return new Promise<ReturnType>((resolve, reject) => {
            this.queue.push({item, resolve, reject});
            if (!this.processing) {
                this.processNext();
            }
        });
    }

    public length(): number {
        return this.queue.length;
    }

    /**
     *
     * @private
     */
    cancelAll(errorMessage: string): void {
        const error = new Error(errorMessage);
        for (const { reject } of this.queue) {
            try {
                reject(error);
            } catch (_) {
                // ignore to ensure all rejections proceed
            }
        }
        this.queue = [];
        this.processing = false;
    }


    private async processNext() {
        this.processing = true;
        while (this.queue.length > 0) {
            const {item, resolve, reject} = this.queue.shift()!;
            try {
                const result = await this.worker(item);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
        this.processing = false;
    }
}