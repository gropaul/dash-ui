import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {RelationState} from "@/model/relation-state";
import {JsonViewer} from "@/components/ui/json-viewer";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {TriangleAlert} from "lucide-react";
import {DefaultRelationZustandActions} from "@/state/relations.state";
import {RelationContextProvider} from "@/components/relation/chart/chart-export-context";
import {EditorPanelPosition} from "@/components/basics/sql-editor/sql-editor";
import {EndUserRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationViewMode} from "@/model/relation-view-state";
import {DefaultErrorBoundary} from "@/components/basics/error-bundary";
import {ViewPadding} from "@/components/ui/view-padding";

// If resizable, the relation view will have a draggable handle to adjust its height, if
// fit, it will adjust to the parent height.
// Fit is used e.g. by the Canvas, FulLScreen View and Dashboard
// Resizable is currently used in AI Chat messages but this could be deprecated
export type HeightType = 'resizable' | 'fit';

export interface StaticDisplayProps {
    mode: RelationViewMode;
    embedded?: boolean; // if embedded, some UI elements may be hidden for a cleaner look, todo: this becomes obsolete by mode
    height?: HeightType;
    showHeader?: boolean;
    showBorder?: boolean;
    neverShowQueryEditor?: boolean; // if true, the sql editor will never be visible, even if the relation state allows it
    sqlEditorShowRunButton?: boolean; // whether to show the run button in the sql editor, defaults to true
    sqlEditorPanelMode?: EditorPanelPosition; // whether the sql editor should be displayed in an overlay or a panel, defaults to overlay
}

export interface RelationViewAPIProps extends DefaultRelationZustandActions, StaticDisplayProps {
    relationState: RelationState;
    className?: string;
}


export interface RelationViewProps extends EndUserRelationActions, StaticDisplayProps {
    relationState: RelationState;
}

export function RelationView(inputProps: RelationViewAPIProps) {
    return (
        <RelationContextProvider>
            <div className="w-full h-full text-xs flex flex-col p-0 m-0 bg-accent">

                <DefaultErrorBoundary>

                    <div className={`flex-1 bg-accent h-full w-full overflow-auto`}>
                        <DefaultErrorBoundary>
                            <RelationStateView
                                showBorder
                                showHeader
                                {...inputProps}
                                sqlEditorPanelMode={'overlay'}
                                sqlEditorShowRunButton={false}
                            />
                        </DefaultErrorBoundary>
                    </div>

                </DefaultErrorBoundary>

            </div>
        </RelationContextProvider>
    );
}


export function ContentWrapper(props: RelationViewProps) {
    const queryState = props.relationState.executionState;
    if (queryState.state === "error") {
        return <RelationViewError error={queryState.error}/>;
    }
    return (
        <RelationViewContent {...props}/>
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
