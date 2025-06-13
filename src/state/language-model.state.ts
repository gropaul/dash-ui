import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {LanguageModel} from 'ai';
import {getProviderRegistry, ProviderRegistry} from '@/providers/provider-registry';
import { OpenAIProvider } from '@/providers/openai-provider';
import { OllamaProvider } from '@/providers/ollama-provider';
import {ValidationStatus} from "@/providers";

// Re-export the provider types for backward compatibility
export type LanguageModelProvider = string;
export type { OpenAIConfig } from '@/providers/openai-provider';
export type { OllamaConfig } from '@/providers/ollama-provider';

export interface LanguageModelState {
    activeProviderId: LanguageModelProvider;
    providerConfigs: Record<string, Record<string, any>>;
}

export interface LanguageModelActions {
    setActiveProvider: (providerId: LanguageModelProvider) => void;
    updateProviderConfig: (providerId: string, config: Record<string, any>) => void;
    getLanguageModel: () => LanguageModel;
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
        }
    )
);
