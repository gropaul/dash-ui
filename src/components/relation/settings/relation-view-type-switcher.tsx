import {Button} from "@/components/ui/button";
import {ChevronDown} from "lucide-react";
import {RelationViewType} from "@/model/relation-view-state";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {defaultIconFactory} from "@/components/basics/files/icon-factories";

export interface ViewSwitchEntry {
    viewType: RelationViewType;
}

interface ViewSwitcherProps {
    currentView: RelationViewType;
    onViewChange: (entry: ViewSwitchEntry) => void;
}

interface ViewItem {
    key: string;
    viewType: RelationViewType;
    label: string;
    disabled?: boolean;
}

const views: ViewItem[] = [
    { key: 'table', viewType: 'table', label: 'Table' },
    { key: 'chart', viewType: 'chart', label: 'Chart' },
    { key: 'text', viewType: 'text', label: 'Text' },
    { key: 'select', viewType: 'select', label: 'Input: Select' },
    { key: 'slider', viewType: 'slider', label: 'Input: Slider' },
    { key: 'map', viewType: 'map', label: 'Map', disabled: true },
];

function isActive(view: ViewItem, currentView: RelationViewType): boolean {
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
                {views.map((view) => (
                    <DropdownMenuItem
                        disabled={view.disabled}
                        key={view.key}
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
