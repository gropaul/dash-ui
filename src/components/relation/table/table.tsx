import {RelationViewState, TableViewState} from "@/components/relation/relation-view";
import {RelationState} from "@/model/relation-state";
import {TableContent} from "@/components/relation/table/table-content";
import {TableFooter} from "@/components/relation/table/table-footer";


export function getInitialTableDisplayState(relation: RelationState): TableViewState {
    return {
        columnStates: relation.columns.map(() => ({
            width: 192,
            wrapContent: false,
        })),
    };
}


export interface RelationViewTableProps {
    relation: RelationState;
    viewState: RelationViewState;
    setViewState: (state: RelationViewState) => void;

}

export function Table(props: RelationViewTableProps) {

    const tableState = props.viewState.tableState;
    const relation = props.relation;

    function setTableState(state: TableViewState) {
        props.setViewState({
            ...props.viewState,
            tableState: state,
        });
    }

    return (
        <div className="flex flex-col w-full h-full">
            <div className="relative overflow-y-auto flex-1 flex flex-row">
                <TableContent
                    relation={relation}
                    displayState={tableState}
                    setDisplayState={setTableState}
                />
            </div>
            <TableFooter relation={relation}/>
        </div>
    )
}