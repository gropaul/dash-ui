import {
    DropdownMenuLabel,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Italic,
    Text,
} from "lucide-react";
import {ColorPalette} from "@/components/ui/color-palette";
import {getInitialTextViewStateEmpty, TextDisplayStyle, TextDisplayViewState} from "@/model/relation-view-state/text-display";
import {RelationSettingsProps} from "@/components/relation/relation-settings";
import React from "react";

const textStyleOptions: { id: TextDisplayStyle; label: string; icon: React.ReactNode }[] = [
    {id: 'h1', label: 'Heading 1', icon: <Heading1 className="h-4 w-4"/>},
    {id: 'h2', label: 'Heading 2', icon: <Heading2 className="h-4 w-4"/>},
    {id: 'h3', label: 'Heading 3', icon: <Heading3 className="h-4 w-4"/>},
    {id: 'h4', label: 'Heading 4', icon: <Heading4 className="h-4 w-4"/>},
    {id: 'h5', label: 'Heading 5', icon: <Heading5 className="h-4 w-4"/>},
    {id: 'body', label: 'Body', icon: <Text className="h-4 w-4"/>},
    {id: 'code', label: 'Code', icon: <Code className="h-4 w-4"/>},
];

const alignOptions: { id: 'left' | 'center' | 'right'; label: string; icon: React.ReactNode }[] = [
    {id: 'left', label: 'Left', icon: <AlignLeft className="h-4 w-4"/>},
    {id: 'center', label: 'Center', icon: <AlignCenter className="h-4 w-4"/>},
    {id: 'right', label: 'Right', icon: <AlignRight className="h-4 w-4"/>},
];

const verticalAlignOptions: { id: 'top' | 'center' | 'bottom'; label: string; icon: React.ReactNode }[] = [
    {id: 'top', label: 'Top', icon: <AlignVerticalJustifyStart className="h-4 w-4"/>},
    {id: 'center', label: 'Center', icon: <AlignVerticalJustifyCenter className="h-4 w-4"/>},
    {id: 'bottom', label: 'Bottom', icon: <AlignVerticalJustifyEnd className="h-4 w-4"/>},
];

export function TextDisplaySettingsContent(props: RelationSettingsProps) {
    const textDisplayState = props.relationState.viewState.textDisplayState ?? getInitialTextViewStateEmpty();

    function update(updates: Partial<TextDisplayViewState>) {
        props.updateRelationViewState({
            textDisplayState: {
                ...textDisplayState,
                ...updates,
            }
        });
    }

    return (
        <>
            <DropdownMenuLabel>Text Style</DropdownMenuLabel>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    {textStyleOptions.find(o => o.id === textDisplayState.textStyle)?.icon}
                    <span className="ml-2">
                        {textStyleOptions.find(o => o.id === textDisplayState.textStyle)?.label ?? 'Style'}
                    </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    {textStyleOptions.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            onClick={() => update({textStyle: option.id})}
                            className={textDisplayState.textStyle === option.id ? 'bg-accent' : ''}
                        >
                            {option.icon}
                            <span className="ml-2">{option.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem
                onClick={() => update({fontStyle: textDisplayState.fontStyle === 'italic' ? 'normal' : 'italic'})}
                className={textDisplayState.fontStyle === 'italic' ? 'bg-accent' : ''}
            >
                <Italic className="h-4 w-4"/>
                <span className="ml-2">Italic</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator/>
            <DropdownMenuLabel>Alignment</DropdownMenuLabel>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    {alignOptions.find(o => o.id === textDisplayState.textAlign)?.icon}
                    <span className="ml-2">
                        {alignOptions.find(o => o.id === textDisplayState.textAlign)?.label ?? 'Horizontal'}
                    </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    {alignOptions.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            onClick={() => update({textAlign: option.id})}
                            className={textDisplayState.textAlign === option.id ? 'bg-accent' : ''}
                        >
                            {option.icon}
                            <span className="ml-2">{option.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    {verticalAlignOptions.find(o => o.id === textDisplayState.verticalAlign)?.icon}
                    <span className="ml-2">
                        {verticalAlignOptions.find(o => o.id === textDisplayState.verticalAlign)?.label ?? 'Vertical'}
                    </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    {verticalAlignOptions.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            onClick={() => update({verticalAlign: option.id})}
                            className={textDisplayState.verticalAlign === option.id ? 'bg-accent' : ''}
                        >
                            {option.icon}
                            <span className="ml-2">{option.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator/>
            <DropdownMenuLabel>Color</DropdownMenuLabel>
            <div className="px-2 py-1">
                <ColorPalette
                    color={textDisplayState.color}
                    onChange={(color) => update({color})}
                />
            </div>
        </>
    );
}
