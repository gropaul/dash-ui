import React, {
    ChangeEvent,
    KeyboardEvent,
    RefObject,
    useEffect, useLayoutEffect,
    useRef,
    useState,
} from "react";
import {cn} from "@/lib/utils";
import {FocusState, FocusStateResolved} from "@/components/dashboard/dashboard-content";

export interface EditableTextProps {
    text: string;
    placeholder?: string;
    onlyShowPlaceholderIfFocused?: boolean;

    onTextChange?: (newText: string) => void;
    className?: string;
    focus?: FocusStateResolved;

    /** If you need an external ref to the <textarea> */
    contentRef?: RefObject<HTMLTextAreaElement>;

    /** Called when the <textarea> receives focus */
    onFocused?: () => void;
    /** Called if user presses Enter (without shift or ctrl) */
    onEnter?: (offset: number) => void;
    /** Called if user presses Backspace and the text is already empty */
    onLastDelete?: () => void;
    /** Called if user presses Escape */
    onEscape?: () => void;

    /** Called if user presses ArrowUp on the very first line */
    onLastArrowUp?: (offset: number) => void;
    /** Called if user presses ArrowDown on the very last line */
    onLastArrowDown?: (offset: number) => void;
    /** Called if user presses ArrowLeft when the caret is at the start of text */
    onLastArrowLeft?: (offset: number) => void;
    /** Called if user presses ArrowRight when the caret is at the end of text */
    onLastArrowRight?: (offset: number) => void;
}

interface CursorPosition {
    globalOffset: number;        // caret position in the entire text (selectionStart)
    lineOffset: number;          // caret offset in the current line
    lineIndex: number;           // which line the caret is on
    totalNumberOfLines: number;  // total lines in the textarea
    totalNumberOfCharacters: number; // total characters in the text
}

/**
 * Check if a string is empty (optionally trim).
 */
function isEmpty(text: string, trim = false) {
    return trim ? text.trim() === "" : text === "";
}

/**
 * Return line-based + total caret info from a <textarea>.
 */
function getCursorPosition(
    textarea: HTMLTextAreaElement | null
): CursorPosition {
    if (!textarea) {
        return {
            globalOffset: 0,
            lineOffset: 0,
            lineIndex: 0,
            totalNumberOfLines: 1,
            totalNumberOfCharacters: 0,
        };
    }

    const text = textarea.value;
    const selectionStart = textarea.selectionStart || 0;
    const lines = text.split("\n");

    let lineIndex = 0;
    let lineOffset = 0;
    let totalCharCount = text.length;

    let cumulativeChars = 0;
    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length;
        if (selectionStart <= cumulativeChars + lineLength) {
            lineIndex = i;
            lineOffset = selectionStart - cumulativeChars;
            break;
        }
        // +1 for the newline
        cumulativeChars += lineLength + 1;
    }


    return {
        globalOffset: selectionStart,
        lineOffset,
        lineIndex,
        totalNumberOfLines: lines.length,
        totalNumberOfCharacters: totalCharCount,
    };
}

export function setTextareaCursor(
    textareaRef: React.RefObject<HTMLTextAreaElement>,
    // start, end, number=global cursor position, {lineIndex, charIndex} = line and index in line
    position?: "start" | "end" | number | {lineIndex: number, charIndex: number}
) {
    const el = textareaRef.current;
    if (!el) return;

    // Compute the numeric offset
    let offset = 0;
    if (position === "start") {
        offset = 0;
    } else if (position === "end") {
        offset = el.value.length;
    } else if (typeof position === "number") {
        offset = position;
    } else if (typeof position === "object") {
        const lines = el.value.split("\n");
        let cumulativeChars = 0;
        for (let i = 0; i < lines.length; i++) {
            if (i === position.lineIndex) {
                offset = cumulativeChars + position.charIndex;
                break;
            }
            cumulativeChars += lines[i].length + 1; // +1 for the newline
        }

        console.log("cumulativeChars", cumulativeChars);
        console.log("position.charIndex", position.charIndex);
        console.log("position.lineIndex", position.lineIndex);
        console.log("offset", offset);
    }

    // Set the cursor (selection) range
    el.setSelectionRange(offset, offset);

    console.log("el", el);
    console.log("offset", offset);

    // Optionally focus the element so the cursor is visible
    el.focus();
}

