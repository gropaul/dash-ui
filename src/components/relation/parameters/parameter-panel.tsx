import { ParameterRow } from "./parameter-row";
import { ParameterDefinition, ParametersState } from "@/model/relation-view-state/parameters";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParameterPanelProps {
    parametersState: ParametersState;
    onUpdateParameters: (parameters: ParameterDefinition[]) => void;
}

export function ParameterPanel({ parametersState, onUpdateParameters }: ParameterPanelProps) {
    const parameters = parametersState?.parameters ?? [];

    function handleUpdateParameter(name: string, updates: Partial<ParameterDefinition>) {
        const updatedParams = parameters.map(p =>
            p.name === name ? { ...p, ...updates } : p
        );
        onUpdateParameters(updatedParams);
    }

    if (!parametersState?.panelState?.show) {
        return null;
    }

    if (parameters.length === 0) {
        return null;
    }

    return (
        <div className="border-b bg-background">
            <ScrollArea className="max-h-48">
                <div>
                    {parameters.map((param) => (
                        <ParameterRow
                            key={param.name}
                            parameter={param}
                            onUpdate={(updates) => handleUpdateParameter(param.name, updates)}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
