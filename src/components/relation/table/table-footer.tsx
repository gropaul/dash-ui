import {RelationState} from "@/model/relation-state";
import React from "react";
import {ChevronFirst, ChevronLast, ChevronLeft, ChevronRight} from "lucide-react";
import {useRelationsState} from "@/state/relations.state";
import {useConnectionsState} from "@/state/connections.state";


export interface RelationViewFooterProps {
    relation: RelationState
}

function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function TableFooter(props: RelationViewFooterProps) {

    const lastResultCount = props.relation.lastExecutionMetaData?.lastResultCount || 0;

    // format the number with , e.g. 1,000,000
    const startIndex = props.relation.query.viewParameters.offset + 1;

    const endIndex = Math.min(props.relation.query.viewParameters.offset + props.relation.query.viewParameters.limit, lastResultCount);
    const testShowingRange = `${formatNumber(startIndex)} to ${formatNumber(endIndex)} of ${formatNumber(lastResultCount)}`;

    const connectionName = useConnectionsState((state) => state.getConnectionName(props.relation.connectionId));
    return (
        <div className="flex flex-row items-center p-2 border-t border-gray-200 text-sm space-x-4">
            <div className="flex flex-row items-center space-x-4">
                <RelationViewPageController relation={props.relation}/>
            </div>
            <div className="flex-grow"/>
            <div className="pr-2">
                {testShowingRange}
            </div>
        </div>
    );
}



export function RelationViewPageController(props: RelationViewFooterProps) {
    const {relation} = props;

    const totalCount = relation.lastExecutionMetaData?.lastResultCount;

    // this means there is no data and therefore no pagination
    if (!totalCount) {
        return null;
    }

    const maxPage = Math.ceil(totalCount / relation.query.viewParameters.limit);
    const currentPage = Math.floor(relation.query.viewParameters.offset / relation.query.viewParameters.limit) + 1;
    const text = `Page ${formatNumber(currentPage)} of ${formatNumber(maxPage)}`;

    const iconSize = 16;
    const updateRelationDisplayRange = useRelationsState((state) => state.updateRelationDataWithParams);

    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === maxPage;

    const handleUpdateRange = (offset: number) => {

        const currentQueryParams = relation.query.viewParameters;
        const updatedQueryParams = {
            ...currentQueryParams,
            offset: offset
        }
        updateRelationDisplayRange(relation.id, updatedQueryParams);
    };

    const pageSize = relation.query.viewParameters.limit;
    function handlePageSizeChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const newPageSize = parseInt(event.target.value);
        const currentQueryParams = relation.query.viewParameters;
        const updatedQueryParams = {
            ...currentQueryParams,
            limit: newPageSize,
            offset: 0
        }
        updateRelationDisplayRange(relation.id, updatedQueryParams);
    }

    // default limit options
    const limitOptions = [10, 20, 50, 100, 200];
    // if the current limit is not in the options, add it
    if (!limitOptions.includes(pageSize)) {
        limitOptions.push(pageSize);
    }

    const options = limitOptions.map((limit) => (
        <option key={limit} value={limit}>Show {limit}</option>
    ));

    return (
        <div className="flex flex-row items-center space-x-1">
            <select
                className="p-1 border rounded"
                value={pageSize}
                onChange={handlePageSizeChange}
            >
                {options}
            </select>
            <button
                className={`transition-all rounded ${isFirstPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(0)}
                disabled={isFirstPage}
            >
                <ChevronFirst size={iconSize}/>
            </button>
            <button
                className={`transition-all rounded ${isFirstPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(Math.max(0, relation.query.viewParameters.offset - relation.query.viewParameters.limit))}
                disabled={isFirstPage}
            >
                <ChevronLeft size={iconSize}/>
            </button>
            <div>{text}</div>
            <button
                className={`transition-all rounded ${isLastPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(Math.min(totalCount - relation.query.viewParameters.limit, relation.query.viewParameters.offset + relation.query.viewParameters.limit))}
                disabled={isLastPage}
            >
                <ChevronRight size={iconSize}/>
            </button>
            <button
                className={`transition-all rounded ${isLastPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(Math.max(0, totalCount - relation.query.viewParameters.limit))}
                disabled={isLastPage}
            >
                <ChevronLast size={iconSize}/>
            </button>
        </div>
    );
}
