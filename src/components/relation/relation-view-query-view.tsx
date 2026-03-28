import {SqlEditor} from "@/components/basics/sql-editor/sql-editor";
import {RelationState} from "@/model/relation-state";
import {splitSQL} from "@/platform/sql-utils";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {AdvancedRelationActions} from "@/state/relations/actions";
import {forwardRef} from "react";
import {StaticDisplayProps} from "@/components/relation/relation-view";
import {mergeParameters, parametersEqual} from "@/state/relations/sql/query-parameters";

interface RelationViewQueryProps extends AdvancedRelationActions{
    relationState: RelationState,
    statics: StaticDisplayProps,
    inputManager?: InputManager;
}

export const RelationViewQueryView = forwardRef<HTMLDivElement, RelationViewQueryProps>(function RelationViewQueryView(props, ref) {

    const codeFenceState = props.relationState.viewState.codeFenceState;
    const queryString = props.relationState.query.baseQuery;
    const executionState = props.relationState.executionState;

    const relationId = props.relationState.id;
    async function onRunQuery() {
        // we need to reset the view params as they could be columns removed now that had filters before!
        await props.updateRelationDataWithBaseQuery(props.relationState.query.baseQuery);
    }

    function onCodeChange(code: string) {
        // Sync parameters with the new SQL
        const currentParams = props.relationState.viewState.parametersState?.parameters ?? [];
        const mergedParams = mergeParameters(code, currentParams);

        // Only update parameters if they actually changed
        const paramsChanged = !parametersEqual(currentParams, mergedParams);

        props.updateRelation({
                ...props.relationState,
                query: {
                    ...props.relationState.query,
                    baseQuery: code,
                },
                viewState: paramsChanged ? {
                    ...props.relationState.viewState,
                    parametersState: {
                        ...props.relationState.viewState.parametersState,
                        panelState: props.relationState.viewState.parametersState?.panelState ?? { show: false, sizePercentage: 30 },
                        parameters: mergedParams,
                    }
                } : props.relationState.viewState,
            }
        );
    }

    if (!codeFenceState!.show) {
        return null;
    }

    const runQueryIfNotRunning = executionState.state == "running" ? undefined : onRunQuery
    const nQueries = splitSQL(queryString).length
    const runText = executionState.state == "running" ? "Running..." : `Run (${nQueries} Query${nQueries > 1 ? "s" : ""})`

    const embedded = props.statics.embedded ?? false;
    return (
        <div ref={ref} className={"w-full h-full overflow-hidden"}>
            <SqlEditor
                path={`relation-${relationId}`}
                inputManager={props.inputManager}
                embedded={embedded}
                alwaysConsumeMouseWheel={!embedded}
                panelMode={props.statics.sqlEditorPanelMode ?? "panel"}
                showLineNumbers={true}
                height={'100%'}
                runText={runText}
                language="sql"
                displayCode={queryString}
                showCopyButton={true}
                showRunButton={props.statics.sqlEditorShowRunButton ?? true}
                readOnly={false}
                onCodeChange={onCodeChange}
                onRun={runQueryIfNotRunning}
                executionState={executionState}
                showLayoutButton={false}
                currentLayout={codeFenceState.layout}
                onLayoutChange={(layout) => {
                    props.updateRelationViewState( {
                        codeFenceState: {
                            layout: layout
                        }
                    });
                }}
            />
        </div>
    );
});