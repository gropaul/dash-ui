import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {CodeFence} from "@/components/basics/code-fence/code-fence";
import {getDefaultQueryParams} from "@/model/relation-state";


interface RelationViewQueryProps {
    relationId: string;
}

export function RelationViewQueryView(props: RelationViewQueryProps) {

    const showCode = useRelationsState((state) => state.getRelationViewState(props.relationId).showCode, shallow);
    const queryString = useRelationsState((state) => state.getRelation(props.relationId).query.baseQuery, shallow);
    const executionState = useRelationsState((state) => state.getRelation(props.relationId).executionState, shallow);
    const updateRelationBaseQuery = useRelationsState((state) => state.updateRelationBaseQuery);
    const updateRelationData = useRelationsState((state) => state.updateRelationDataWithParams);

    async function onRunQuery(){
        // we need to reset the view params as the could be columns removed now that had filters before!
        await updateRelationData(props.relationId, getDefaultQueryParams());
    }

    function onCodeChange(code: string) {
        updateRelationBaseQuery(props.relationId, code);
    }

    if (!showCode) {
        return null;
    }

    const runQueryIfNotRunning = executionState == "running" ? undefined : onRunQuery

    return (
        <div className="px-4 py-2 border-b border-gray-200">
            <CodeFence
                showLineNumbers={true}
                height={'8rem'}
                language="sql"
                displayCode={queryString}
                showCopyButton={true}
                showRunButton={true}
                readOnly={false}
                onCodeChange={onCodeChange}
                onRun={runQueryIfNotRunning}
                executionState={executionState}
            />
        </div>
    );
}