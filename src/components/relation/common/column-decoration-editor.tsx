"use client"

import React from "react";
import {AlignCenter, AlignLeft, AlignRight, ChevronDown} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {ColorPalette} from "@/components/ui/color-palette";
import {ValueType} from "@/model/value-type";
import {
    ColumnDecoration,
    DEFAULT_COLUMN_DECORATION,
    DecorationAlign,
    DecorationCellStyle,
    DecorationFormat,
    getAvailableFormats,
    getAvailableStyles,
} from "@/model/relation-view-state/decoration";
import {DEFAULT_COLORS} from "@/platform/global-data";

const FORMAT_LABELS: Record<DecorationFormat, string> = {
    plain: 'Plain',
    number: 'Number',
    currency: 'Currency',
    percent: 'Percent',
};

const STYLE_LABELS: Record<DecorationCellStyle, string> = {
    none: 'None',
    'data-bar': 'Data bar',
    'color-scale': 'Color scale',
    badge: 'Badge',
    'text-color': 'Text color',
};

const ALIGN_OPTIONS: {value: DecorationAlign; label: string; icon: React.ReactNode}[] = [
    {value: 'left', label: 'Left', icon: <AlignLeft size={13}/>},
    {value: 'center', label: 'Center', icon: <AlignCenter size={13}/>},
    {value: 'right', label: 'Right', icon: <AlignRight size={13}/>},
];

interface SelectRowOption<T extends string> {
    value: T;
    label: string;
    icon?: React.ReactNode;
}

interface SelectRowProps<T extends string> {
    label: string;
    value: T;
    options: SelectRowOption<T>[];
    onChange: (value: T) => void;
}

function SelectRow<T extends string>({label, value, options, onChange}: SelectRowProps<T>) {
    const current = options.find(o => o.value === value) ?? options[0];
    return (
        <div className="flex items-center justify-between gap-2">
            <Label><Muted>{label}</Muted></Label>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
                        {current.icon}
                        {current.label}
                        <ChevronDown size={12} className="text-muted-foreground"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {options.map(option => (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => onChange(option.value)}
                            className={option.value === value ? 'bg-accent' : ''}
                        >
                            {option.icon}
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export interface ColumnDecorationEditorProps {
    columnType: ValueType;
    decoration?: ColumnDecoration;
    onChange: (decoration: ColumnDecoration) => void;
}

/**
 * Reusable editor for a single column's decoration (format, align, cell style).
 * One row per property: label left, dropdown select right.
 * View-agnostic: usable from any view settings panel.
 */
export function ColumnDecorationEditor(props: ColumnDecorationEditorProps) {
    const {columnType, onChange} = props;
    const decoration = props.decoration ?? DEFAULT_COLUMN_DECORATION;

    const formats = getAvailableFormats(columnType);
    const styles = getAvailableStyles(columnType);

    return (
        <div className="flex flex-col gap-1">
            {formats.length > 1 && (
                <SelectRow
                    label="Format"
                    value={decoration.format}
                    options={formats.map(f => ({value: f, label: FORMAT_LABELS[f]}))}
                    onChange={(format) => onChange({...decoration, format})}
                />
            )}

            <SelectRow
                label="Align"
                value={decoration.align}
                options={ALIGN_OPTIONS}
                onChange={(align) => onChange({...decoration, align})}
            />

            <SelectRow
                label="Cell style"
                value={decoration.style}
                options={styles.map(s => ({value: s, label: STYLE_LABELS[s]}))}
                onChange={(style) => onChange({...decoration, style})}
            />

            {decoration.style !== 'none' && (
                <div className="flex items-center justify-between gap-2 py-1">
                    <Label><Muted>Color</Muted></Label>
                    <ColorPalette
                        color={decoration.color ?? ''}
                        colors={DEFAULT_COLORS.slice(0, 5)}
                        onChange={(color) => onChange({...decoration, color})}
                    />
                </div>
            )}
        </div>
    );
}
