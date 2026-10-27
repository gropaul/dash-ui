import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Node, NodeProps, NodeResizer, Position} from '@xyflow/react';
import {RelationNodeBody} from "@/components/canvas/nodes/relation/relation-body";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import {RelationToolbar} from "@/components/canvas/nodes/relation/relation-toolbar";
import {ConditionalHandles} from "@/components/canvas/nodes/relation/conditional-handles";
import {useHoverWithPadding} from "@/hooks/use-hover-with-padding";


import {
    ConnectionHoverState,
    DEFAULT_CODE_VIEW_HEIGHT,
    DEFAULT_NODE_HEIGHT,
    roundToGrid
} from "@/components/canvas/logic/models";
import {WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE} from "@/platform/global-data";
import {RelationContextProvider} from "@/components/relation/chart/chart-export-context";
import {useCanvasState} from "@/components/canvas/canvas-context";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationState} from "@/model/relation-state";
import {getDefaultSessionState, RelationViewMode} from "@/model/relation-view-state";
import {RelationNodeData, useRelationNodeModel} from "@/components/canvas/logic/canvas-file";
import {isInputView} from "@/components/page-editor/model";
import {humanizeName} from "@/platform/string-utils";

type RelationNodeProps = RelationNodeData & {
    connectionHover?: ConnectionHoverState | null;
}

type RelationNodeType = Node<RelationNodeProps, 'relationNode'>;

const VIEW_MODE: RelationViewMode = 'embedded';

