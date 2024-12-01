'use client';

import {DragEvent, ReactNode, useState} from "react";

interface Props {
    className?: string;
    onDrop: (files: File[]) => void;
    onOverUpdate?: (isOver: boolean, files: File[]) => void;
    children?: ReactNode;
}

export function FileDrop({ className, onDrop, onOverUpdate, children }: Props) {
    const [isOver, setIsOver] = useState(false);

    // Helper function to check if the drag event contains files
    const containsFiles = (event: DragEvent<HTMLDivElement>) => {
        return Array.from(event.dataTransfer.items).some(item => item.kind === 'file');
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (containsFiles(event) && !isOver) {
            setIsOver(true);
            onOverUpdate && onOverUpdate(true, Array.from(event.dataTransfer.files));
        }
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        // Trigger only when truly leaving the component, not internal child components
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            if (isOver) {
                setIsOver(false);
                if (onOverUpdate) {
                    const files = Array.from(event.dataTransfer.files);
                    onOverUpdate(false, files);
                }
            }
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsOver(false);
        if (onOverUpdate) {
            onOverUpdate(false, Array.from(event.dataTransfer.files));
        }

        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length) {
            onDrop(droppedFiles);
        }
    };

    return (
        <div className={className}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
        >
            {children}
        </div>
    );
}
