import {useEffect, useRef, useState} from "react";
import {QueryExecutionMetaData, TaskExecutionState} from "@/model/relation-state";
import {cn} from "@/lib/utils";
import {formatRelativeTime} from "@/platform/string-utils";

export interface RelationExecutionInfoProps {
    executionState: TaskExecutionState;
    lastExecutionMetaData?: QueryExecutionMetaData;
    className?: string;
}

function formatDuration(seconds: number): string {
    if (seconds < 0.001) {
        return '<1ms';
    }
    if (seconds < 1) {
        return `${Math.round(seconds * 1000)}ms`;
    }
    if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

export function RelationExecutionInfo(props: RelationExecutionInfoProps) {
    const {executionState, lastExecutionMetaData, className} = props;
    const [, setTick] = useState(0);
    const [runningElapsed, setRunningElapsed] = useState(0);
    const runningStartRef = useRef<number | null>(null);

    const isRunning = executionState.state === 'running';

    // Track running time
    useEffect(() => {
        if (isRunning) {
            runningStartRef.current = Date.now();
            setRunningElapsed(0);

            const interval = setInterval(() => {
                if (runningStartRef.current) {
                    setRunningElapsed((Date.now() - runningStartRef.current) / 1000);
                }
            }, 1000);

            return () => clearInterval(interval);
        } else {
            runningStartRef.current = null;
        }
    }, [isRunning]);

    // Refresh every minute to update relative time
    useEffect(() => {
        if (!lastExecutionMetaData?.lastExecutedAt) return;

        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);

        return () => clearInterval(interval);
    }, [lastExecutionMetaData?.lastExecutedAt]);

    if (isRunning) {
        const elapsedSeconds = Math.floor(runningElapsed);
        const elapsedDisplay = elapsedSeconds < 60
            ? `${elapsedSeconds}s`
            : `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
        return (
            <span className={cn("text-muted-foreground text-left", className, "leading-none")}>
                Running since {elapsedDisplay}
            </span>
        );
    }

    if (!lastExecutionMetaData) {
        return null;
    }

    const duration = 'Took ' + formatDuration(lastExecutionMetaData.lastExecutionDuration);
    const lastExecutedAt = lastExecutionMetaData.lastExecutedAt
        ? formatRelativeTime(lastExecutionMetaData.lastExecutedAt)
        : null;

    return (
        <span className={cn("text-muted-foreground text-left", className, "leading-none")}>
            · {duration}{lastExecutedAt && ` · ${lastExecutedAt}`}
        </span>
    );
}