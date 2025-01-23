import React, {RefObject, useEffect, useRef, useState} from "react";
import {cn} from "@/lib/utils";

export interface EditableTextProps {
    text: string;
    placeholder?: string;
    onlyShowPlaceholderIfFocused?: boolean;
    onTextChange?: (newText: string) => void;
    className?: string;
    focused?: boolean;

    contentRef?: RefObject<HTMLDivElement>;

    onFocused?: () => void;
    onEnter?: () => void;
    onLastDelete?: () => void;
    onEscape?: () => void;

    onLastArrowUp?: (offset: number) => void;
    onLastArrowDown?: (offset: number) => void;
    onLastArrowLeft?: (offset: number) => void;
    onLastArrowRight?: (offset: number) => void;
}

interface CursorPosition {
    globalOffset: number; // the offset of the cursor in the whole text
    lineOffset: number;   // the offset of the cursor in the current line
    lineIndex: number;    // the index of the current line

    totalNumberOfLines: number;       // total number of lines in the text
    totalNumberOfCharacters: number;  // total number of characters in the text
}

// Simple utility to check for empty string
function empty(text: string, trim = false) {
    return trim ? text.trim() === "" : text === "";
}

// Optionally remove a trailing newline from the user's input
function prepInnerText(text: string) {
    return text.endsWith("\n") ? text.slice(0, -1) : text;
}

export function EditableTextBase(props: EditableTextProps) {
    const [localText, setLocalText] = useState(props.text);
    const [needsPlaceholder, setNeedsPlaceholder] = useState(empty(props.text));

    const localContentRef = useRef<HTMLDivElement>(null);
    const contentRef = props.contentRef || localContentRef;

    // Update local text if the prop text changes outside
    useEffect(() => {
        if (props.text !== contentRef.current?.innerText) {
            // print both text's ascii values
            console.log('Local text:', localText.split('').map(c => c.charCodeAt(0)));
            console.log('Prop text: ', props.text.split('').map(c => c.charCodeAt(0)));
            console.log('Changing text');
            setLocalText(props.text);
            setNeedsPlaceholder(empty(props.text));
        }
    }, [props.text]);

    const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
        const innerText = prepInnerText(event.currentTarget.innerText);

        setNeedsPlaceholder(empty(innerText));
        if (props.onTextChange) {
            props.onTextChange(innerText);
        }
    };


    const placeholder = props.placeholder || "Enter text";
    const onlyShowPlaceholderIfFocused = props.onlyShowPlaceholderIfFocused || false;
    const showPlaceholder = needsPlaceholder && (!onlyShowPlaceholderIfFocused || props.focused);

    return (
        <div className={cn("relative", props.className)}>
            <div
                ref={contentRef}
                className={cn("outline-none w-fit min-w-20", props.className)}
                style={{ whiteSpace: "pre-wrap" }} // Important for displaying "\n" as line breaks
                contentEditable={!!props.onTextChange}
                suppressContentEditableWarning
                onFocus={props.onFocused}
                onInput={handleInput}
            >
                {localText}
            </div>

            {showPlaceholder && (
                <span className="text-muted-foreground absolute top-0 left-0 pointer-events-none opacity-50">
          {placeholder}
        </span>
            )}
        </div>
    );
}
