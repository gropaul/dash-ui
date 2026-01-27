import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {RelationState} from "@/model/relation-state";
import {JsonViewer} from "@/components/ui/json-viewer";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {TriangleAlert} from "lucide-react";
import {DefaultRelationZustandActions} from "@/state/relations.state";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {AdvancedRelationActions, createAdvancedRelationActions} from "@/state/relations/functions";
import {ErrorBoundary} from "@/components/basics/error-bundary";

// If resizable, the relation view will have a draggable handle to adjust its height, if
// fit, it will adjust to the parent height.
export type HeightType = 'resizable' | 'fit';

export interface StaticDisplayProps {
    embedded?: boolean; // if embedded, some UI elements may be hidden for a cleaner look
    height?: HeightType;
    configDisplayMode?: 'inline' | 'dialog'; // if inline, the config panel will be displayed next to the relation view, otherwise in a dialog
}

export interface RelationViewAPIProps extends DefaultRelationZustandActions, StaticDisplayProps{
    relationState: RelationState;
    inputManager?: InputManager;
    className?: string;
}


export interface RelationViewProps extends AdvancedRelationActions, StaticDisplayProps{
    relationState: RelationState;
    inputManager?: InputManager;
    embedded?: boolean;
}

export function RelationView(inputProps: RelationViewAPIProps) {
    return (
        <div className="w-full h-full flex flex-col p-0 m-0 bg-background">
            <ErrorBoundary fallback={(error) => (
                <div className="p-4 w-full bg-inherit h-full flex flex-col items-start justify-start">
                    <div className={'flex bg-inherit flex-row text-red-500 items-center space-x-2 h-6'}>
                        <TriangleAlert size={16}/>
                        <span>Error rendering relation view</span>
                    </div>
                    <div className="mt-2 text-red-500">
                        {error.message}
                    </div>
                </div>
            )}>
                <RelationViewHeader {...inputProps}/>
                <div className={`flex-1 bg-background overflow-auto`}>
                    <RelationStateView {...inputProps}/>
                </div>
            </ErrorBoundary>
        </div>
    );
}


export function ContentWrapper(props: RelationViewProps) {

    const queryState = props.relationState.executionState;
    return (
        queryState.state === "error" ? (
            <RelationViewError error={queryState.error}/>
        ) : (
            <RelationViewContent {...props}/>
        )
    );
}

export function RelationViewError({error}: { error: Record<string, any> }) {
    return (
        <div className="p-4 w-full bg-inherit h-full flex flex-col items-start justify-start">
            <div className={'flex bg-inherit flex-row text-red-500 items-center space-x-2 h-6'}>
                <TriangleAlert size={16}/>
                <span>Error executing query</span>
            </div>
            <JsonViewer className="w-full text-red-500" json={error}/>
        </div>
    );
}
