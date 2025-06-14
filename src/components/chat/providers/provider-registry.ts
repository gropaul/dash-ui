import {LanguageModelProviderInterface} from './language-model-provider.interface';
import {OpenAIProvider} from './openai-provider';
import {OllamaProvider} from './ollama-provider';
import {DeepseekProvider} from './deepseek-provider';

/**
 * Registry for language model providers
 * This class manages the available providers and provides methods to access them
 */
export class ProviderRegistry {
    private static instance: ProviderRegistry;
    private providers: Map<string, LanguageModelProviderInterface> = new Map();

    private constructor() {
        // Register default providers
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new OllamaProvider());
        this.registerProvider(new DeepseekProvider());
    }

    /**
     * Get the singleton instance of the provider registry
     */
    public static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    }

    /**
     * Register a new provider
     * @param provider The provider to register
     */
    public registerProvider(provider: LanguageModelProviderInterface): void {
        this.providers.set(provider.getId(), provider);
    }

    /**
     * Get a provider by ID
     * @param id The provider ID
     */
    public getProvider(id: string): LanguageModelProviderInterface | undefined {
        return this.providers.get(id);
    }

    /**
     * Get all registered providers
     */
    public getAllProviders(): LanguageModelProviderInterface[] {
        return Array.from(this.providers.values());
    }

    /**
     * Get all provider IDs
     */
    public getProviderIds(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Get initial configurations for all providers
     */

    public getInitialConfigs(): Record<string, any> {
        const configs: Record<string, any> = {};
        this.providers.forEach((provider, id) => {
            configs[id] = provider.getConfig()
        });
        return configs;
    }
}

// Export a function to get the provider registry instance
export function getProviderRegistry(): ProviderRegistry {
    return ProviderRegistry.getInstance();
}
