import { Button } from "@/components/ui/button";
import {BarChart3, Table2, Map, ChevronDown} from "lucide-react";
import { RelationViewType } from "@/model/relation-view-state";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ViewSwitcherProps {
    currentView: RelationViewType;
    onViewChange: (view: RelationViewType) => void;
}

export function ToolbarViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
    const views = [
        { id: 'chart', label: 'Chart', icon: BarChart3 },
        { id: 'table', label: 'Table', icon: Table2 },
        { id: 'map', label: 'Map', icon: Map },
    ] as const;

    const disabledViews = ['map'];

    const CurrentIcon = views.find(v => v.id === currentView)?.icon ?? BarChart3;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className={'rounded-[0px] w-14 h-10 flex flex-row items-center justify-center'}
                    variant="ghost" size="icon"
                >
                    <CurrentIcon className={'p-0'} />
                    <ChevronDown className={'w-2 h-2'}/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {views.map((view) => {
                    const Icon = view.icon;
                    return (
                        <DropdownMenuItem
                            disabled={disabledViews.includes(view.id)}
                            key={view.id}
                            onClick={() => onViewChange(view.id)}
                            className={currentView === view.id ? 'bg-accent' : ''}
                        >
                            <Icon className="mr-2 h-4 w-4" />
                            {view.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
