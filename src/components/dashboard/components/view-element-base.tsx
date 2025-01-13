import {
    ChartSpline,
    GripVertical,
    Heading3,
    LetterText,
    MoveDown,
    MoveUp,
    Plus,
    Repeat2,
    Sheet,
    Trash2
} from "lucide-react";
import {cn} from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal, DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {
    DashboardElement,
    DashboardElementType,
    ElementSubTypeOption, getInitialElement,
    ElementSubType
} from "@/model/dashboard-state";
import {useRelationsState} from "@/state/relations.state";

export interface ViewElementBaseProps {
    dashboardId: string;
    className?: string;
    startIconClass?: string;
    element: DashboardElement;
    elementIndex: number;
    elementsCount: number;
    typeOptions: ElementSubTypeOption[];
    onTypeChangeOverwrite?: (type: ElementSubType) => void;
    onDeleteOverwrite?: () => void;
    children?: React.ReactNode;
    extraContextMenuItems?: React.ReactNode;
}

export function ViewElementBase(props: ViewElementBaseProps) {

    const addDashboardElement = useRelationsState((state) => state.addDashboardElement);
    const setDashboardElement = useRelationsState((state) => state.setDashboardElement);
    const deleteDashboardElement = useRelationsState((state) => state.deleteDashboardElement);

    async function onAddBelow() {
        const newElement = await getInitialElement('text');
        addDashboardElement(props.dashboardId, newElement, props.elementIndex + 1);
    }
    async function setPosition(index: number) {
        setDashboardElement(props.dashboardId, props.element.id, {
            ...props.element,
        }, index);
    }

    function onTypeChange(subtype: ElementSubType) {
        if (props.onTypeChangeOverwrite) {
            props.onTypeChangeOverwrite(subtype);
        } else {
            setDashboardElement(props.dashboardId, props.element.id, {
                ...props.element,
                subtype: subtype,
            });
        }
    }

    function onDelete() {
        if (props.onDeleteOverwrite) {
            props.onDeleteOverwrite();
        } else {
            deleteDashboardElement(props.dashboardId, props.element.id);
        }
    }

    return (
        <div className={cn('flex flex-row space-x-1 items-start w-full group/element-base', props.className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div
                        className={cn(
                            props.startIconClass,
                            'flex items-center opacity-0 group-hover/element-base:opacity-100 transition-opacity'
                        )}
                    >
                        <Button variant={'ghost'} size={'icon'} className={cn('w-5 rounded h-6')}>
                            <GripVertical size={16} className="text-muted-foreground opacity-70"/>
                        </Button>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={'center'} side={'left'} className={'w-48'}>
                    <DropdownMenuItem onClick={onAddBelow}>
                        <Plus size={16}/>
                        <span>Add New Below</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onClick={onDelete}>
                        <Trash2 size={16}/>
                        <span>Delete</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Repeat2 size={16}/>
                            <span>Turn into</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                {props.typeOptions.map((option) => (
                                    <DropdownMenuCheckboxItem
                                        key={option.value}
                                        checked={props.element.subtype === option.value}
                                        onCheckedChange={() => onTypeChange(option.value)}
                                    >
                                        <ViewElementIcon subtype={option.value}/>
                                        {option.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem
                            onClick={() => setPosition(props.elementIndex - 1)}
                            disabled={props.elementIndex === 0}
                        >
                            <MoveUp />
                            Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setPosition(props.elementIndex + 1)}
                            disabled={props.elementIndex === props.elementsCount - 1}
                        >
                            <MoveDown />
                            Move Down
                        </DropdownMenuItem>
                    </DropdownMenuSub>
                    {props.extraContextMenuItems}
                </DropdownMenuContent>
            </DropdownMenu>
            {props.children}
        </div>
    );
}


function ViewElementIcon({subtype}: { subtype: ElementSubType }) {

    const iconSize = 16;
    const className = 'mr-2';
    switch (subtype) {
        case 'data-chart':
            return <ChartSpline size={iconSize} className={className}/>;
        case 'data-table':
            return <Sheet size={iconSize} className={className}/>;
        case 'text-h3':
            return <Heading3 size={iconSize} className={className}/>;
        case 'text-default':
            return <LetterText size={iconSize} className={className}/>;
        default:
            return <p>Text</p>;
    }
}