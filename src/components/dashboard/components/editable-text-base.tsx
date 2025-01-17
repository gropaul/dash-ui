import {RefObject, useEffect, useRef, useState} from "react";
import {H5} from "@/components/ui/typography";
import {cn} from "@/lib/utils";

export interface EditableTextProps {
    text: string;
    placeholder?: string;
    onlyShowPlaceholderIfFocused?: boolean;
    onTextChange?: (newText: string) => void;
    className?: string;
    focused?: boolean;

    contentRef?: RefObject<HTMLDivElement>;

    onFocused?: () => void; // Called when the text is focused
    onEnter?: () => void; // Called if Enter is pressed
    onFinalDelete?: () => void; // Called if Backspace is pressed on empty text
    onEscape?: () => void; // Called if Escape is pressed
}

function textIsEmpty(text: string) {
    return text.trim().length === 0;
}

export function EditableTextBase(props: EditableTextProps) {
    const [localText, setLocalText] = useState(props.text);
    const [needsPlaceholder, setNeedsPlaceholder] = useState(textIsEmpty(props.text));

    const localContentRef = useRef<HTMLDivElement>(null);
    const contentRef = props.contentRef || localContentRef;

    // Listen for external changes to the text
    useEffect(() => {
        if (props.text !== contentRef.current?.innerText) {
            setLocalText(props.text);
            setNeedsPlaceholder(textIsEmpty(props.text));
        }
    }, [props.text]);

    const handleInput = (event: React.FormEvent<HTMLSpanElement>) => {
        setNeedsPlaceholder(textIsEmpty(event.currentTarget.innerText));
        if (props.onTextChange) {
            props.onTextChange(event.currentTarget.innerText);
        }
    };

    // Handle keydown events for custom behavior
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const currentText = contentRef.current?.innerText || "";

        if (event.key === "Enter") {
            if (event.shiftKey || event.ctrlKey) {
                // Allow Shift+Enter or Ctrl+Enter to add a newline
                return;
            } else {
                // Prevent Enter from adding a newline and call onEnter
                event.preventDefault();
                if (props.onEnter) {
                    props.onEnter();
                }
            }
        } else if (event.key === "Backspace") {
            if (textIsEmpty(currentText) && props.onFinalDelete) {
                // Trigger onFinalDelete if text is empty
                event.preventDefault();
                props.onFinalDelete();
            }
        } else if (event.key === "Escape") {
            // Trigger onEscape if Escape is pressed
            if (props.onEscape) {
                props.onEscape();
            }
        }
    };

    const placeholder = props.placeholder || "Enter text";
    const onlyShowPlaceholderIfFocused = props.onlyShowPlaceholderIfFocused || false;
    const showPlaceholder = needsPlaceholder && (!onlyShowPlaceholderIfFocused || props.focused);
    return (
        <div className={cn("relative", props.className)}>
            {/* Editable span */}
            <div
                className={cn("outline-none w-fit min-w-20", props.className)}
                ref={contentRef}
                onFocus={props.onFocused}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                contentEditable={!!props.onTextChange}
                suppressContentEditableWarning
            >
                {localText}
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
