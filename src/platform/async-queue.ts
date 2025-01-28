

export class AsyncQueue<InputType, ReturnType> {
    private queue: {
        item: InputType;
        resolve: (value: ReturnType | PromiseLike<ReturnType>) => void;
        reject: (reason?: any) => void;
    }[] = [];
    private processing = false;

    constructor(private worker: (task: InputType) => Promise<ReturnType>) {}

    /**
     * Queues a new task, returning a promise that resolves/rejects
     * when the worker finishes.
     */
    public add(item: InputType): Promise<ReturnType> {
        return new Promise<ReturnType>((resolve, reject) => {
            this.queue.push({ item, resolve, reject });
            if (!this.processing) {
                this.processNext();
            }
        });
    }

    private async processNext() {
        this.processing = true;
        while (this.queue.length > 0) {
            const { item, resolve, reject } = this.queue.shift()!;
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