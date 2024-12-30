

// Custom storage object
import {StateStorage} from "zustand/middleware";

// singleton with in-memory storage
const storage = new Map<string, string>()

// templated storage object
export const mockStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        console.log(name, 'has been retrieved')
        return storage.get(name) || null

    },
    setItem: async (name: string, value: string): Promise<void> => {
        console.log(name, 'with value', value, 'has been saved')
        storage.set(name, value)
    },
    removeItem: async (name: string): Promise<void> => {
        console.log(name, 'has been deleted')
        storage.delete(name)
    },
}