'use client';

import {DragEvent, ReactNode, useState} from "react";


interface Props {
    className?: string;
    onDrop: (files: File[]) => void;
    onOverUpdate?: (isOver: boolean, files: File[]) => void;
    children?: ReactNode;
}

export function FileDrop({ className, onDrop, children, onOverUpdate}: Props) {
    const [isOver, setIsOver] = useState(false);
    const [_files, setFiles] = useState<File[]>([]);

    // Define the event handlers
    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);

        if (!isOver) {
            setIsOver(true);
            onOverUpdate && onOverUpdate(true, files);
        }
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);

        if (isOver) {
            setIsOver(false);
            onOverUpdate && onOverUpdate(false, files);
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsOver(false);
        onOverUpdate && onOverUpdate(false, []);

        // Fetch the files
        const droppedFiles = Array.from(event.dataTransfer.files);
        setFiles(droppedFiles);

        // Use FileReader to read file content
        droppedFiles.forEach((file) => {

            onDrop(droppedFiles);
            const reader = new FileReader();

            reader.onerror = () => {
                console.error("There was an issue reading the file.");
            };

            reader.readAsDataURL(file);
            return reader;
        });
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
