import {LanguageModel} from 'ai';
import {createOllama} from 'ollama-ai-provider';
import {FormDefinition} from '@/components/basics/input/custom-form';
import {LanguageModelProviderInterface, ValidationStatus} from './language-model-provider.interface';

export interface OllamaConfig {
    apiEndpoint: string;
    model: string;
    customModel: string; // Optional for custom model names
}

const ollamaInitialConfig: OllamaConfig = {
    apiEndpoint: 'http://localhost:11434/api',
    model: 'qwen3:8b',
    customModel: '',
}

export class OllamaProvider implements LanguageModelProviderInterface {
    private config: OllamaConfig;

    // Predefined model options for Ollama
    private readonly modelOptions = [
        {value: "qwen3:8b", label: "Qwen3 8B"},
        {value: "llama3:8b", label: "Llama3 8B"},
        {value: "llama3:70b", label: "Llama3 70B"},
        {value: "mistral:7b", label: "Mistral 7B"},
    ];

    constructor(initialConfig: OllamaConfig = ollamaInitialConfig) {
        this.config = initialConfig;
    }

    getId(): string {
        return 'ollama';
    }

    getDisplayName(): string {
        return 'Ollama';
    }

    getFormDefinition(): FormDefinition {
        return {
            fields: [
                {
                    key: "apiEndpoint",
                    label: "API Endpoint",
                    type: "text",
                    required: true,
                },
                {
                    key: "model",
                    label: "Model",
                    type: "select",
                    required: true,
                    selectOptions: [
                        ...this.modelOptions,
                        {value: "other", label: "Other"},
                    ],
                },
                {
                    key: "customModel",
                    label: "Custom Model Name",
                    type: "text",
                    required: true,
                    shouldBeVisible: (formData) => formData.model === "other",
                },
            ],
        };
    }

    getInitialFormData(): Record<string, any> {
        const isStandardModel = this.modelOptions.some(option => option.value === this.config.model);
        return {
            apiEndpoint: this.config.apiEndpoint,
            model: isStandardModel ? this.config.model : "other",
            customModel: isStandardModel ? "" : this.config.model
        };
    }

    getModel(): LanguageModel {
        const ollama = createOllama({
            baseURL: this.config.apiEndpoint,
        });
        return ollama(this.config.model, {
            simulateStreaming: true
        });
    }

    updateConfig(config: Partial<OllamaConfig>): void {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    getConfig(): OllamaConfig {
        return this.config;
    }

    processFormData(formData: Record<string, any>): Record<string, any> {
        return {
            apiEndpoint: formData.apiEndpoint,
            model: formData.model === "other" ? formData.customModel : formData.model,
        };
    }

    async getStatus(): Promise<ValidationStatus> {
        try {
            // Check if the API endpoint is available
            if (!this.config.apiEndpoint) {
                return {
                    status: 'error',
                    message: 'Ollama API endpoint is not defined.',
                }
            }

            // Make a simple API call to check if the connection works
            const tagsResponse = await fetch(`${this.config.apiEndpoint}/tags`);

            if (!tagsResponse.ok) {
                return {
                    status: 'error',
                    message: `Unable to reach Ollama API at ${this.config.apiEndpoint}. Status: ${tagsResponse.status} ${tagsResponse.statusText}`,
                }
            }

            const modelId = this.config.model === 'other' ? this.config.customModel : this.config.model;

            if (!modelId) {
                return {
                    status: 'error',
                    message: 'Model ID is not set.',
                }
            }

            const modelResponse = await fetch(`${this.config.apiEndpoint}/show`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({name: modelId}),
            });



            if (!modelResponse.ok) {
                const availableModels = await tagsResponse.json()
                const availableModelsText = availableModels['models'].map((model: any) => model.name).join(', ');
                return {
                    status: 'error',
                    message: `Problem with model ${modelId}: ${modelResponse.statusText} Available models: ${availableModelsText}. Run 'ollama pull ${modelId}' to download the model.`,
                }
            }
            return {
                status: 'ok',
                message: 'Ollama provider is working correctly.',
            }
        } catch (error) {
            console.error('Ollama provider status check failed:', error);
            return {
                status: 'error',
                message: `Ollama provider status check failed: ${error instanceof Error ? error.message : String(error)}`,
            }
        }
    }
}