export function EditableTextBase(props: EditableTextProps) {
    const {
        text,
        placeholder,
        onlyShowPlaceholderIfFocused,
        onTextChange,
        className,
        focus,
        contentRef,
        onFocused,
        onEnter,
        onLastDelete,
        onEscape,
        onLastArrowUp,
        onLastArrowDown,
        onLastArrowLeft,
        onLastArrowRight,
    } = props;

    // Keep local text state
    const [localText, setLocalText] = useState<string>(text);
    // Track whether we currently have focus
    const [isFocused, setIsFocused] = useState<boolean>(focus?.focused || false);

    // We create our own ref if user hasn't passed one
    const localRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = contentRef || localRef;

    // Function to auto-resize the textarea to fit content
    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;

        // Reset height to auto so we can shrink if needed
        el.style.height = "auto";
        // Set height to scrollHeight + small offset
        el.style.height = `${el.scrollHeight}px`;
    };

    // If `text` prop changes from outside, update local text
    // and re-check sizing
    useEffect(() => {
        setLocalText(text);
    }, [text]);

    useEffect(() => {
        autoResize();
    }, [localText]);

    // If `focused` prop changes from outside, focus the textarea
    useEffect(() => {

        // return if focus is not defined or textareaRef is not defined
        if (!focus || !textareaRef.current) {
            return;
        }

        // If `focused` is true, set cursor
        if (focus.focused) {
            console.log("focus", focus);
            setIsFocused(true);
            // 10ms delay to ensure the textarea is focused
            setTimeout(() => {
                setTextareaCursor(textareaRef, focus.cursorLocation);
            }, 10);

        } else {
            setIsFocused(false);
        }

    }, [focus?.focused, focus?.cursorLocation]);

    // Called on <textarea> changes
    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setLocalText(newText);
        onTextChange?.(newText);
    };

    const handleInput = () => {
        // React also has onInput, so we can autoResize here.
        // Just to ensure we update height as the user types.
        autoResize();
    };

    const handleFocus = () => {
        setIsFocused(true);
        onFocused?.();
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // We'll get the caret position to detect "last line," "end of text," etc.
        const pos = getCursorPosition(textareaRef.current);

        if (e.key === "Enter") {
            // On Enter (without Shift/Ctrl), trigger onEnter
            if (!e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                onEnter?.(pos.globalOffset);
            }
        } else if (e.key === "Backspace") {
            // If the caret is at the start, call onLastDelete
            if (pos.globalOffset === 0) {
                e.preventDefault();
                onLastDelete?.();
            }
        } else if (e.key === "Escape") {
            onEscape?.();
        } else if (e.key === "ArrowUp") {
            // If caret is on the first line, call onLastArrowUp
            if (pos.lineIndex === 0) {
                onLastArrowUp?.(pos.lineOffset);
            }
        } else if (e.key === "ArrowDown") {
            // If caret is on the last line, call onLastArrowDown
            if (pos.lineIndex === pos.totalNumberOfLines - 1) {
                onLastArrowDown?.(pos.lineOffset);
            }
        } else if (e.key === "ArrowLeft") {
            // If caret is at the very start, call onLastArrowLeft
            if (pos.globalOffset === 0) {
                onLastArrowLeft?.(0);
            }
        } else if (e.key === "ArrowRight") {
            // If caret is at the very end, call onLastArrowRight
            if (pos.globalOffset === localText.length) {
                onLastArrowRight?.(pos.lineOffset);
            }
        }
    };

    /**
     * Placeholder handling:
     * If `onlyShowPlaceholderIfFocused` is true, we only show a placeholder
     *   if we have focus and the text is empty.
     * Otherwise, we show the placeholder normally when text is empty.
     */
    const computedPlaceholder = onlyShowPlaceholderIfFocused
        ? (isFocused && isEmpty(localText) ? placeholder : "")
        : placeholder || "";

    return (
        <div className={cn("relative w-full h-full bg-inherit", className)}>
      <textarea
          ref={textareaRef}
          className={cn(
              "block w-full outline-none bg-inherit",
              // Remove resize handle, hide overflow (so no scrollbars appear)
              "resize-none overflow-hidden",
              className
          )}
          value={localText}
          onChange={handleChange}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={computedPlaceholder}
          // If you have a default number of lines to display initially:
          rows={1}
      />
        </div>
    );
}
