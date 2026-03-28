import {LanguageModel} from 'ai';
import {webLLM} from '@browser-ai/web-llm';
import {FormDefinition} from '@/components/basics/input/custom-form';
import {LanguageModelProviderInterface, ValidationStatus} from './language-model-provider.interface';

export interface WebLLMConfig {
    model: string;
    customModel: string;
}

const webllmInitialConfig: WebLLMConfig = {
    model: 'Qwen3-4B-q4f32_1-MLC',
    customModel: '',
}

export class WebLLMProvider implements LanguageModelProviderInterface {
    private config: WebLLMConfig;

    private readonly modelOptions = [
        {value: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B Instruct"},
        {value: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B Instruct"},
        {value: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 Mini Instruct"},
        {value: "Qwen3-1.7B-q4f32_1-MLC", label: "Qwen 3 1.7B"},
        {value: "Qwen3-4B-q4f32_1-MLC", label: "Qwen 3 4B"},
        {value: "SmolLM2-1.7B-Instruct-q4f16_1-MLC", label: "SmolLM2 1.7B Instruct"},
    ];

    constructor(initialConfig: WebLLMConfig = webllmInitialConfig) {
        this.config = initialConfig;
    }

    getId(): string {
        return 'webllm';
    }

    getDisplayName(): string {
        return 'Browser AI (WebLLM)';
    }

    getFormDefinition(): FormDefinition {
        return {
            fields: [
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
                    label: "Custom Model ID",
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
            model: isStandardModel ? this.config.model : "other",
            customModel: isStandardModel ? "" : this.config.model,
        };
    }

    getModel(): LanguageModel {
        const modelId = this.config.model === 'other' ? this.config.customModel : this.config.model;
        return webLLM(modelId) as unknown as LanguageModel;
    }

    updateConfig(config: Partial<WebLLMConfig>): void {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    getConfig(): WebLLMConfig {
        return this.config;
    }

    processFormData(formData: Record<string, any>): Record<string, any> {
        return {
            model: formData.model === "other" ? formData.customModel : formData.model,
        };
    }

    async prepareModel(onProgress: (progress: number) => void): Promise<void> {
        const modelId = this.config.model === 'other' ? this.config.customModel : this.config.model;
        const model = webLLM(modelId);
        const availability = await model.availability();

        if (availability === 'unavailable') {
            throw new Error('WebGPU is not supported in this browser.');
        }

        if (availability === 'downloadable') {
            await model.createSessionWithProgress(onProgress);
        }
    }

    async getStatus(): Promise<ValidationStatus> {
        try {
            const modelId = this.config.model === 'other' ? this.config.customModel : this.config.model;

            if (!modelId) {
                return {
                    status: 'error',
                    message: 'Model is not set.',
                };
            }

            const model = webLLM(modelId);
            const availability = await model.availability();

            if (availability === 'unavailable') {
                return {
                    status: 'error',
                    message: 'WebGPU is not supported in this browser. WebLLM requires WebGPU to run models locally.',
                };
            }

            if (availability === 'downloadable') {
                return {
                    status: 'warning',
                    message: `Model "${modelId}" needs to be downloaded first. It will be downloaded on first use.`,
                };
            }

            return {
                status: 'ok',
                message: `Model "${modelId}" is ready.`,
            };
        } catch (error) {
            console.error('WebLLM provider status check failed:', error);
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}