import {ReactNode, useState} from "react";
import {Eye, EyeOff} from "lucide-react";
import {ButtonSelect} from "@/components/basics/input/button-select";

export interface FormDefinition {
    fields: FormField[];
}

export type FormFieldTypes = 'text' | 'number' | 'boolean' | 'select' | 'password' | 'custom';

export interface FormFieldSelectOption {
    value: string;
    label: string;
}

export interface FormFieldCustomProps {
    formData: { [key: string]: any };
    onChange?: (key: string, value: any) => void;
    hasError: boolean;
}

export interface FormFieldCustom {
    render: (props: FormFieldCustomProps) => ReactNode;
}

export interface FormField {
    key: string;
    label: string;
    required: boolean;
    type: FormFieldTypes;
    selectOptions?: FormFieldSelectOption[];
    customField?: FormFieldCustom;
    validation?: (rawValue: string) => string | undefined;
    condition?: (formData: { [key: string]: any }) => boolean;
}

export interface CustomFormProps {
    initialFormData: { [key: string]: string | number | boolean | undefined };
    formDefinition: FormDefinition;
    onUpdate?: (formData: any, valid: boolean) => void;
    onSubmit: (formData: any) => void;
    onCancel?: () => void;
}

export function CustomForm({formDefinition, onSubmit, onCancel, onUpdate, initialFormData}: CustomFormProps) {
    const [formData, setFormData] = useState<{ [key: string]: any }>(
        formDefinition.fields.reduce((acc, field) => {
            acc[field.key] = initialFormData[field.key] || '';
            return acc;
        }, {} as { [key: string]: any })
    );

    const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});

    const checkErrors = () => {
        const newErrors: { [key: string]: string | undefined } = {};

        formDefinition.fields.forEach((field) => {
            // check if the field is visible
            if (field.condition && !field.condition(formData)) {
                return;
            }
            const error = validateField(field, formData[field.key]);
            if (error) {
                newErrors[field.key] = error;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length > 0;
    }

    const handleChange = (key: string, value: any) => {
        setFormData((prevData) => ({...prevData, [key]: value}));
        const has_errors = checkErrors();
        onUpdate && onUpdate(formData, !has_errors);
    };

    const validateField = (field: FormField, value: any) => {
        if (field.required && !value) {
            return 'This field is required';
        }
        if (field.validation) {
            return field.validation(value);
        }
        return undefined;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const has_errors = checkErrors();

        if (!has_errors) {
            onSubmit(formData);
        }
    };

    // whether to have the input and the label in the same line


    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {formDefinition.fields.map((field) => {
                const isVisible = field.condition ? field.condition(formData) : true;
                if (!isVisible) return null;

                const requiredString = field.required ? '*' : '';
                const inlineLabel = field.type === 'boolean';
                const classWrapper = inlineLabel ? 'flex items-center space-x-2' : '';
                return (
                    <div key={field.key} className={`${classWrapper}`}>
                        <label className="block text-sm font-medium text-gray-700">
                            {field.label + requiredString}
                        </label>
                        {field.type === 'text' && (
                            <input
                                type="text"
                                value={formData[field.key]}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                className="block w-full border-b border-gray-300 focus:border-indigo-500 focus:ring-0 sm:text-sm"
                            />
                        )}
                        {field.type === 'number' && (
                            <input
                                type="number"
                                value={formData[field.key]}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                className="block w-full border-b border-gray-300 focus:border-indigo-500 focus:ring-0 sm:text-sm"
                            />
                        )}
                        {field.type === 'boolean' && (
                            <input
                                type="checkbox"
                                checked={formData[field.key]}
                                onChange={(e) => handleChange(field.key, e.target.checked)}
                                className="h-4 w-4 border-b border-gray-300 text-indigo-600 focus:ring-0"
                            />
                        )}
                        {field.type === 'select' && (
                            <ButtonSelect
                                defaultValue={formData[field.key].toString()}
                                onChange={(value) => handleChange(field.key, value)}
                                className="focus:border-indigo-500 focus:ring-0 sm:text-sm w-full"
                                options={field.selectOptions || []}
                            />
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
                            <p className="mt-1 text-sm text-red-600">{errors[field.key]}</p>
                        )}
                    </div>
                );
            })}
            {onCancel && (
                <button
                    onClick={onCancel}
                    className="mr-4 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cancel
                </button>
            )}
            <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Save
            </button>
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
            <input
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full border-b border-gray-300 focus:border-indigo-500 focus:ring-0 sm:text-sm"
            />
            <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute inset-y-0 right-0 pr-0.5 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
            >
                {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
        </div>
    );
}