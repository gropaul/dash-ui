import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ParameterType } from "@/model/relation-view-state/parameters";
import { cn } from "@/lib/utils";

const PARAMETER_TYPES: { value: ParameterType; label: string }[] = [
    { value: 'string', label: 'string' },
    { value: 'integer', label: 'integer' },
    { value: 'float', label: 'float' },
    { value: 'date', label: 'date' },
    { value: 'boolean', label: 'boolean' },
];

interface ParameterTypeSelectorProps {
    value: ParameterType;
    onChange: (value: ParameterType) => void;
    disabled?: boolean;
    className?: string;
}

export function ParameterTypeSelector({ value, onChange, disabled, className }: ParameterTypeSelectorProps) {
    return (
        <Select value={value} onValueChange={(v) => onChange(v as ParameterType)} disabled={disabled}>
            <SelectTrigger className={cn("w-24 h-7 text-xs", className)}>
                <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
                {PARAMETER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                        {type.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
