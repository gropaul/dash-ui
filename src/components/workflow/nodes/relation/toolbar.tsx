import { NodeToolbar, Position } from '@xyflow/react';
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import { ToolbarViewSwitcher } from './toolbar-view-switcher';
import { RelationViewType } from "@/model/relation-view-state";

interface RelationToolbarProps {
    isVisible: boolean;
    showCode: boolean;
    onToggleCode: () => void;
    currentView: RelationViewType;
    onViewChange: (view: RelationViewType) => void;
}

export function Toolbar({
    isVisible,
    showCode,
    onToggleCode,
    currentView,
    onViewChange
}: RelationToolbarProps) {
    return (
        <NodeToolbar isVisible={isVisible} position={Position.Left} align={'start'}>
            <div className="flex flex-col space-y-2">
                <Button
                    variant={'outline'}
                    size={'icon'}
                    className={'h-8 w-8 relative'}
                    onClick={onToggleCode}
                >
                    <Code className={showCode ? 'opacity-50' : ''} />
                    {showCode && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2/3 h-[1.5px] rounded bg-muted-foreground -rotate-45 origin-center" />
                        </div>
                    )}
                </Button>
                <ToolbarViewSwitcher
                    currentView={currentView}
                    onViewChange={onViewChange}
                />
            </div>
        </NodeToolbar>
    );
}
