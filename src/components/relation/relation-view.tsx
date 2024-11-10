import {RelationState} from "@/model/relation-state";
import {getInitialTableDisplayState, Table} from "@/components/relation/table/table";
import {useRelationsState} from "@/state/relations.state";
import {useState} from "react";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";

export interface ColumnDisplayState {
    width: number;
    wrapContent: boolean;
}


type RelationViewType = 'table' | 'chart';

export interface RelationViewState {
    selectedView: RelationViewType;
    tableState: TableViewState
}

export interface TableViewState {
    columnStates: ColumnDisplayState[];
}


export interface RelationViewProps {
    relationId: string;
    displayState?: RelationViewState;
}

export function getInitialRelationViewState(relation?: RelationState): RelationViewState {

    if (!relation) {
        return {
            selectedView: 'table',
            tableState: {
                columnStates: [],
            },
        };
    }

    return {
        selectedView: 'table',
        tableState: getInitialTableDisplayState(relation),
    };
}

export function RelationView(props: RelationViewProps) {

    const relation = useRelationsState((state) => state.getRelation(props.relationId));

    const [viewState, setViewState] = useState<RelationViewState>(getInitialRelationViewState(relation));

    if (!relation) {
        return <div>Relation not found: {props.relationId}</div>;
    }

    return (
        <div className="flex flex-col w-full h-full">
            <RelationViewHeader relation={relation} viewState={viewState} setViewState={setViewState}/>
            <div className="relative overflow-y-auto flex-1">
                <RelationViewContent relation={relation} viewState={viewState} setViewState={setViewState}/>
            </div>
        </div>
    );
}
