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
    lineOffset: number; // the offset of the cursor in the current line
    lineIndex: number; // the index of the current line

    totalNumberOfLines: number; // total number of lines in the text
    totalNumberOfCharacters: number; // total number of characters in the text
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

    const getCursorPos = (): CursorPosition => {
        const selection = window.getSelection();
        console.log(selection);
        if (!selection || !selection.anchorNode) {
            return {
                globalOffset: 0,
                lineOffset: 0,
                lineIndex: 0,
                totalNumberOfLines: 1,
                totalNumberOfCharacters: 0,
            };
        }

        // get id of the selected element
        const id = selection.anchorNode;
        console.log(id);

        const anchorNode = selection.anchorNode;
        const anchorOffset = selection.anchorOffset;

        const text = contentRef.current?.innerText || "";
        const lines = text.split("\n");

        let globalOffset = 0;
        let lineOffset = 0;
        let lineIndex = 0;
        let totalNumberOfCharacters = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            totalNumberOfCharacters += line.length;
            if (anchorNode.textContent === line) {
                lineIndex = i;
                lineOffset = anchorOffset;
                break;
            }
            globalOffset += line.length + 1; // +1 for the newline
        }

        return {
            globalOffset,
            lineOffset,
            lineIndex,
            totalNumberOfLines: lines.length,
            totalNumberOfCharacters,
        };
    };

    const isCursorAtFirstLine = (): boolean => {
        return getCursorPos().lineIndex === 0;
    };

    const isCursorAtLastLine = (): boolean => {
        const cursorPos = getCursorPos();
        return cursorPos.lineIndex === cursorPos.totalNumberOfLines - 1;
    };

    function lineKeyDown(event: React.KeyboardEvent<HTMLDivElement>, lineIndex: number) {
        console.log("lineKeyDown", lineIndex);
    }


    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {

        const cursorPos = getCursorPos();
        console.log(cursorPos);
        const innerText = prepInnerText(contentRef.current?.innerText || "");
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
            if (innerText.length === 0 && props.onLastDelete) {
                event.preventDefault();
                props.onLastDelete();
            }
        } else if (event.key === "Escape") {
            if (props.onEscape) {
                props.onEscape();
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
                {linesEmpty ? (
                    localText
                ) : (
                    localTextLines.map((line, index) => (
                        <React.Fragment key={index}>
                            <span id={`line-${index}`}>{line}</span>
                            {index < localTextLines.length - 1 && (
                                <br key={`br-${index}`} id={`br-${index}`} />
                            )}
                        </React.Fragment>
                    ))
                )}


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
