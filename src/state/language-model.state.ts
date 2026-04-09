import {create} from 'zustand';
import {createJSONStorage, persist, StateStorage} from 'zustand/middleware';
import {LanguageModel} from 'ai';
import {getProviderRegistry, ProviderRegistry, ValidationStatus} from "@/components/chat/providers";
import {XorDecrypt, XorEncrypt} from "@/lib/obfuscation";

// Re-export the provider types for backward compatibility
export type LanguageModelProvider = string;


const LOCALE_STORAGE_OBFUSCATION_KEY = 'language-model-settings-key';

export const obfuscatedStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        const item = localStorage.getItem(name);
        return item ? XorDecrypt(LOCALE_STORAGE_OBFUSCATION_KEY, item) : null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        const obfuscatedValue = XorEncrypt(LOCALE_STORAGE_OBFUSCATION_KEY, value);
        localStorage.setItem(name, obfuscatedValue);

    },
    removeItem: async (name: string): Promise<void> => {
        console.log(name, 'has been deleted')
        localStorage.removeItem(name);
    },
};

export type AgentQueryMode = 'read-only' | 'all';

export interface AgentSettings {
    queryMode: AgentQueryMode;
}

export interface LanguageModelState {
    activeProviderId: LanguageModelProvider;
    providerConfigs: Record<string, Record<string, any>>;
    settings: AgentSettings;
}

export interface LanguageModelActions {
    setActiveProvider: (providerId: LanguageModelProvider) => void;
    updateProviderConfig: (providerId: string, config: Record<string, any>) => void;
    updateSettings: (settings: Partial<AgentSettings>) => void;
    getLanguageModel: () => LanguageModel;
    getCurrentProviderStatus: () => Promise<ValidationStatus>;
    getProviderStatus: (providerId?: string) => Promise<ValidationStatus>;
    isReadOnly: () => boolean;
}

// Initialize the registry with default providers
const registry = getProviderRegistry();

export const useLanguageModelState = create<LanguageModelState & LanguageModelActions>()(
    persist(
        (set, get) => ({
            activeProviderId: 'openai',
            providerConfigs: ProviderRegistry.getInstance().getInitialConfigs(),
            settings: { queryMode: 'read-only' },
            setActiveProvider: (providerId) => {
                set({activeProviderId: providerId});
            },
            updateProviderConfig: (providerId, config) => {
                set((state) => ({
                    providerConfigs: {
                        ...state.providerConfigs,
                        [providerId]: {
                            ...state.providerConfigs[providerId],
                            ...config,
                        },
                    },
                }));

                // Update the provider instance with the new config
                const provider = registry.getProvider(providerId);
                if (provider) {
                    provider.updateConfig(config);
                }
            },
            updateSettings: (settings) => {
                set((state) => ({
                    settings: { ...state.settings, ...settings },
                }));
            },
            getLanguageModel: () => {
                const state = get();
                const provider = registry.getProvider(state.activeProviderId);

                if (!provider) {
                    throw new Error(`Provider ${state.activeProviderId} not found`);
                }

                return provider.getModel();
            },
            getCurrentProviderStatus: async () => {
                return get().getProviderStatus(get().activeProviderId);
            },
            getProviderStatus: async (providerId?: string) => {
                const state = get();
                const id = providerId || state.activeProviderId;
                const provider = registry.getProvider(id);

                if (!provider) {
                    throw new Error(`Provider ${id} not found`);
                }

                return await provider.getStatus();
            },
            isReadOnly: () => {
                return get().settings.queryMode === 'read-only';
            },
        }),
        {
            name: 'language-model-settings',
            storage: createJSONStorage(() => obfuscatedStorage),
            onRehydrateStorage: (state) => {
                return (restoredState, error) => {
                    if (error) {
                        console.error('Error rehydrating language model state:', error);
                        return;
                    }

                    if (restoredState) {
                        // Update the provider registry with the loaded configurations
                        const registry = getProviderRegistry();
                        Object.entries(restoredState.providerConfigs).forEach(([providerId, config]) => {
                            const provider = registry.getProvider(providerId);
                            if (provider) {
                                provider.updateConfig(config);
                            }
                        });
                    }
                };
            },
        }
    )
);
