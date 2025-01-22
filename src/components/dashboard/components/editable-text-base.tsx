import React, {RefObject, useEffect, useRef, useState} from "react";
import {FocusStateResolved} from "@/components/dashboard/dashboard-content";

function setCursorPosition(element: HTMLDivElement, position: number) {
    const selection = window.getSelection();
    const range = document.createRange();

    // Safety checks
    if (!selection || !element.firstChild) return;

    // If the content is empty, just select the element
    // Otherwise select the text node and set the correct offset
    if (element.firstChild.nodeType === Node.TEXT_NODE) {
        range.setStart(element.firstChild, Math.min(position, element.firstChild.nodeValue?.length ?? 0));
    } else {
        // If there's no text node, fallback to zero
        range.setStart(element, 0);
    }
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
}

export interface EditableTextProps {
    text: string;
    id?: string;
    placeholder?: string;
    onlyShowPlaceholderIfFocused?: boolean;
    onTextChange?: (newText: string) => void;
    className?: string;
    focusStateResolved?: FocusStateResolved;
    contentRef?: RefObject<HTMLDivElement>;
    onFocused?: () => void;
}

function empty(text: string, trim = false) {
    return trim ? text.trim() === "" : text === "";
}

function prepInnerText(text: string) {
    // Remove trailing newlines
    return text.endsWith("\n") ? text.slice(0, -1) : text;
}

export function EditableTextBase(props: EditableTextProps) {
    const [localText, setLocalText] = useState(props.text);
    const [needsPlaceholder, setNeedsPlaceholder] = useState(empty(props.text));

    const localContentRef = useRef<HTMLDivElement>(null);
    const contentRef = props.contentRef || localContentRef;

    // Listen for external changes to the text
    useEffect(() => {
        if (props.text !== contentRef.current?.innerText) {
            console.log("Setting local text to", props.text);
            setLocalText(props.text);
            setNeedsPlaceholder(empty(props.text));
        }
    }, [props.text]);

    // Manage focusing / placing the caret
    useEffect(() => {

        console.log("useEffect: EditableTextBase focusStateResolved", props.focusStateResolved);

        const editable = contentRef.current;
        if (!editable) return;

        if (props.focusStateResolved?.focused) {
            // The user (or parent) wants to focus and set the cursor location
            const location = props.focusStateResolved.cursorLocation ?? "start";
            const textLength = editable.textContent?.length || 0;

            let position = 0;
            if (location === "end") {
                position = textLength;
            } else if (typeof location === "number") {
                position = Math.min(location, textLength);
            }

            // wait for 50ms before setting the cursor position
            setTimeout(() => {
                console.log("Setting cursor position to", position, "in", editable);
                editable.focus();
                setCursorPosition(editable, position);
            }, 500);
        } else {
            editable.blur();
        }
    }, [props.focusStateResolved?.focused, props.focusStateResolved?.cursorLocation]);

    const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
        const innerText = prepInnerText(event.currentTarget.innerText);
        setNeedsPlaceholder(empty(innerText));
        if (props.onTextChange) {
            props.onTextChange(innerText);
        }
        setLocalText(innerText);
    };

    const placeholder = props.placeholder || "Enter text";
    const onlyShowPlaceholderIfFocused = props.onlyShowPlaceholderIfFocused || false;
    const showPlaceholder =
        needsPlaceholder && (!onlyShowPlaceholderIfFocused || props.focusStateResolved?.focused);

    const localTextLines = localText.split("\n");
    const linesEmpty = localTextLines.every((line) => empty(line, true));

    return (
        <>
            <div
                id={props.id}
                className={`bg-blue-50 outline-none min-h-4 w-full min-w-20 ${props.className || ""}`}
                ref={contentRef}
                onFocus={props.onFocused}
                onInput={handleInput}
                contentEditable={!!props.onTextChange}
                suppressContentEditableWarning
            >
                {linesEmpty
                    ? localText
                    : localTextLines.map((line, index) => (
                        <React.Fragment key={index}>
                            <span>{line}</span>
                            {index < localTextLines.length - 1 && <br/>}
                        </React.Fragment>
                    ))}
            </div>

            {false && (
                <span
                    contentEditable={false}
                    className="text-muted-foreground absolute top-0 left-0 pointer-events-none opacity-50"
                >
          {placeholder}
        </span>
            )}
        </>
    );
}
