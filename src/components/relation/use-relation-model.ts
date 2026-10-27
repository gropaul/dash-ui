import {useCallback, useEffect, useMemo} from "react";
import {RelationState} from "@/model/relation-state";
import {deepEqual} from "@/platform/object-utils";
import {buildRelation, headerOf, RelationConfig, withRuntime} from "@/state/workspace/relation-config";
import {useSurfaces} from "@/state/workspace/surfaces.state";

/**
 * The relation a query or page block shows, built from its config (`config`, as its file holds it) and its
 * in-memory state. `updateRelation` keeps the whole relation in memory and writes what changed of the config
 * back through `write`; picks, runs and paging never reach the file. `input` is the query a block takes in.
 * Undefined without a config, so a block can call it whatever it shows.
 */
export function useRelationModel(
    config: RelationConfig | undefined,
    write: (sql: string, header: Record<string, string>) => void,
    input?: RelationState,
): RelationModel | undefined {
    const stored = useSurfaces(s => config ? s.relations[config.id] : undefined);
    const built = useMemo(() => config && buildRelation(config, input), [config, input]);
    const relation = useMemo(() => built && config && withRuntime(built, stored, config), [built, stored, config]);

    // The store holds what is shown, so refs and re-runs of other blocks read it.
    useEffect(() => {
        if (relation && relation !== stored) useSurfaces.getState().set(relation);
    }, [relation, stored]);

    const updateRelation = useCallback((next: RelationState) => {
        useSurfaces.getState().set(next);
        if (!config) return;
        // A block taking a query in has no SQL of its own.
        const sql = input ? config.sql : next.query.baseQuery;
        const header = headerOf(next, config, input);
        if (sql !== config.sql || !deepEqual(header, config.header)) write(sql, header);
    }, [config, input, write]);

    return useMemo(() => relation && {relation, updateRelation}, [relation, updateRelation]);
}

export interface RelationModel {
    relation: RelationState;
    updateRelation: (relation: RelationState) => void;
}
