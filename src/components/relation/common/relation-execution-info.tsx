import {useEffect, useRef, useState} from "react";
import {QueryExecutionMetaData, TaskExecutionState} from "@/model/relation-state";
import {cn} from "@/lib/utils";

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

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) {
        return 'Just now';
    }
    if (minutes === 1) {
        return '1 min ago';
    }
    if (minutes < 60) {
        return `${minutes} mins ago`;
    }
    if (hours === 1) {
        return '1 hour ago';
    }
    if (hours < 24) {
        return `${hours} hours ago`;
    }
    if (days === 1) {
        return '1 day ago';
    }
    return `${days} days ago`;
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
            {duration}{lastExecutedAt && ` · ${lastExecutedAt}`}
        </span>
    );
}