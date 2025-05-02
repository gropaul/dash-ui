import {Table} from "@/components/relation/table/table";
import {Chart} from "@/components/relation/chart/chart";
import {Select} from "@/components/relation/select/select";
import {RelationViewProps} from "@/components/relation/relation-view";

const DATA_QUERY = "SELECT\n" +
    "     TO_JSON(LIST(geo_lng)) AS lng_list_json,\n" +
    "     TO_JSON(LIST(geo_lat)) AS lat_list_json,\n" +
    "     TO_JSON(LIST(name_long)) AS name_list_json\n" +
    " FROM (\n" +
    "     SELECT geo_lng, geo_lat, name_long\n" +
    "     FROM stations\n" +
    "     LIMIT 100\n" +
    " ) sub;\n";

export function RelationViewContent(props: RelationViewProps) {

    const selectedView = props.relationState.viewState.selectedView;

    if (selectedView === 'table') {
        return (
            <Table {...props}/>
        );
    } else if (selectedView === 'chart') {
        return (
            <Chart {...props}/>
        );
    } else if (selectedView === 'select') {
        return (
            <Select {...props}/>
        );

    } else {
        return (
            <div>Unknown view</div>
        );
    }
}