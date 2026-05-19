import {memo} from "react";
import {Table} from "@/components/relation/table/table";
import {Chart} from "@/components/relation/chart/chart";
import {Select} from "@/components/relation/select/select";
import {RelationViewProps} from "@/components/relation/relation-view";
import {Slider} from "@/components/relation/slider/slider";
import {TextDisplay} from "@/components/relation/text-display/text-display";
import {RelationData} from "@/model/relation";
import {useRelationData} from "@/state/relations-data.state";
import {RelationViewContentEmpty} from "@/components/relation/relation-view-content-empty";

const DATA_QUERY = "SELECT\n" +
    "     TO_JSON(LIST(geo_lng)) AS lng_list_json,\n" +
    "     TO_JSON(LIST(geo_lat)) AS lat_list_json,\n" +
    "     TO_JSON(LIST(name_long)) AS name_list_json\n" +
    " FROM (\n" +
    "     SELECT geo_lng, geo_lat, name_long\n" +
    "     FROM stations\n" +
    "     LIMIT 100\n" +
    " ) sub;\n";

export interface RelationViewContentProps extends RelationViewProps {
    data: RelationData;
}

export const RelationViewContent = memo(function RelationViewContent(props: RelationViewProps) {

    const selectedView = props.relationState.viewState.selectedView;
    const data = useRelationData(props.relationState);

    async function onRunQuery() {
        // we need to reset the view params as the could be columns removed now that had filters before!
        await props.updateRelationDataWithBaseQuery(props.relationState.query.baseQuery);
    }

    if (!data) {
        return <RelationViewContentEmpty onRunClick={onRunQuery} {...props}/>
    }

    const contentProps: RelationViewContentProps = {
        ...props,
        data: data,
    }
    const wrapperClass = props.height === 'fit' ? 'p-2 flex items-center h-full w-full' : 'w-full';

    if (selectedView === 'table') {
        return (
            <Table {...contentProps}/>
        );
    } else if (selectedView === 'chart') {
        return (
            <Chart {...contentProps}/>
        );
    } else if (selectedView === 'select') {
        return (
            <div className={wrapperClass}>
                <Select {...contentProps} />
            </div>
        );
    } else if (selectedView === 'slider'){
        return (
            <div className={wrapperClass}>
                <Slider {...contentProps} />
            </div>
        );
    } else if (selectedView === 'text') {
        return (
            <TextDisplay {...contentProps}/>
        );
    } else {
        return (
            <div>Unknown view type: "{selectedView}"</div>
        );
    }
});