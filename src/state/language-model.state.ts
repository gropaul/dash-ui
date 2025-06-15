import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {LanguageModel} from 'ai';
import {getProviderRegistry, ProviderRegistry, ValidationStatus} from "@/components/chat/providers";

// Re-export the provider types for backward compatibility
export type LanguageModelProvider = string;


export interface LanguageModelState {
    activeProviderId: LanguageModelProvider;
    providerConfigs: Record<string, Record<string, any>>;
}

export interface LanguageModelActions {
    setActiveProvider: (providerId: LanguageModelProvider) => void;
    updateProviderConfig: (providerId: string, config: Record<string, any>) => void;
    getLanguageModel: () => LanguageModel;
    getCurrentProviderStatus: () => Promise<ValidationStatus>;
    getProviderStatus: (providerId?: string) => Promise<ValidationStatus>;
}

// Initialize the registry with default providers
const registry = getProviderRegistry();

export const useLanguageModelState = create<LanguageModelState & LanguageModelActions>()(
    persist(
        (set, get) => ({
            activeProviderId: 'openai',
            providerConfigs: ProviderRegistry.getInstance().getInitialConfigs(),
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
        }),
        {
            name: 'language-model-settings',
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: (state) => {
                return (restoredState, error) => {
                    if (error) {
                        console.error('Error rehydrating language model state:', error);
                        return;
                    }

                    if (restoredState) {
                        // Update provider registry with the loaded configurations
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
