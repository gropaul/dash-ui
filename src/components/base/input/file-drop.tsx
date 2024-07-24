'use client';

import { DragEvent, useState } from "react";


interface Props {
    onDrop: (files: File[]) => void;
}

export function FileDrop({ onDrop }: Props) {
    const [isOver, setIsOver] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    // Define the event handlers
    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsOver(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsOver(false);

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
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50px",
                width: "100%",
                backgroundColor: isOver ? "rgba(0,0,0,0.05)" : undefined,
            }}
        >
            Drop some files here
        </div>
    );
}
