import {Button} from "@/components/ui/button";
import {RunButton} from "@/components/basics/sql-editor/run-button-content";
import {RelationViewProps} from "@/components/relation/relation-view";

export interface RelationViewContentEmptyProps extends RelationViewProps{
    onRunClick?: () => void;
}

export function RelationViewContentEmpty(props: RelationViewContentEmptyProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="text-gray-500 mt-1">Nothing to show (yet)</div>
            <div className="text-gray-400 text-sm ">Run the query to see the results here.</div>
            <div className="mt-1">
                <Button
                    variant={'ghost'}
                    onClick={props.onRunClick}
                    className="w-32"
                >
                    <RunButton testMargin={'w-[32px]'} runText="Run Query" executionState={props.relationState.executionState}/>
                </Button>
            </div>
        </div>
    );
}