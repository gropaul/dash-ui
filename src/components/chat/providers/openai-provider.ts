import {LanguageModel} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {FormDefinition} from '@/components/basics/input/custom-form';
import {LanguageModelProviderInterface, ValidationStatus} from './language-model-provider.interface';
import {OpenAI} from 'openai';

export interface OpenAIConfig {
    token?: string;
    model: string;
    customModel: string;
}

const openaiInitialConfig: OpenAIConfig = {
    token: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    model: 'gpt-4.1',
    customModel: '',
}

export class OpenAIProvider implements LanguageModelProviderInterface {
    private config: OpenAIConfig;

    // Predefined model options for OpenAI
    private readonly modelOptions = [
        {value: "gpt-4.1", label: "GPT-4.1"},
        {value: "gpt-4.1-nano", label: "GPT-4.1 Nano"},
        {value: "gpt-4", label: "GPT-4"},
        {value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo"},
    ];

    constructor(initialConfig: OpenAIConfig = openaiInitialConfig) {
        this.config = initialConfig;
    }

    getId(): string {
        return 'openai';
    }

    getDisplayName(): string {
        return 'OpenAI';
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
            model: isStandardModel ? this.config.model : "other",
            customModel: isStandardModel ? "" : this.config.model
        };
    }

    getModel(): LanguageModel {
        const openai = createOpenAI({
            compatibility: 'strict',
            apiKey: this.config.token,
        });
        return openai(this.config.model);
    }

    updateConfig(config: Partial<OpenAIConfig>): void {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    getConfig(): OpenAIConfig {
        return this.config;
    }

    processFormData(formData: Record<string, any>): Record<string, any> {
        return {
            token: formData.token,
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

            // Create OpenAI client
            const openai = new OpenAI({
                apiKey: this.config.token,
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

            const list = await openai.models.retrieve(selectedModelId)
            if (!list) {
                return {
                    status: 'error',
                    message: `Model ${selectedModelId} not found.`,
                };
            }
            return {
                status: 'ok',
            };
        } catch (error) {
            console.error('OpenAI provider status check failed:', error);
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}
