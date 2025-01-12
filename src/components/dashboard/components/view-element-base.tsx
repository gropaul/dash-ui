import {GripVertical, Repeat2, Trash2} from "lucide-react";
import {cn} from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {DashboardElement, ElementSubTypeOption, TextElementSubType} from "@/model/dashboard-state";
import {useRelationsState} from "@/state/relations.state";

export interface ViewElementBaseProps {
    dashboardId: string;
    className?: string;
    startIconClass?: string;
    element: DashboardElement;
    typeOptions: ElementSubTypeOption[];
    onTypeChange?: (type: TextElementSubType) => void;
    onDelete?: () => void;
    children?: React.ReactNode;
}

export function ViewElementBase(props: ViewElementBaseProps) {

    const setDashboardElement = useRelationsState((state) => state.setDashboardElement);
    const deleteDashboardElement = useRelationsState((state) => state.deleteDashboardElement);


    function onTypeChange(subtype: TextElementSubType) {
        setDashboardElement(props.dashboardId, props.element.id, {
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
                <DropdownMenuContent align={'start'} side={'right'} className={'w-56 group'}>
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
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>
            {props.children}
        </div>
    );
}
