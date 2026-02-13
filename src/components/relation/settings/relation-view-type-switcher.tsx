import {Button} from "@/components/ui/button";
import {ChevronDown} from "lucide-react";
import {RelationViewType} from "@/model/relation-view-state";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {defaultIconFactory} from "@/components/basics/files/icon-factories";

interface ViewSwitcherProps {
    currentView: RelationViewType;
    onViewChange: (view: RelationViewType) => void;
}

export function RelationViewTypeSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
    const views: {id: RelationViewType, label: string}[] = [
        { id: 'table', label: 'Table' },
        { id: 'chart', label: 'Chart' },
        { id: 'select', label: 'Input: Select' },
        { id: 'map', label: 'Map' },
    ] as const;

    const disabledViews = ['map'];

    const CurrentIcon = defaultIconFactory(currentView);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className={'rounded-[0px] w-14 h-10 flex flex-row items-center justify-center'}
                    variant="ghost" size="icon"
                >
                    {/*<CurrentIcon className={'p-0'} />*/}
                    {defaultIconFactory(currentView)}
                    <ChevronDown className={'w-2 h-2'}/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {views.map((view) => {

                    return (
                        <DropdownMenuItem
                            disabled={disabledViews.includes(view.id)}
                            key={view.id}
                            onClick={() => onViewChange(view.id)}
                            className={currentView === view.id ? 'bg-accent' : ''}
                        >
                            {/*<Icon className="mr-2 h-4 w-4" />*/}
                            {defaultIconFactory(view.id)}
                            {view.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
