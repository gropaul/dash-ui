import {Table} from "@/components/relation/table/table";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {useState} from "react";
import {Chart} from "@/components/relation/chart/chart";


export interface RelationViewContentProps {
    relationId: string;
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

export function RelationViewContent({relationId}: RelationViewContentProps) {

    const selectedView = useRelationsState((state) => state.getRelationViewState(relationId).selectedView, shallow);
    const [data, setData] = useState<any[]>([]);

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
            <Table relationId={relationId}/>
        );
    /* } else if (selectedView === 'map') {
        return (
            <Map relationId={relationId} data={data}/>
        );
    */
    } else if (selectedView === 'chart') {
        return (
            <Chart relationId={relationId}/>
        );

    } else {
        return (
            <div>Unknown view</div>
        );
    }
}