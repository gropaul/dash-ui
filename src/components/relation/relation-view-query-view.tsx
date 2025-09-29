import {DefaultRelationZustandActions, useRelationsState} from "@/state/relations.state";
import {SqlEditor} from "@/components/basics/sql-editor/sql-editor";
import {getUpdatedParams, RelationState} from "@/model/relation-state";
import {getSeparatedStatements} from "@/platform/sql-utils";
import {InputManager} from "@/components/editor/inputs/input-manager";

interface RelationViewQueryProps extends DefaultRelationZustandActions{
    relationState: RelationState,
    inputManager?: InputManager;
    embedded?: boolean;
}

export function RelationViewQueryView(props: RelationViewQueryProps) {

    const codeFenceState = props.relationState.viewState.codeFenceState;
    const queryString = props.relationState.query.baseQuery;
    const executionState = props.relationState.executionState;

    const relationId = props.relationState.id;
    async function onRunQuery() {
        console.log("Running query for relation ", relationId);
        // we need to reset the view params as the could be columns removed now that had filters before!
        await props.updateRelationDataWithParams(relationId, getUpdatedParams(props.relationState.query.viewParameters));
    }

    function onCodeChange(code: string) {
        props.updateRelation({
                ...props.relationState,
                query: {
                    ...props.relationState.query,
                    baseQuery: code,
                },
            }
        );
    }

    if (!codeFenceState!.show) {
        return null;
    }

    const runQueryIfNotRunning = executionState.state == "running" ? undefined : onRunQuery
    const nQueries = getSeparatedStatements(queryString).length
    const runText = executionState.state == "running" ? "Running..." : `Run (${nQueries} Query${nQueries > 1 ? "s" : ""})`

    const embedded = props.embedded ?? false;
    return (
        <div className={"w-full h-full overflow-hidden"}>
            <SqlEditor
                path={`relation-${relationId}`}
                inputManager={props.inputManager}
                embedded={embedded}
                alwaysConsumeMouseWheel={!embedded}
                buttonPosition={'panel'}
                showLineNumbers={true}
                height={'100%'}
                runText={runText}
                language="sql"
                displayCode={queryString}
                showCopyButton={true}
                showRunButton={true}
                readOnly={false}
                onCodeChange={onCodeChange}
                onRun={runQueryIfNotRunning}
                executionState={executionState}
                showLayoutButton={!embedded}
                currentLayout={codeFenceState.layout}
                onLayoutChange={(layout) => {
                    useRelationsState.getState().updateRelationViewState(relationId, {
                        codeFenceState: {
                            layout: layout
                        }
                    });
                }}
            />
        </div>
    );
}