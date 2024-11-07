import {Relation} from "@/model/relation";
import React from "react";
import {RelationViewTable} from "@/components/relation/relation-view-table";
import {RelationViewFooter} from "@/components/relation/relation-view-footer";
import {useRelationsState} from "@/state/relations.state";

export interface ColumnDisplayState {
    width: number;
    wrapContent: boolean;
}

export interface RelationTableViewState {
    columnStates: ColumnDisplayState[];
}

export interface RelationViewProps {
    relationId: string;
    displayState?: RelationTableViewState;
}

export function getInitialDisplayState(relation: Relation): RelationTableViewState {
    return {
        columnStates: relation.columns.map(() => ({
            width: 192,
            wrapContent: false,
        })),
    };
}

export function RelationView(props: RelationViewProps) {

    const relation = useRelationsState((state) => state.getRelation(props.relationId));

    if (!relation) {
        return <div>Relation not found: {props.relationId}</div>;
    }

    const [localState, setLocalState] = React.useState<RelationTableViewState>(
        props.displayState || getInitialDisplayState(relation)
    );

    // Update local state when display state changes
    React.useEffect(() => {
        if (props.displayState) {
            setLocalState(props.displayState);
        }
    }, [props.displayState]);

    return (
        <div className="flex flex-col w-full h-full">
            <div className="relative overflow-y-auto flex-1 flex flex-row"> {/* Set a height for scrollable area */}
                <RelationViewTable relation={relation} displayState={localState} setDisplayState={setLocalState}/>
            </div>
            <RelationViewFooter relation={relation}/>
        </div>
    );
}
