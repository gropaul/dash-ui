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

    onLastUpArrow?: (offset: number) => void;
    onLastDownArrow?: (offset: number) => void;
}

interface CursorPosition {
    globalOffset: number;
    lineOffset: number;
    lineNumber: number;
}

function empty(text: string, trim = false) {
    if (trim) {
        return text.trim() === "";
    } else {
        return text === "";
    }
}
function prepCurrentText(text: string) {
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
        const localText = prepCurrentText(event.currentTarget.innerText);
        setNeedsPlaceholder(empty(localText));
        if (props.onTextChange) {

            console.log('localText:', localText);
            console.log('localText number of lines:', localText.split("\n").length);
            console.log('lines:', localText.split("\n"));

            props.onTextChange(event.currentTarget.innerText);
        }
    };

    const getCursorPos = (): CursorPosition => {

    };

    const isCursorAtFirstLine = (): boolean => {
        return getCursorPos().lineNumber === 0;
    };

    const isCursorAtLastLine = (): boolean => {
        const text = contentRef.current?.innerText || "";
        const lines = text.split("\n");
        console.log('total lines:', lines.length);
        return getCursorPos().lineNumber === lines.length - 1;
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const currentText = prepCurrentText(contentRef.current?.innerText || "");
        if (event.key === "Enter") {
            if (event.shiftKey || event.ctrlKey) {
                return;
            } else {
                event.preventDefault();
                if (props.onEnter) {
                    props.onEnter();
                }
            }
        } else if (event.key === "Backspace") {
            if (currentText.length === 0 && props.onLastDelete) {
                event.preventDefault();
                props.onLastDelete();
            }
        } else if (event.key === "Escape") {
            if (props.onEscape) {
                props.onEscape();
            }
        } else if (event.key === "ArrowUp") {
            if (isCursorAtFirstLine() && props.onLastUpArrow) {
                event.preventDefault();
                const offset = getCursorPos().lineOffset;
                props.onLastUpArrow(offset);
            }
        } else if (event.key === "ArrowDown") {
            if (isCursorAtLastLine() && props.onLastDownArrow) {
                event.preventDefault();
                const offset = getCursorPos().lineOffset;
                props.onLastDownArrow(offset);
            }
        }
    };

    const placeholder = props.placeholder || "Enter text";
    const onlyShowPlaceholderIfFocused = props.onlyShowPlaceholderIfFocused || false;
    const showPlaceholder = needsPlaceholder && (!onlyShowPlaceholderIfFocused || props.focused);

    const localTextLines = localText.split("\n");
    const linesEmpty = localTextLines.every((line) => empty(line, true));

    return (
        <div className={cn("relative", props.className)}>
            {/* Editable div */}
            <div
                className={cn("outline-none w-fit min-w-20", props.className)}
                ref={contentRef}
                onFocus={props.onFocused}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                contentEditable={!!props.onTextChange}
                suppressContentEditableWarning
            >
                {linesEmpty ? localText :localTextLines.map((line, index) => (
                    <>
                        <>{line}</>
                        {index < localTextLines.length - 1 ? <br /> : null}
                    </>
                ))}

            </div>
            {/* Placeholder */}
            {showPlaceholder && (
                <span className="text-muted-foreground absolute top-0 left-0 pointer-events-none opacity-50">
                    {placeholder}
                </span>
            )}
        </div>
    );
}
