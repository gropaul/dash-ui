import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {CodeFence} from "@/components/basics/code-fence/code-fence";
import {getDefaultQueryParams} from "@/model/relation-state";
import {getSeparatedStatements} from "@/platform/sql-utils";


interface RelationViewQueryProps {
    relationId: string;
}

export function RelationViewQueryView(props: RelationViewQueryProps) {

    const codeFenceState = useRelationsState((state) => state.getRelationViewState(props.relationId).codeFenceState, shallow);
    const queryString = useRelationsState((state) => state.getRelation(props.relationId).query.baseQuery, shallow);
    const executionState = useRelationsState((state) => state.getRelation(props.relationId).executionState, shallow);
    const updateRelationBaseQuery = useRelationsState((state) => state.updateRelationBaseQuery);
    const updateRelationData = useRelationsState((state) => state.updateRelationDataWithParams);

    async function onRunQuery() {
        // we need to reset the view params as the could be columns removed now that had filters before!
        await updateRelationData(props.relationId, getDefaultQueryParams());
    }

    function onCodeChange(code: string) {
        updateRelationBaseQuery(props.relationId, code);
    }

    if (!codeFenceState!.show) {
        return null;
    }

    const runQueryIfNotRunning = executionState.state == "running" ? undefined : onRunQuery
    const nQueries = getSeparatedStatements(queryString).length
    const runText = executionState.state == "running" ? "Running..." : `Run (${nQueries} Query${nQueries > 1 ? "s" : ""})`

    return (
        <div className={"border-b border-r border-gray-200 w-full h-full overflow-hidden"}>
            <CodeFence
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
                showLayoutButton={true}
                currentLayout={codeFenceState.layout}
                onLayoutChange={(layout) => {
                    useRelationsState.getState().updateRelationViewState(props.relationId, {
                        codeFenceState: {
                            layout: layout
                        }
                    });
                }}
            />
        </div>
    );
}