export function RelationNode(props: NodeProps<RelationNodeType>) {
    const {canvasId: path, openFullscreen, setNodes, embedded: onPage} = useCanvasState();
    const {body, showCode} = props.data;

    const model = useRelationNodeModel(path, props.id, body, setNodes);

    // Whether the SQL shows is the node's, kept in the canvas file.
    const data = useMemo(() => {
        const relation = withoutHeaderTitle(model?.relation ?? RelationActions.create());
        const session = relation.viewState.embeddedSessionState ?? getDefaultSessionState('embedded');
        if (session.codeFenceState.show === showCode) return relation;
        return {
            ...relation,
            viewState: {...relation.viewState, embeddedSessionState: {...session, codeFenceState: {...session.codeFenceState, show: showCode}}},
        };
    }, [model?.relation, showCode]);

    const updateRelation = useCallback((updater: RelationState | ((prev: RelationState) => RelationState)) => {
        if (!model) return;
        model.updateRelation(typeof updater === 'function' ? updater(data) : updater);
    }, [model, data]);

    // A block not run yet runs once it shows.
    useEffect(() => {
        if (model?.relation.executionState.state === 'not-started') {
            void getRelationActions({mode: VIEW_MODE, relationState: model.relation, updateRelation: model.updateRelation})
                .updateRelationDataWithBaseQuery(model.relation.query.baseQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model?.relation.id]);

    const actions = useMemo(() => {
        const inputProps: RelationViewAPIProps = {
            mode: VIEW_MODE,
            relationState: data,
            updateRelation: updateRelation,
            embedded: true
        }
        return getRelationActions(inputProps)
    }, [data, updateRelation])

    const [closestHandle, setClosestHandle] = useState<Position | undefined>()
    const [lastCodeHeight, setLastCodeHeight] = useState(DEFAULT_CODE_VIEW_HEIGHT)
    const codeFenceRef = useRef<HTMLDivElement>(null!);

    const [divRef, isHovered] = useHoverWithPadding<HTMLDivElement>(48);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const distances = {
            [Position.Top]: Math.sqrt((mouseX - centerX) ** 2 + mouseY ** 2),
            [Position.Right]: Math.sqrt((mouseX - rect.width) ** 2 + (mouseY - centerY) ** 2),
            [Position.Bottom]: Math.sqrt((mouseX - centerX) ** 2 + (mouseY - rect.height) ** 2),
            [Position.Left]: Math.sqrt(mouseX ** 2 + (mouseY - centerY) ** 2),
        };

        const closest = Object.entries(distances).reduce((min, [pos, dist]) =>
                dist < distances[min] ? pos as Position : min
            , Position.Top);

        if (distances[closest] > WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE) {
            setClosestHandle(undefined);
        } else {
            setClosestHandle(closest);
        }
    };

    const isCodeShowing = actions.getSessionState(VIEW_MODE).codeFenceState.show;

    const handleToggleCode = useCallback(() => {
        const isCurrentlyShowing = isCodeShowing;

        let heightDelta: number;
        if (isCurrentlyShowing) {
            const currentHeight = roundToGrid(codeFenceRef.current?.offsetHeight ?? lastCodeHeight);
            setLastCodeHeight(currentHeight);
            heightDelta = -currentHeight;
        } else {
            heightDelta = lastCodeHeight;
        }

        setNodes((nodes) => nodes.map((node) => node.id !== props.id ? node : {
            ...node,
            data: {...node.data, showCode: !isCurrentlyShowing},
            height: roundToGrid((node.height ?? DEFAULT_NODE_HEIGHT) + heightDelta),
        }));
    }, [isCodeShowing, setNodes, props.id, lastCodeHeight]);

    const handleRun = useCallback(async () => {
        await actions.updateRelationDataWithBaseQuery(data.query.baseQuery);
    }, [actions, data.query.baseQuery]);

    const viewProps: RelationViewProps = {
        mode: VIEW_MODE,
        relationState: data,
        ...actions
    }

    return (
        <div
            className="w-full h-full relative border rounded-2xl"
            ref={divRef}
            onMouseMove={handleMouseMove}
        >
            <RelationContextProvider>
                <RelationNodeBody
                    className={''}
                    selected={props.selected}
                    connectionHover={props.data.connectionHover}
                    showHeader={data.viewState.showHeader}
                    relationState={data}
                    viewType={data.viewState.selectedView}
                >
                    <RelationToolbar
                        showCode={isCodeShowing}
                        runState={data.executionState}
                        onRun={handleRun}
                        onStopRun={actions.cancelQuery}
                        onToggleCode={handleToggleCode}
                        viewProps={viewProps}
                        onViewChange={(entry) => {
                            actions.updateRelationViewState({
                                selectedView: entry.viewType,
                            });
                        }}
                        onFullscreen={() => openFullscreen(props.id)}
                        onToggleHeader={viewProps.toggleShowHeader}
                    />
                    <NodeResizer
                        lineClassName={'z-40'}
                        isVisible={props.selected}
                        minWidth={100}
                        minHeight={30}
                    />
                    <div className={'w-full h-full bg-background rounded-2xl relative'}>
                        <RelationStateView
                            mode={VIEW_MODE}
                            relationState={data}
                            updateRelation={updateRelation}
                            embedded={false}
                            sqlEditorShowRunButton={false}
                            sqlEditorPanelMode={'overlay'}
                            // On a page, e.g. the website, a text area in place of Monaco, which is heavy to load.
                            plainSqlEditor={onPage}
                            height={'fit'}
                            bare={isInputView(data.viewState.selectedView)}
                            framed
                            codeFenceRef={codeFenceRef}
                        />
                    </div>
                    <ConditionalHandles type="source" isHovered={isHovered} closestHandle={closestHandle}
                                        isSelected={props.selected ?? false}/>
                </RelationNodeBody>
            </RelationContextProvider>
        </div>
    );
}

/** The node header already shows the name, so the chart doesn't draw it again as its title. */
function withoutHeaderTitle(relation: RelationState): RelationState {
    const chart = relation.query.viewParameters.chart;
    const title = chart?.plot.title;
    if (!relation.viewState.showHeader || !title || title !== humanizeName(relation.viewState.displayName)) return relation;
    const {title: _title, ...plot} = chart.plot;
    return {...relation, query: {...relation.query, viewParameters: {...relation.query.viewParameters, chart: {...chart, plot}}}};
}
