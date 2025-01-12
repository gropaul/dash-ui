import {GripVertical, MoveDown, MoveUp, Plus, Repeat2, Trash2} from "lucide-react";
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
    TextElementSubType
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
    onTypeChange?: (type: TextElementSubType) => void;
    onDelete?: () => void;
    children?: React.ReactNode;
}

export function ViewElementBase(props: ViewElementBaseProps) {

    const addDashboardElement = useRelationsState((state) => state.addDashboardElement);
    const updateDashboardElement = useRelationsState((state) => state.updateDashboardElement);
    const deleteDashboardElement = useRelationsState((state) => state.deleteDashboardElement);

    async function onAddBelow() {
        const newElement = await getInitialElement('text');
        addDashboardElement(props.dashboardId, newElement, props.elementIndex + 1);
    }

    async function setPosition(index: number) {
        updateDashboardElement(props.dashboardId, props.element.id, {
            ...props.element,
        }, index);
    }

    function onTypeChange(subtype: TextElementSubType) {
        updateDashboardElement(props.dashboardId, props.element.id, {
            ...props.element,
            subtype: subtype,
        });

        if (props.onTypeChange) {
            props.onTypeChange(subtype);
        }
    }

    function onDelete() {
        deleteDashboardElement(props.dashboardId, props.element.id);

        if (props.onDelete) {
            props.onDelete();
        }
    }

    return (
        <div className={cn('flex flex-row space-x-1 items-start w-full group', props.className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div
                        className={cn(
                            props.startIconClass,
                            'flex items-center opacity-0 group-hover:opacity-100 transition-opacity'
                        )}
                    >
                        <Button variant={'ghost'} size={'icon'} className={cn('w-5 rounded h-6')}>
                            <GripVertical size={16} className="text-muted-foreground opacity-70"/>
                        </Button>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={'center'} side={'left'} className={'w-48 group'}>
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
                </DropdownMenuContent>
            </DropdownMenu>
            {props.children}
        </div>
    );
}
