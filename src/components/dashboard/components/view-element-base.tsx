import {
    ChartSpline, Copy,
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
import {useRef, useState} from "react";
import {FocusState} from "@/components/dashboard/dashboard-content";

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
    selected: boolean;
    focusState: FocusState;
    setFocusState: (elementId: FocusState) => void;
}

export function ViewElementBase(props: ViewElementBaseProps) {

    const addDashboardElement = useRelationsState((state) => state.addDashboardElement);
    const setDashboardElement = useRelationsState((state) => state.setDashboardElement);
    const deleteDashboardElements = useRelationsState((state) => state.deleteDashboardElements);
    const updateDashboardSelection = useRelationsState((state) => state.updateDashboardSelection);

    const elementRootRef = useRef<HTMLDivElement>(null);
    const elementChildWrapperRef = useRef<HTMLDivElement>(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    async function onAddBelow() {
        const newElement = await getInitialElement('text');
        addDashboardElement(props.dashboardId, newElement, props.elementIndex + 1);
        props.setFocusState({elementId: newElement.id});
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

    function onDuplicate() {
        const newElement = {
            ...props.element,
            id: Math.random().toString(36).substring(7),
        };
        addDashboardElement(props.dashboardId, newElement, props.elementIndex + 1);
    }

    function onDelete() {
        if (props.onDeleteOverwrite) {
            props.onDeleteOverwrite();
        } else {
            deleteDashboardElements(props.dashboardId, [props.element.id]);
        }
    }

    function onDropdownOpenChange(open: boolean) {
        setIsDropdownOpen(open);
        if (open) {
            updateDashboardSelection(props.dashboardId,[props.element.id], 'update', true);
        }
    }


    const defaultBgClass = elementRootRef.current?.style.getPropertyValue('--background');
    const bgClass = props.selected ? 'bg-blue-50' : defaultBgClass;

    if (bgClass !== undefined) {
        elementChildWrapperRef.current?.style.setProperty('--background', bgClass);
    }

    const handleClassName = isDropdownOpen ? '' : 'opacity-0';

    return (
        <div
            ref={elementRootRef}
            className={cn('flex flex-row h-fit w-full bg-background space-x-1 items-start group/element-base relative', props.className)}
        >
            <DropdownMenu onOpenChange={onDropdownOpenChange}>
                <DropdownMenuTrigger asChild>
                    <div
                        className={cn(
                            props.startIconClass,
                            handleClassName,
                            'flex items-center transition-opacity group-hover/element-base:opacity-100'
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
                    <DropdownMenuItem onClick={onDuplicate}>
                        <Copy size={16}/>
                        <span>Duplicate</span>
                    </DropdownMenuItem>
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
            <div
                ref={elementChildWrapperRef}
                className={cn('flex-grow w-full rounded-sm pl-1 pr-1 transition-colors relative', bgClass)}
            >
                {props.children}
            </div>

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