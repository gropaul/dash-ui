import {useCallback, useMemo} from "react";
import {RelationView} from "@/components/relation/relation-view";
import {useRelationModel} from "@/components/relation/use-relation-model";
import {useFile, useWorkspace} from "@/state/workspace/workspace.state";
import {joinHeader, RelationConfig, splitHeader} from "@/state/workspace/relation-config";
import {queryName} from "@/state/workspace/file-references";

/** A `.sql` file of the workspace, shown and edited as a query. */
export function QueryTab({path}: { path: string }) {
    const text = useFile(path) ?? '';
    const config = useMemo((): RelationConfig => ({id: path, name: queryName(path), ...splitHeader(text)}), [path, text]);
    const write = useCallback((sql: string, header: Record<string, string>) => {
        void useWorkspace.getState().write(path, joinHeader(header, sql));
    }, [path]);
    const {relation, updateRelation} = useRelationModel(config, write)!;

    return <RelationView mode='fullscreen' height='fit' relationState={relation} updateRelation={updateRelation}/>;
}
