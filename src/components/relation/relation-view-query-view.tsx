import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {CodeFence} from "@/components/basics/code-fence/code-fence";


interface RelationViewQueryProps {
    relationId: string;
}

export function RelationViewQueryView(props: RelationViewQueryProps) {


    const showCode = useRelationsState((state) => state.getRelationViewState(props.relationId).showCode, shallow);
    const queryString = useRelationsState((state) => state.getRelation(props.relationId).query.dataQuery, shallow);

    if (!showCode) {
        return null;
    }

    return (
        <div className="px-4 py-2 border-b border-gray-200">
            <CodeFence
                language="sql"
                displayCode={queryString}
                showCopyButton={true}
                readOnly={false}
            />
        </div>
    );
}