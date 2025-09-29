import {Table} from "@/components/relation/table/table";
import {Chart} from "@/components/relation/chart/chart";
import {TextSelect} from "@/components/relation/text-input/text-select";
import {RelationViewProps} from "@/components/relation/relation-view";
import {TextField} from "@/components/relation/text-input/text-field";
import {RelationData} from "@/model/relation";
import {useRelationData} from "@/state/relations-data.state";
import {RelationViewContentEmpty} from "@/components/relation/relation-view-content-empty";
import {getUpdatedParams} from "@/model/relation-state";

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

export function RelationViewContent(props: RelationViewProps) {

    const relationId = props.relationState.id;
    const selectedView = props.relationState.viewState.selectedView;
    const data = useRelationData(props.relationState);

    async function onRunQuery() {
        // we need to reset the view params as the could be columns removed now that had filters before!
        await props.updateRelationDataWithParams(getUpdatedParams(props.relationState.query.viewParameters));
    }

    if (!data) {
        return <RelationViewContentEmpty onRunClick={onRunQuery} {...props}/>
    }

    const contentProps: RelationViewContentProps = {
        ...props,
        data: data,
    }

    if (selectedView === 'table') {
        return (
            <Table {...contentProps}/>
        );
    } else if (selectedView === 'chart') {
        return (
            <Chart {...contentProps}/>
        );
    } else if (selectedView === 'select') {
        switch (props.relationState.viewState.inputTextState.inputType) {
            case 'select':
                return (
                    <TextSelect {...contentProps} />
                );
            case 'fulltext':
                return (
                    <TextField {...contentProps} />
                );
        }

    } else {
        return (
            <div>Unknown view type: {selectedView}</div>
        );
    }
}