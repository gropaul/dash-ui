import React, {useEffect, useState} from "react";
import {CustomForm} from "@/components/basics/input/custom-form";
import {LanguageModelProvider, useLanguageModelState} from "@/state/language-model.state";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {toast} from "sonner";
import {FormWrapper} from "@/components/connections/connection-config";
import {getProviderRegistry, ValidationStatus} from "@/components/chat/providers";
import {AgentQueryMode} from "@/state/language-model.state";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";


export function LanguageModelContent() {
    const {
        activeProviderId,
        providerConfigs,
        setActiveProvider,
        updateProviderConfig
    } = useLanguageModelState();

    const [currentTab, setCurrentTab] = useState<LanguageModelProvider>(activeProviderId);

    // Get all available providers from the registry
    const providerRegistry = getProviderRegistry();
    const providers = providerRegistry.getAllProviders();

    useEffect(() => {
        setActiveProvider(currentTab);
    }, [currentTab, setActiveProvider]);

    const validateFormData = async (formData: { [key: string]: any }, providerId: string): Promise<ValidationStatus> => {
        const provider = providerRegistry.getProvider(providerId);
        if (provider) {
            const processedData = provider.processFormData(formData);
            updateProviderConfig(providerId, processedData);
            return await provider.getStatus();

        }
        return { status: 'error', message: 'Provider not found' };
    }
    // Handler for form submission
    const handleProviderSubmit = async (providerId: string, formData: any) => {
        const provider = providerRegistry.getProvider(providerId);
        if (provider) {
            const processedData = provider.processFormData(formData);
            updateProviderConfig(providerId, processedData);
            const status = await provider.getStatus();
            if (status.status === 'ok') {
                toast.success(`${provider.getDisplayName()} settings saved successfully!`);
            } else {
                toast.error(`Error saving ${provider.getDisplayName()} settings: ${status.message || 'Unknown error'}`);
            }
        }
    };

    const {settings, updateSettings} = useLanguageModelState();

    return (
        <div className="p-4">
            <h5 className="text-lg font-bold">Assistant Settings</h5>
            <p className="text-muted-foreground mb-2">
                You can bring your own language model to Dash. Select a provider below to configure it.
            </p>

            <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">Query Permissions</label>
                <Select value={settings.queryMode} onValueChange={(value) => updateSettings({ queryMode: value as AgentQueryMode })}>
                    <SelectTrigger className="w-48">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Queries</SelectItem>
                        <SelectItem value="read-only">Read-Only</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                    When set to read-only, the assistant can only run SELECT queries and cannot modify data.
                </p>
            </div>

            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as LanguageModelProvider)}>
                <TabsList className="mb-1">
                    {providers.map(provider => (
                        <TabsTrigger key={provider.getId()} value={provider.getId()}>
                            {provider.getDisplayName()}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {providers.map(provider => {
                    const providerId = provider.getId();
                    const config = providerConfigs[providerId] || {};

                    // Get form definition and initial data from the provider
                    const formDefinition = provider.getFormDefinition();

                    // Update the provider with the current config
                    provider.updateConfig(config);

                    // Get initial form data from the provider
                    const initialFormData = provider.getInitialFormData();

                    return (
                        <TabsContent key={providerId} value={providerId} className="space-y-4">
                            <CustomForm
                                validateSubmit={(formData) => validateFormData(formData, providerId)}
                                formWrapper={FormWrapper}
                                initialFormData={initialFormData}
                                formDefinition={formDefinition}
                                onSubmit={(formData) => handleProviderSubmit(providerId, formData)}
                                submitButtonLabel={`Check and Save ${provider.getDisplayName()} Settings`}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}
