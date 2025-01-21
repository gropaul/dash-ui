import React, {RefObject, useEffect, useRef, useState} from "react";
import {cn} from "@/lib/utils";
import {FocusStateResolved} from "@/components/dashboard/dashboard-content";

export interface EditableTextProps {
    text: string;
    id?: string;
    placeholder?: string;
    onlyShowPlaceholderIfFocused?: boolean;
    onTextChange?: (newText: string) => void;
    className?: string;
    focus?: FocusStateResolved;

    contentRef?: RefObject<HTMLDivElement>;

    onFocused?: () => void;
}

function empty(text: string, trim = false) {
    if (trim) {
        return text.trim() === "";
    } else {
        return text === "";
    }
}
function prepInnerText(text: string) {
    // there is sometimes a newline at the end of the text, remove it
    if (text.endsWith("\n")) {
        return text.slice(0, -1);
    } else {
        return text;
    }
}

export function EditableTextBase(props: EditableTextProps) {
    const [localText, setLocalText] = useState(props.text);
    const [needsPlaceholder, setNeedsPlaceholder] = useState(empty(props.text));

    const localContentRef = useRef<HTMLDivElement>(null);
    const contentRef = props.contentRef || localContentRef;

    // Listen for external changes to the text
    useEffect(() => {
        if (props.text !== contentRef.current?.innerText) {
            setLocalText(props.text);
            setNeedsPlaceholder(empty(props.text));
        }
    }, [props.text]);

    const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
        const innerText = prepInnerText(event.currentTarget.innerText);
        setNeedsPlaceholder(empty(innerText));
        if (props.onTextChange) {
            props.onTextChange(event.currentTarget.innerText);
        }
    };

    const placeholder = props.placeholder || "Enter text";
    const onlyShowPlaceholderIfFocused = props.onlyShowPlaceholderIfFocused || false;
    const showPlaceholder = needsPlaceholder && (!onlyShowPlaceholderIfFocused || props.focus?.focused);

    const localTextLines = localText.split("\n");
    const linesEmpty = localTextLines.every((line) => empty(line, true));

    return (
        <div className={cn("relative w-full", props.className)}>
            {/* Editable div */}
            <div
                id={props.id}
                className={cn("outline-none w-full min-w-20", props.className)}
                ref={contentRef}
                onFocus={props.onFocused}
                onInput={handleInput}
                contentEditable={!!props.onTextChange}
                suppressContentEditableWarning
            >
                {linesEmpty ? (
                    localText
                ) : (
                    localTextLines.map((line, index) => (
                        <React.Fragment key={index}>
                            <span>{line}</span>
                            {index < localTextLines.length - 1 && (
                                <br/>
                            )}
                        </React.Fragment>
                    ))
                )}


            </div>
            {/* Placeholder */}
            {showPlaceholder && (
                <span contentEditable={false} className="text-muted-foreground absolute top-0 left-0 pointer-events-none opacity-50">
                    {placeholder}
                </span>
            )}
        </div>
    );
}
