import { LanguageModel } from 'ai';
import { FormDefinition } from '@/components/basics/input/custom-form';


export interface ValidationStatus {
    status: 'ok' | 'warning' | 'error';
    message?: string;
}

/**
 * Interface for language model providers
 * This interface defines the common functionality that all language model providers must implement
 */
export interface LanguageModelProviderInterface {
  /**
   * Get the provider's unique identifier
   */
  getId(): string;

  /**
   * Get the display name of the provider
   */
  getDisplayName(): string;

  /**
   * Get the form definition for configuring the provider
   */
  getFormDefinition(): FormDefinition;

  /**
   * Get the initial form data for the provider
   */
  getInitialFormData(): Record<string, any>;

  /**
   * Get the language model instance
   */
  getModel(): LanguageModel;

  /**
   * Update the provider configuration
   * @param config The new configuration
   */
  updateConfig(config: Record<string, any>): void;

  /**
   * Get the current configuration
   */
  getConfig(): Record<string, any>;

  /**
   * Process form data before saving
   * @param formData The form data to process
   */
  processFormData(formData: Record<string, any>): Record<string, any>;

  /**
   * Check if the provider is working correctly
   * @returns A promise that resolves to a boolean indicating whether the provider is working
   */
  getStatus(): Promise<ValidationStatus>;
}
