import {RelationViewState} from "@/model/relation-view-state";
import React from "react";
import {ChevronFirst, ChevronLast, ChevronLeft, ChevronRight} from "lucide-react";
import {useRelationsState} from "@/state/relations.state";


export interface RelationViewFooterProps {
    relation: RelationViewState
}

function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function RelationViewFooter(props: RelationViewFooterProps) {


    // format the number with , e.g. 1,000,000
    let countText = props.relation.totalCount;
    const startIndex = props.relation.offset + 1;
    const endIndex = Math.min(props.relation.offset + props.relation.limit, props.relation.totalCount);
    const text = `Showing ${formatNumber(startIndex)} to ${formatNumber(endIndex)} of ${formatNumber(countText)}`;

    return (
        <div className="flex flex-row items-center p-2 border-t border-gray-200 text-sm space-x-4">
            <RelationViewPageController relation={props.relation} />
            <div className="mr-2">
                {text}
            </div>
        </div>
    );
}



export function RelationViewPageController(props: RelationViewFooterProps) {
    const { relation } = props;
    const maxPage = Math.ceil(relation.totalCount / relation.limit);
    const currentPage = Math.floor(relation.offset / relation.limit) + 1;
    const text = `Page ${formatNumber(currentPage)} of ${formatNumber(maxPage)}`;

    const iconSize = 16;
    const updateRelationDisplayRange = useRelationsState((state) => state.updateRelationDisplayRange);

    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === maxPage;

    const handleUpdateRange = (offset: number) => {
        updateRelationDisplayRange(relation.id, offset, relation.limit);
    };

    return (
        <div className="flex flex-row items-center space-x-2">
            <button
                className={`transition-all rounded ${isFirstPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(0)}
                disabled={isFirstPage}
            >
                <ChevronFirst size={iconSize} />
            </button>
            <button
                className={`transition-all rounded ${isFirstPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(Math.max(0, relation.offset - relation.limit))}
                disabled={isFirstPage}
            >
                <ChevronLeft size={iconSize} />
            </button>
            <div>{text}</div>
            <button
                className={`transition-all rounded ${isLastPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(Math.min(relation.totalCount - relation.limit, relation.offset + relation.limit))}
                disabled={isLastPage}
            >
                <ChevronRight size={iconSize} />
            </button>
            <button
                className={`transition-all rounded ${isLastPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
                onClick={() => handleUpdateRange(Math.max(0, relation.totalCount - relation.limit))}
                disabled={isLastPage}
            >
                <ChevronLast size={iconSize} />
            </button>
        </div>
    );
}
