import {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";
import {TaskExecutionState} from "@/model/relation-state";


interface RelationViewHeaderBorderProps {
    state: TaskExecutionState;
}


export function RelationViewHeaderBorder({state}: RelationViewHeaderBorderProps) {


    const [showLoading, setShowLoading] = useState(false);


    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (state.state === 'running') {
            // Set a delay before showing the animation
            timer = setTimeout(() => {
                setShowLoading(true);
            }, LOADING_TIMER_OFFSET);
        } else {
            // If the query state changes from running, reset the loading state
            setShowLoading(false);
            if (timer) {
                clearTimeout(timer);
            }
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [state]);

    return (
        <div className="relative w-full h-[1px] bg-border overflow-hidden">
            {state.state === 'running' && showLoading ? (
                // Animated loading indicator
                <div className="absolute top-0 left-0 w-full h-full bg-secondary animate-loading"/>
            ) : (
                // Solid border for idle state
                <div className="absolute top-0 left-0 w-full h-full bg-border"/>
            )}
            <style jsx>{`
                @keyframes loading {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }

                .animate-loading {
                    background: linear-gradient(
                            90deg,
                            black 0%,
                            rgba(0, 0, 0, 0.7) 50%,
                            black 100%
                    );
                    animation: loading 1.5s infinite;
                }
            `}</style>
        </div>
    );
}
