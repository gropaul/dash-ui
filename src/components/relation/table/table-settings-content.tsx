import React from "react";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {ChevronRight, Columns3, RotateCcw} from "lucide-react";
import {ContentSelectColumns} from "@/components/relation/table/table-column/content-select-columns";
import {getInitialTableDisplayStateEmpty} from "@/model/relation-view-state/table";
import {getInitialTableQueryParameters} from "@/model/relation-state";
import {useRelationColumns} from "@/state/relations-data.state";
import {RelationSettingsProps} from "@/components/relation/relation-settings";

export function TableSettingsContent(props: RelationSettingsProps) {

    const columns = useRelationColumns(props.relationState);

    const tableState = props.relationState.viewState.tableState;

    function onShowStatsChange() {
        props.updateRelationViewState({
            tableState: {
                ...props.relationState.viewState.tableState,
                showStats: !tableState.showStats
            }
        });
    }

    async function resetTableViewState() {
        const relationCopy = {...props.relationState};
        relationCopy.viewState.tableState = getInitialTableDisplayStateEmpty();
        relationCopy.viewState.tableState.showStats = props.relationState.viewState.tableState.showStats;
        props.updateRelation(relationCopy);

        await props.updateRelationDataWithParams({
            ...props.relationState.query.viewParameters,
            table: getInitialTableQueryParameters()
        })
    }

    return <>

        <DropdownMenuLabel>
            Table Settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator/>

        {/*<DropdownMenuItem>*/}
        {/*    <ChartArea />*/}
        {/*    <span onClick={() => onShowStatsChange()}>*/}
        {/*        {tableState.showStats ? "Hide" : "Show"} Statistics*/}
        {/*    </span>*/}
        {/*</DropdownMenuItem>*/}

        {columns ? (
                <ContentSelectColumns {...props} columnNames={columns.map(col => col.name)}>
                    <Columns3/>
                    Show / Hide Columns <ChevronRight className="ml-auto h-4 w-4"/>
                </ContentSelectColumns>
            )
            : (
                <DropdownMenuItem disabled>
                    <Columns3/>
                    Show / Hide Columns <ChevronRight className="ml-auto h-4 w-4"/>
                </DropdownMenuItem>
            )
        }

        <DropdownMenuSeparator/>
        <DropdownMenuItem onClick={resetTableViewState}>
            <RotateCcw/>
            Reset Table View
        </DropdownMenuItem>
    </>
}
