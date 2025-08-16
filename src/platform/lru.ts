// lru-list.ts
export class LRUList<T> {
    private items: T[] = [];
    private readonly capacity: number;

    constructor(capacity = 10) {
        if (capacity <= 0 || !Number.isFinite(capacity)) {
            throw new Error("Capacity must be a positive finite number.");
        }
        this.capacity = capacity;
    }

    /** Add an element and mark it as most recently used */
    use(item: T): void {
        // Remove if already present
        const idx = this.items.indexOf(item);
        if (idx !== -1) {
            this.items.splice(idx, 1);
        }
        // Insert at front (MRU position)
        this.items.unshift(item);
        // Trim if too long
        if (this.items.length > this.capacity) {
            this.items.pop(); // remove least recently used
        }
    }

    useAll(items: T[]): void {
        items.forEach(item => this.use(item));
    }

    /** Get current items from most → least recently used */
    getElements(): T[] {
        return [...this.items];
    }

    /** Most recently used item (or undefined if empty) */
    get mru(): T | undefined {
        return this.items[0];
    }

    /** Least recently used item (or undefined if empty) */
    get lru(): T | undefined {
        return this.items[this.items.length - 1];
    }

    clear(): void {
        this.items = [];
    }

    get size(): number {
        return this.items.length;
    }

    // if a list of items matches the order of the LRU list, return true
    matches(items: T[]): boolean {
        if (items.length !== this.items.length) {
            return false;
        }
        for (let i = 0; i < items.length; i++) {
            if (items[i] !== this.items[i]) {
                return false;
            }
        }
        return true;
    }
}