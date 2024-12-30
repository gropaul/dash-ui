import {RelationState} from "@/model/relation-state";
import React from "react";
import {ChevronFirst, ChevronLast, ChevronLeft, ChevronRight} from "lucide-react";
import {useRelationsState} from "@/state/relations.state";
import {useConnectionsState} from "@/state/connections.state";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

export interface RelationViewFooterProps {
    relation: RelationState
}

function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function TableFooter(props: RelationViewFooterProps) {

    const lastResultCount = props.relation.lastExecutionMetaData?.lastResultCount || 0;

    const startIndex = props.relation.query.viewParameters.offset + 1;
    const endIndex = Math.min(props.relation.query.viewParameters.offset + props.relation.query.viewParameters.limit, lastResultCount);
    const testShowingRange = `${formatNumber(startIndex)} to ${formatNumber(endIndex)} of ${formatNumber(lastResultCount)}`;

    const connectionName = useConnectionsState((state) => state.getConnectionName(props.relation.connectionId));
    return (
        <div className="flex h-8 flex-row items-center p-2 border-t border-border text-sm text-primary space-x-4">
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

    if (!totalCount) {
        return null;
    }

    const currentPageIndex = Math.floor(relation.query.viewParameters.offset / relation.query.viewParameters.limit);
    const maxPageIndex = Math.floor((totalCount - 1) / relation.query.viewParameters.limit);
    const minPageIndex = 0;
    const text = `Page ${formatNumber(currentPageIndex + 1)} of ${formatNumber(maxPageIndex + 1)}`;

    const iconSize = 16;
    const updateRelationDisplayRange = useRelationsState((state) => state.updateRelationDataWithParams);

    const isFirstPage = currentPageIndex === 0;
    const isLastPage = currentPageIndex === maxPageIndex;

    const handleUpdateRange = (pageIndex: number) => {

        const offsetForPage = pageIndex * relation.query.viewParameters.limit;
        const currentQueryParams = relation.query.viewParameters;
        const updatedQueryParams = {
            ...currentQueryParams,
            offset: offsetForPage
        }
        updateRelationDisplayRange(relation.id, updatedQueryParams);
    };

    const pageSize = relation.query.viewParameters.limit;

    function handlePageSizeChange(value: string) {
        const newPageSize = parseInt(value);
        const currentQueryParams = relation.query.viewParameters;
        const updatedQueryParams = {
            ...currentQueryParams,
            limit: newPageSize,
            offset: 0
        }
        updateRelationDisplayRange(relation.id, updatedQueryParams);
    }

    const limitOptions = [10, 20, 50, 100, 200];
    if (!limitOptions.includes(pageSize)) {
        limitOptions.push(pageSize);
    }

    const options = limitOptions.map((limit) => (
        {value: limit.toString(), label: `Show ${limit}`}
    ));

    return (
        <div className="flex flex-row items-center space-x-1 text-primary font-normal">
            <Select onValueChange={handlePageSizeChange} defaultValue={pageSize.toString()}>
                <SelectTrigger className={'text-primary border-0 focus:outline-none w-32 font-normal'}>
                    <SelectValue placeholder="Select a size"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value} className={'h-8 font-normal'}>
                                <SelectLabel className={'font-normal'}>{option.label}</SelectLabel>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            <button
                className={`transition-all rounded ${isFirstPage ? 'opacity-50 cursor-not-allowed text-muted-foreground' : 'hover:bg-muted active:bg-muted-foreground'}`}
                onClick={() => handleUpdateRange(minPageIndex)}
                disabled={isFirstPage}
            >
                <ChevronFirst size={iconSize}/>
            </button>
            <button
                className={`transition-all rounded ${isFirstPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted active:bg-muted-foreground'}`}
                onClick={() => handleUpdateRange(Math.max(minPageIndex, currentPageIndex - 1))}
                disabled={isFirstPage}
            >
                <ChevronLeft size={iconSize}/>
            </button>
            <div>{text}</div>
            <button
                className={`transition-all rounded ${isLastPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted active:bg-muted-foreground'}`}
                onClick={() => handleUpdateRange(Math.min(maxPageIndex, currentPageIndex + 1))}
                disabled={isLastPage}
            >
                <ChevronRight size={iconSize}/>
            </button>
            <button
                className={`transition-all rounded ${isLastPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted active:bg-muted-foreground'}`}
                onClick={() => handleUpdateRange(maxPageIndex)}
                disabled={isLastPage}
            >
                <ChevronLast size={iconSize}/>
            </button>
        </div>
    );
}
