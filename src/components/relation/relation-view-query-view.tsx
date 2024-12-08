import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {CodeFence} from "@/components/basics/code-fence/code-fence";


interface RelationViewQueryProps {
    relationId: string;
}

export function RelationViewQueryView(props: RelationViewQueryProps) {


    const showCode = useRelationsState((state) => state.getRelationViewState(props.relationId).showCode, shallow);
    const queryString = useRelationsState((state) => state.getRelation(props.relationId).query.baseQuery, shallow);
    const updateRelationBaseQuery = useRelationsState((state) => state.updateRelationBaseQuery);
    const updateRelationData = useRelationsState((state) => state.updateRelationData);

    async function onRunQuery(){
        await updateRelationData(props.relationId);
    }

    function onCodeChange(code: string) {
        updateRelationBaseQuery(props.relationId, code);
    }

    if (!showCode) {
        return null;
    }

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
                onRun={onRunQuery}
            />
        </div>
    );
}