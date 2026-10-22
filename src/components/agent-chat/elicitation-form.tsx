'use client';

import {useState} from "react";
import type {CreateElicitationRequest, CreateElicitationResponse, ElicitationContentValue} from "@agentclientprotocol/sdk";
import {MessageCircleQuestion} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

interface ChoiceOption {
    value: string;
    label: string;
    description?: string;
}

// A flat form field, normalised from the elicitation's JSON Schema property.
type Field =
    | { key: string; type: 'choice'; label: string; description?: string; required: boolean; multiple: boolean; options: ChoiceOption[] }
    | { key: string; type: 'text' | 'number' | 'integer'; label: string; description?: string; required: boolean }
    | { key: string; type: 'boolean'; label: string; description?: string; required: boolean };

type Value = string | string[] | boolean;

interface EnumLike {
    const: string;
    title?: string;
    description?: string | null;
}

function toOptions(property: Record<string, any>): ChoiceOption[] {
    const titled: EnumLike[] | undefined = property.oneOf ?? property.anyOf;
    if (titled) return titled.map((o) => ({value: o.const, label: o.title ?? o.const, description: o.description ?? undefined}));
    return ((property.enum ?? []) as string[]).map((v) => ({value: v, label: v}));
}

export function toFields(request: CreateElicitationRequest): Field[] {
    const schema = (request as { requestedSchema?: { properties?: Record<string, any>; required?: string[] | null } }).requestedSchema;
    const required = new Set(schema?.required ?? []);
    return Object.entries(schema?.properties ?? {}).map(([key, p]) => {
        const base = {key, label: p.title ?? key, description: p.description ?? undefined, required: required.has(key)};
        if (p.type === 'array') return {...base, type: 'choice', multiple: true, options: toOptions(p.items ?? {})};
        if (p.type === 'string' && (p.oneOf || p.enum)) return {...base, type: 'choice', multiple: false, options: toOptions(p)};
        if (p.type === 'boolean') return {...base, type: 'boolean'};
        if (p.type === 'number' || p.type === 'integer') return {...base, type: p.type};
        return {...base, type: 'text'};
    });
}

function initialValue(field: Field): Value {
    if (field.type === 'boolean') return false;
    if (field.type === 'choice' && field.multiple) return [];
    return '';
}

function isEmpty(value: Value): boolean {
    return value === '' || (Array.isArray(value) && value.length === 0);
}

// Returns the content to send, or an error per field.
export function collect(fields: Field[], values: Record<string, Value>): { content: Record<string, ElicitationContentValue> } | { errors: Record<string, string> } {
    const content: Record<string, ElicitationContentValue> = {};
    const errors: Record<string, string> = {};
    for (const field of fields) {
        const value = values[field.key];
        if (isEmpty(value)) {
            if (field.required) errors[field.key] = 'Required';
            continue;
        }
        if (field.type === 'number' || field.type === 'integer') {
            const n = Number(value);
            if (Number.isNaN(n) || (field.type === 'integer' && !Number.isInteger(n))) {
                errors[field.key] = field.type === 'integer' ? 'Enter a whole number' : 'Enter a number';
                continue;
            }
            content[field.key] = n;
        } else {
            content[field.key] = value;
        }
    }
    return Object.keys(errors).length > 0 ? {errors} : {content};
}

interface ElicitationFormProps {
    request: CreateElicitationRequest;
    answer?: CreateElicitationResponse['action'];
    onAnswer: (response: CreateElicitationResponse) => void;
}

export function ElicitationForm({request, answer, onAnswer}: ElicitationFormProps) {
    const [fields] = useState(() => toFields(request));
    const [values, setValues] = useState<Record<string, Value>>(() => Object.fromEntries(fields.map((f) => [f.key, initialValue(f)])));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const done = answer !== undefined;
    const setValue = (key: string, value: Value) => setValues((v) => ({...v, [key]: value}));

    const submit = () => {
        const result = collect(fields, values);
        if ('errors' in result) {
            setErrors(result.errors);
            return;
        }
        onAnswer({action: 'accept', content: result.content});
    };

    return (
        <div className="space-y-3 rounded-lg border p-3 text-sm">
            <div className="flex items-start gap-2">
                <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>
                <div className="font-medium">{request.message}</div>
            </div>
            <fieldset disabled={done} className="space-y-3">
                {fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                        {field.type !== 'boolean' && (
                            <div className="text-xs font-medium">
                                {field.label}{field.required && <span className="text-destructive"> *</span>}
                            </div>
                        )}
                        {field.description && field.type !== 'boolean' && (
                            <div className="text-xs text-muted-foreground">{field.description}</div>
                        )}
                        <FieldInput field={field} value={values[field.key]} onChange={(v) => setValue(field.key, v)}/>
                        {errors[field.key] && <div className="text-xs text-destructive">{errors[field.key]}</div>}
                    </div>
                ))}
            </fieldset>
            {done ? (
                <div className="text-right text-xs text-muted-foreground">
                    {answer === 'accept' ? 'Answered' : answer === 'decline' ? 'Declined' : 'Cancelled'}
                </div>
            ) : (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onAnswer({action: 'decline'})}>Decline</Button>
                    <Button size="sm" onClick={submit}>Submit</Button>
                </div>
            )}
        </div>
    );
}

function FieldInput({field, value, onChange}: { field: Field; value: Value; onChange: (value: Value) => void }) {
    switch (field.type) {
        case 'choice': {
            const selected = Array.isArray(value) ? value : value ? [value as string] : [];
            const toggle = (option: string) => {
                if (field.multiple) onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
                else onChange(selected[0] === option ? '' : option);
            };
            return (
                <div className="flex flex-col gap-1">
                    {field.options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggle(option.value)}
                            className={cn(
                                "rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted disabled:pointer-events-none",
                                selected.includes(option.value) && "border-primary bg-muted",
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {field.multiple && <Checkbox checked={selected.includes(option.value)} tabIndex={-1} className="pointer-events-none"/>}
                                <span>{option.label}</span>
                            </div>
                            {option.description && <div className="text-xs text-muted-foreground">{option.description}</div>}
                        </button>
                    ))}
                </div>
            );
        }
        case 'boolean':
            return (
                <label className="flex items-center gap-2">
                    <Checkbox checked={value as boolean} onCheckedChange={(c) => onChange(c === true)}/>
                    <span>{field.label}{field.required && <span className="text-destructive"> *</span>}</span>
                    {field.description && <span className="text-xs text-muted-foreground">{field.description}</span>}
                </label>
            );
        default:
            return (
                <Input
                    type={field.type === 'text' ? 'text' : 'number'}
                    value={value as string}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8"
                />
            );
    }
}
