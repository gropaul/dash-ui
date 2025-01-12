import { useEffect, useRef, useState } from "react";
import { H5 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export interface EditableTextProps {
    text: string;
    placeholder?: string;
    onTextChange?: (newText: string) => void;
    className?: string;
}

function textIsEmpty(text: string) {
    return text.trim().length === 0;
}

export function EditableTextBase(props: EditableTextProps) {
    const [localText, setLocalText] = useState(props.text);
    const [needsPlaceholder, setNeedsPlaceholder] = useState(textIsEmpty(props.text));
    const spanRef = useRef<HTMLDivElement>(null);

    const handleInput = (event: React.FormEvent<HTMLSpanElement>) => {
        setNeedsPlaceholder(textIsEmpty(event.currentTarget.innerText));
        if (props.onTextChange) {
            props.onTextChange(event.currentTarget.innerText);
        }
    };

    // Listen for outside changes to the text
    useEffect(() => {
        if (props.text !== spanRef.current?.innerText) {
            setLocalText(props.text);
            setNeedsPlaceholder(textIsEmpty(props.text));
        }
    }, [props.text]);

    console.log('needsPlaceholder', needsPlaceholder);
    console.log('props.placeholder', props.placeholder);
    console.log('localText', localText);

    const placeholder = props.placeholder || 'Enter text';


    return (
        <div className={cn("relative", props.className)}>
            {/* Editable span */}
            <div
                className={cn("outline-none w-fit min-w-20", props.className)}
                ref={spanRef}
                onInput={handleInput}
                contentEditable={!!props.onTextChange}
                suppressContentEditableWarning
            >
                {localText}
            </div>
            {/* Placeholder */}
            {needsPlaceholder && (
                <span className="text-muted-foreground absolute top-0 left-0 pointer-events-none opacity-50">
                    {placeholder}
                </span>
            )}
        </div>
    );
}
