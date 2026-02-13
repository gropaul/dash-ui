import React from "react";
import {ColumnHeadProps} from "@/components/relation/table/table-head/table-column-head";
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {ChartArea, Check, ChevronRight, Columns3, Copy, EyeOff, Filter, RotateCcw} from "lucide-react";

import {AdaptiveEyeOff} from "@/components/relation/common/eye-icon";
import {ContentSelectColumns} from "@/components/relation/table/table-column/content-select-columns";
import {RelationViewTableContentProps} from "@/components/relation/table/table-content";
import {RelationViewProps} from "@/components/relation/relation-view";
import {getInitialTableDisplayStateEmpty} from "@/model/relation-view-state/table";
import {getInitialTableQueryParameters} from "@/model/relation-state";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {useRelationColumns, useRelationData} from "@/state/relations-data.state";
import {RelationSettings} from "@/components/relation/relation-settings";

export function TableSettingsContent(props: RelationSettings) {

    const columns = useRelationColumns(props.relationState);

    const tableState = props.relationState.viewState.tableState;

    function onShowStatsChange() {
        const current = tableState.showStats;
        let next;
        if (current === undefined) {
            next = true;
        } else {
            next = !current;
        }
        props.updateRelationViewState({
            tableState: {
                ...props.relationState.viewState.tableState,
                showStats: next
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
        <DropdownMenuContent
            side="bottom"
            align={props.align ?? "start"}
        >
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

            { columns ? (
                <ContentSelectColumns {...props} columnNames={columns.map(col => col.name)}>
                    <Columns3 />
                    Show / Hide Columns <ChevronRight className="ml-auto h-4 w-4"/>
                </ContentSelectColumns>
            )
                : (
                    <DropdownMenuItem disabled>
                        <Columns3 />
                        Show / Hide Columns <ChevronRight className="ml-auto h-4 w-4"/>
                    </DropdownMenuItem>
                )
            }

            <DropdownMenuSeparator/>
            <DropdownMenuItem onClick={resetTableViewState}>
                <RotateCcw />
                Reset Table View
            </DropdownMenuItem>


        </DropdownMenuContent>
    </>
}
