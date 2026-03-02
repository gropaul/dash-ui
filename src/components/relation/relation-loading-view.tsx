import {Loader2, Pause} from "lucide-react";
import {Button} from "@/components/ui/button";
import React from "react";

interface RelationLoadingViewProps {
    cancelQuery: () => void;
}

export function RelationLoadingView(props: RelationLoadingViewProps) {
    return (
        <div
            className="absolute top-0 left-0 w-full h-full z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-200"
            style={{
                opacity: 0.8,
            }}
        >
            <div className="flex items-center space-x-3 text-lg font-medium text-foreground">
                <Loader2 className="h-6 w-6 animate-spin"/>
                <span>Loading...</span>
            </div>
            <Button
                className="mt-2 flex items-center"
                variant="ghost"
                size="icon"
                onClick={props.cancelQuery}
            >
                <Pause size={24}/>
            </Button>
        </div>
    )
}