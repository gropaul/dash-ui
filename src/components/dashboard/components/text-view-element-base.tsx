import {EditableTextBase, EditableTextProps} from "@/components/dashboard/components/editable-text-base";
import {GripVertical} from "lucide-react";
import {cn} from "@/lib/utils";
import {
    DropdownMenu, DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {TextElementType} from "@/model/dashboard-state";

export interface TextViewElementBaseProps extends  EditableTextProps {
    type: TextElementType;
    onTypeChange: (type: TextElementType) => void;
}

export function TextViewElementBase(props: TextViewElementBaseProps) {

    return (
        <div className={cn('flex flex-row space-x-2 items-center w-full', props.className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={'ghost'} size={'icon'} className={'w-5 rounded'}>
                        <GripVertical size={16} className="text-muted-foreground"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={'start'} side={'right'} className={'w-56'}>
                    <DropdownMenuLabel>Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                        checked={props.type === 'text'}
                        onCheckedChange={() => props.onTypeChange('text')}
                    >
                        Text
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={props.type === 'h3'}
                        onCheckedChange={() => props.onTypeChange('h3')}
                    >
                        Heading 3
                    </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <EditableTextBase
                className={'flex-1 w-full'}
                text={props.text}
                onTextChange={props.onTextChange}
            />
        </div>
    )
}