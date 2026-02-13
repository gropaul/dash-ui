import {NodeToolbar, Position} from '@xyflow/react';
import {Button} from "@/components/ui/button";
import {Code, Maximize} from "lucide-react";
import {RelationViewTypeSwitcher} from '../../../relation/settings/relation-view-type-switcher';
import {RelationViewType} from "@/model/relation-view-state";
import {Toggle} from "@/components/ui/toggle";
import {RelationSettings} from "@/components/relation/relation-settings";
import {RelationViewProps} from "@/components/relation/relation-view";

interface RelationToolbarProps {
    isVisible: boolean;
    showCode: boolean;
    onToggleCode: () => void;
    viewProps: RelationViewProps,
    onViewChange: (view: RelationViewType) => void;
    onFullscreen: () => void;
}

export function Toolbar({
                            isVisible,
                            showCode,
                            onToggleCode,
                            viewProps,
                            onViewChange,
                            onFullscreen
                        }: RelationToolbarProps) {


    return (
        <NodeToolbar isVisible={isVisible} position={Position.Top} align={'center'}>
            <div className="flex flex-row  bg-background border rounded-2xl shadow-sm px-1">
                <Button
                    className={'rounded-[0px] w-10 h-10 '}
                    variant={'ghost'}
                    size={'icon'}
                    onClick={onFullscreen}
                >
                    <Maximize/>
                </Button>
                <div className="w-[1px] h-10 bg-border"/>

                <div className="flex flex-row items-center justify-center  "></div>
                <Toggle
                    className={'rounded-[0px] w-10 h-10 '}
                    pressed={showCode}
                    onClick={onToggleCode}
                >
                    <Code className="h-4 w-4"/>
                </Toggle>
                <div className="w-[1px] h-10 bg-border"/>

                <RelationViewTypeSwitcher
                    currentView={viewProps.relationState.viewState.selectedView}
                    onViewChange={onViewChange}
                />
                <div className="w-[1px] h-10 bg-border"/>

                <RelationSettings {...viewProps} className={'h-10 w-10 rounded-sm'}/>
            </div>
        </NodeToolbar>
    );
}
