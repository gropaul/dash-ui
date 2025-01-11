import {Table} from "@/components/relation/table/table";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {useState} from "react";
import {Chart} from "@/components/relation/chart/chart";
import {RelationState} from "@/model/relation-state";
import {DeepPartial} from "@/platform/utils";
import {RelationViewState} from "@/model/relation-view-state";


export interface RelationViewContentProps {
    relationState: RelationState
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
}

const DATA_QUERY = "SELECT\n" +
    "     TO_JSON(LIST(geo_lng)) AS lng_list_json,\n" +
    "     TO_JSON(LIST(geo_lat)) AS lat_list_json,\n" +
    "     TO_JSON(LIST(name_long)) AS name_list_json\n" +
    " FROM (\n" +
    "     SELECT geo_lng, geo_lat, name_long\n" +
    "     FROM stations\n" +
    "     LIMIT 100\n" +
    " ) sub;\n";

export function RelationViewContent(props: RelationViewContentProps) {

    const selectedView = props.relationState.viewState.selectedView;

    /*
    useEffect(() => {
        ConnectionsService.getInstance().getConnection(CONNECTION_ID_DUCKDB_LOCAL).executeQuery(DATA_QUERY).then((result) => {

            const data = [
                {
                    type: "scattermap",
                    mode: "markers+text", // Add 'text' to the mode to show text
                    // custom marker:
                    marker:  {
                        size: 8,
                        color: "#0b4e7c",
                    },
                    hoverlabel: {
                        shadow: 'auto',
                    },
                    lon: JSON.parse(result.rows[0][0]), // Parse longitude list
                    lat: JSON.parse(result.rows[0][1]), // Parse latitude list
                    text: JSON.parse(result.rows[0][2]), // Parse name list
                    textposition: "right", // Set text position
                    textfont: {
                        color: "black",
                    }, // Set text color

                },
            ];

            setData(data);
        });
    }, []);
     */

    if (selectedView === 'table') {
        return (
            <Table
                relationState={props.relationState}
                updateRelationViewState={props.updateRelationViewState}
            />
        );
    /* } else if (selectedView === 'map') {
        return (
            <Map relationId={relationId} data={data}/>
        );
    */
    } else if (selectedView === 'chart') {
        return (
            <Chart
                relationState={props.relationState}
                updateRelationViewState={props.updateRelationViewState}
            />
        );

    } else {
        return (
            <div>Unknown view</div>
        );
    }
}