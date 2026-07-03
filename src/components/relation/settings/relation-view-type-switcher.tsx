import {Button} from "@/components/ui/button";
import {ChevronDown} from "lucide-react";
import {RelationViewType} from "@/model/relation-view-state";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {VIEW_MODES, ViewMode} from "@/components/relation/settings/view-mode-picker";

export interface ViewSwitchEntry {
    viewType: RelationViewType;
}

interface ViewSwitcherProps {
    currentView: RelationViewType;
    onViewChange: (entry: ViewSwitchEntry) => void;
}

function isActive(view: ViewMode, currentView: RelationViewType): boolean {
    return view.viewType === currentView;

}

export function RelationViewTypeSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className={'rounded-[0px] w-14 h-10 flex flex-row items-center justify-center'}
                    variant="ghost" size="icon"
                >
                    {defaultIconFactory(currentView)}
                    <ChevronDown className={'w-2 h-2'}/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {VIEW_MODES.map((view) => (
                    <DropdownMenuItem
                        disabled={!view.ready}
                        key={view.viewType}
                        onClick={() => onViewChange({viewType: view.viewType})}
                        className={isActive(view, currentView) ? 'bg-accent' : ''}
                    >
                        {defaultIconFactory(view.viewType)}
                        {view.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
