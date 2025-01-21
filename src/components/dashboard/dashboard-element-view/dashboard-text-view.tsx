import {
    DashboardElementText,
    DashboardState, findElementOfTypeAfter,
    findElementOfTypeBefore,
    getInitialElement,
    TYPE_OPTIONS_TEXT
} from "@/model/dashboard-state";
import {
    EditableH3, EditableList,
    EditableText,
    EditableTextComponentsProps
} from "@/components/dashboard/components/editable-text-components";
import {useRelationsState} from "@/state/relations.state";
import {DashboardMacroProps} from "@/components/dashboard/dashboard-element-view";
import {useEffect, useRef} from "react";
import {setCursorPosition} from "@/platform/focus-utils";

export interface DashboardTextViewProps extends DashboardMacroProps {
    element: DashboardElementText;
}

export function DashboardTextView(props: DashboardTextViewProps) {

    const contentRef = useRef<HTMLDivElement>(null);

    // listen to focus change
    useEffect(() => {
        if (props.focusState.elementId === props.element.id && contentRef.current) {
            const location = props.focusState.cursorLocation ?? "start";
            const textLength = contentRef.current.textContent?.length || 0;

            let position = 0;
            if (location === "end") {
                position = textLength;
            } else if (typeof location === "number") {
                position = Math.min(location, textLength);
            }
            setCursorPosition(contentRef.current, position);
        } else {
            contentRef.current?.blur();
        }
    }, [props.focusState, props.element.id]);

    const startIconClassMap: { [key: string]: string } = {
        'text-default': 'h-6',
        'text-h3': 'h-8',
    }

    const startIconClass = startIconClassMap[props.element.subtype];

    const textElementProps: EditableTextComponentsProps = {
        className: 'w-full',
        startIconClass: startIconClass,
        text: props.element.text,
        element: props.element,
        elementIndex: props.elementIndex,
        elementsCount: props.elementsCount,
        // onTextChange: onTextChange,
        typeOptions: TYPE_OPTIONS_TEXT,
        dashboardId: props.dashboardId,
        selected: props.selected,
        // onEnter: onEnterPress,
        // onLastDelete: onLastDelete,
        contentRef: contentRef,
        focus: {
            focused: props.focusState.elementId === props.element.id,
            cursorLocation: props.focusState.cursorLocation ?? "end",
        },
        onTextChange: (newText: string) => console.log(newText),
        focusState: props.focusState,
        setFocusState: props.setFocusState,
        id: props.element.id,
    }

    switch (props.element.subtype) {
        case 'text-default':
            return <EditableText {...textElementProps}/>
        case 'text-h3':
            return <EditableH3 {...textElementProps}/>
        case 'text-list':
            return <EditableList {...textElementProps}/>
    }
}