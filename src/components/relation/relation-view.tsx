import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {shallow} from "zustand/shallow";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {
    const relationExists = useRelationsState(
        (state) => state.doesRelationExist(props.relationId),
        shallow
    );

    const queryState = useRelationsState(
        (state) => state.getRelation(props.relationId).executionState,
        shallow
    );

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (queryState === "running") {
            timer = setTimeout(() => {
                setIsLoading(true);
            }, LOADING_TIMER_OFFSET);
        } else {
            setIsLoading(false);
            if (timer) {
                clearTimeout(timer);
            }
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [queryState]);

    if (!relationExists) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center">
                <div className="text-gray-500">
                    Relation {props.relationId} not found
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full relative p-0 m-0">
            <RelationViewHeader relationId={props.relationId} />
            <RelationViewQueryView relationId={props.relationId} />
            <div className="relative overflow-y-auto flex-1">
                <RelationViewContent relationId={props.relationId} />
                {isLoading && <div className={`absolute top-0 left-0 w-full h-full bg-white bg-opacity-70 z-10 flex items-center justify-center transition-opacity duration-200 opacity-100`}/>}
           </div>
        </div>
    );
}

//
//
