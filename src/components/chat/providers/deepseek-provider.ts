import {LanguageModel} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {FormDefinition} from '@/components/basics/input/custom-form';
import {LanguageModelProviderInterface, ValidationStatus} from './language-model-provider.interface';
import {OpenAI} from 'openai';

export interface DeepseekConfig {
    token?: string;
    model: string;
    customModel: string;
    apiEndpoint: string;
}

const deepseekInitialConfig: DeepseekConfig = {
    token: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    model: 'deepseek-chat',
    customModel: '',
    apiEndpoint: 'https://api.deepseek.com/v1',
}

export class DeepseekProvider implements LanguageModelProviderInterface {
    private config: DeepseekConfig;

    // Predefined model options for Deepseek
    private readonly modelOptions = [
        {value: "deepseek-chat", label: "Deepseek Chat"},
        {value: "deepseek-reasoner", label: "Deepseek Reasoner"},
    ];

    constructor(initialConfig: DeepseekConfig = deepseekInitialConfig) {
        this.config = initialConfig;
    }

    getId(): string {
        return 'deepseek';
    }

    getDisplayName(): string {
        return 'Deepseek';
    }

    getFormDefinition(): FormDefinition {
        return {
            fields: [
                {
                    key: "token",
                    label: "API Token",
                    type: "password",
                    required: true,
                },
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
            token: this.config.token,
            apiEndpoint: this.config.apiEndpoint,
            model: isStandardModel ? this.config.model : "other",
            customModel: isStandardModel ? "" : this.config.model
        };
    }

    getModel(): LanguageModel {
        const deepseek = createOpenAI({
            compatibility: 'strict',
            apiKey: this.config.token,
            baseURL: this.config.apiEndpoint,
        });
        return deepseek(this.config.model);
    }

    updateConfig(config: Partial<DeepseekConfig>): void {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    getConfig(): DeepseekConfig {
        return this.config;
    }

    processFormData(formData: Record<string, any>): Record<string, any> {
        return {
            token: formData.token,
            apiEndpoint: formData.apiEndpoint,
            model: formData.model === "other" ? formData.customModel : formData.model,
        };
    }

    async getStatus(): Promise<ValidationStatus> {
        try {
            // Check if token is available
            if (!this.config.token) {
                return {
                    status: 'error',
                    message: 'API token is not set.',
                }
            }

            // Check if API endpoint is available
            if (!this.config.apiEndpoint) {
                return {
                    status: 'error',
                    message: 'API endpoint is not set.',
                }
            }

            // Create OpenAI client (Deepseek uses OpenAI-compatible API)
            const openai = new OpenAI({
                apiKey: this.config.token,
                baseURL: this.config.apiEndpoint,
                dangerouslyAllowBrowser: true, // Allow browser usage
            });

            // Make a simple API call to check if the connection works
            const selectedModelId = this.config.model === 'other' ? this.config.customModel : this.config.model;

            if (!selectedModelId) {
                return {
                    status: 'error',
                    message: 'Model is not set.',
                };
            }

            // Try to list models instead of retrieving a specific one
            // as Deepseek might not support the retrieve endpoint
            const list = await openai.models.list();
            
            // Check if the selected model is in the list
            const modelExists = list.data.some(model => model.id === selectedModelId);
            
            if (!modelExists) {
                return {
                    status: 'warning',
                    message: `Model ${selectedModelId} not found in available models. It might still work if it's a valid model ID.`,
                };
            }
            
            return {
                status: 'ok',
                message: 'Deepseek provider is working correctly.',
            };
        } catch (error) {
            console.error('Deepseek provider status check failed:', error);
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}