import React, {FC, ReactNode, useEffect, useState} from "react";
import {Eye, EyeOff} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Checkbox} from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {cn} from "@/lib/utils";

export interface FormDefinition {
    fields: FormField[];
}

export type FormFieldTypes = 'text' | 'number' | 'boolean' | 'select' | 'password' | 'custom' | 'description' | 'warning';

export const INFO_ONLY_TYPES: FormFieldTypes[]  = ['description', 'warning'];

export interface FormFieldSelectOption {
    value: string;
    label: string;
}

export interface FormFieldCustomProps<T = any> {
    formData: T;
    onChange?: <K extends keyof T>(key: K, value: T[K]) => void;
    hasError: boolean;
}

export interface FormFieldCustom<T = any> {
    render: (props: FormFieldCustomProps<T>) => ReactNode;
}

export interface FormField<T = any> {
    key: string;
    label?: string;
    required?: boolean; // default is false
    type: FormFieldTypes;
    selectOptions?: FormFieldSelectOption[];
    customField?: FormFieldCustom<T>;
    validation?: (rawValue: string) => string | undefined;
    shouldBeVisible?: (formData: { [key: string]: any }) => boolean;
}

export interface CustomFormProps {
    initialFormData: { [key: string]: string | number | boolean | undefined },
    formDefinition: FormDefinition,
    onUpdate?: (formData: any, valid: boolean) => void,
    onSubmit: (formData: any) => void,
    buttonBarLeading?: ReactNode,
    onCancel?: () => void,
    formWrapper?: React.FC<{ children: React.ReactElement }>
    className?: string
}

export const FormFields: FC<{
    formDefinition: FormDefinition, formData: {
        [key: string]: any
    }, handleChange: (key: string, value: any) => void, errors: { [key: string]: string | undefined }
}> = ({errors, handleChange, formData, formDefinition}) => {
    return <div className="space-y-4">
        {formDefinition.fields.map((field) => {
            const isVisible = field.shouldBeVisible ? field.shouldBeVisible(formData) : true;
            if (!isVisible) return null;
            const requiredString = field.required ? '*' : '';
            const inlineLabel = field.type === 'boolean';
            const classWrapper = inlineLabel ? 'flex items-center space-x-2' : '';

            const labelVisible = INFO_ONLY_TYPES.includes(field.type) || !field.label  ? 'hidden' : 'block'

            return (
                <div key={field.key} className={`${classWrapper}`}>
                    <label className={cn("text-sm font-medium text-gray-700", labelVisible)}>
                        {field.label + requiredString}
                    </label>
                    {field.type === 'description' && (
                        <span className="text-sm text-gray-500">{field.label}</span>
                    )}
                    {field.type === 'warning' && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded">
                            <span className="text-sm text-yellow-700">{field.label}</span>
                        </div>
                    )}
                    {field.type === 'text' && (
                        <Input
                            type="text"
                            value={formData[field.key]}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                    )}
                    {field.type === 'number' && (
                        <Input
                            type="number"
                            value={formData[field.key]}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                    )}
                    {field.type === 'boolean' && (
                        <Checkbox
                            checked={formData[field.key]}
                            onCheckedChange={(checked) => handleChange(field.key, checked)}
                        />
                    )}

                    {field.type === 'select' && (
                        <Select
                            onValueChange={(value) => handleChange(field.key, value)}
                            value={formData[field.key]}
                        >

                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                {field.selectOptions?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {field.type === 'password' && (
                        <PasswordField
                            value={formData[field.key]}
                            onChange={(value) => handleChange(field.key, value)}
                        />
                    )}
                    {field.type === 'custom' && field.customField && (
                        field.customField.render({
                            formData,
                            onChange: (value: any) => handleChange(field.key, value),
                            hasError: !!errors[field.key],
                        })
                    )}
                    {errors[field.key] && (
                        <p className="text-sm text-red-600">{errors[field.key]}</p>
                    )}
                </div>
            );
        })}
    </div>
}

export function CustomForm({
                               formDefinition,
                               onSubmit,
                               onCancel,
                               onUpdate,
                               initialFormData,
                                buttonBarLeading,
                               formWrapper,
                               className
                           }: CustomFormProps) {
    const [formData, setFormData] = useState<{ [key: string]: any }>(
        formDefinition.fields.reduce((acc, field) => {
            acc[field.key] = initialFormData[field.key] || '';
            return acc;
        }, {} as { [key: string]: any })
    );

    // update if initialFormData changes
    useEffect(() => {
        setFormData((prevData) => {
            const newFormData = {...prevData};
            formDefinition.fields.forEach((field) => {
                newFormData[field.key] = initialFormData[field.key] || '';
            });
            return newFormData;
        });
    }, [initialFormData]);

    const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});

    const checkErrors = () => {
        const newErrors: { [key: string]: string | undefined } = {};
        formDefinition.fields.forEach((field) => {
            if (field.shouldBeVisible && !field.shouldBeVisible(formData)) {
                return;
            }
            const error = validateField(field, formData[field.key]);
            if (error) {
                newErrors[field.key] = error;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length > 0;
    };

    const handleChange = (key: string, value: any) => {
        setFormData((prevData) => ({...prevData, [key]: value}));
        const hasErrors = checkErrors();
        onUpdate && onUpdate(formData, !hasErrors);
    };

    const validateField = (field: FormField, value: any) => {
        if (field.required && (value === undefined || value === '')) {
            return 'This field is required';
        }
        if (field.validation) {
            return field.validation(value);
        }
        return undefined;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const hasErrors = checkErrors();
        if (!hasErrors) {
            onSubmit(formData);
        }
    };

    return (
        // We set autoComplete=off to stop the browser opening the "save password" dialog for the token password field
        <form onSubmit={handleSubmit} className={className} autoComplete="off">
            {
                formWrapper && formDefinition.fields.length ? formWrapper({
                    children: (
                        <FormFields formDefinition={formDefinition} formData={formData} handleChange={handleChange}
                                    errors={errors}/>)
                }) : (<FormFields formDefinition={formDefinition} formData={formData} handleChange={handleChange}
                                  errors={errors}/>)
            }
            <div
                className={`flex items-center space-x-2 ${
                    onCancel ? 'justify-between' : 'justify-end'
                }`}
            >
                <div>{buttonBarLeading}</div>
                <div className="flex-1"/>
                <div>
                    {onCancel && (
                        <Button variant="secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit">Save</Button>
                </div>
            </div>

        </form>
    );
}

interface PasswordFieldProps {
    value: string;
    onChange: (value: string) => void;
}

export function PasswordField({value, onChange}: PasswordFieldProps) {
    const [showPassword, setShowPassword] = useState(false);
    const toggleShowPassword = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <div className="relative">
            <Input
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full border-b border-gray-300 focus:border-indigo-500 focus:ring-0 sm:text-sm"
            />
            <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute inset-y-0 right-4 pr-0.5 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
            >
                {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
        </div>
    );
}
