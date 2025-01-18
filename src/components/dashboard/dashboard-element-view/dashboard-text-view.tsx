import {DashboardElementText, getInitialElement, TYPE_OPTIONS_TEXT} from "@/model/dashboard-state";
import {
    EditableH3,
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

    const addDashboardElement = useRelationsState((state) => state.addDashboardElement);
    const updateDashboardElement = useRelationsState((state) => state.updateDashboardElement);
    const deleteDashboardElements = useRelationsState((state) => state.deleteDashboardElements);
    const contentRef = useRef<HTMLDivElement>(null);

    // listen to focus change
    useEffect(() => {
        if (props.focusState.elementId === props.element.id && contentRef.current) {
            contentRef.current.focus();
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

    function onTextChange(text: string) {
        updateDashboardElement(props.dashboardId, props.element.id, {
            ...props.element,
            text: text,
        });
    }

    function onFocused() {
        // set focused element if not already focused
        if (props.focusState.elementId !== props.element.id) {
            props.setFocusState({elementId: props.element.id});
        }
    }

    async function onEnterPress() {
        // insert new text element after this element
        const newElement = await getInitialElement('text');
        addDashboardElement(props.dashboardId, newElement, props.elementIndex + 1);
        props.setFocusState({elementId: newElement.id, cursorLocation: "start"});
    }

    async function onFinalDelete() {
        // get the next element on the list
        const indexBefore = props.elementIndex - 1;
        if (indexBefore < 0) {
            // if this is the first element, get the next element
            return;
        }
        const idBefore = props.elementsOrder[indexBefore];
        // delete this element
        deleteDashboardElements(props.dashboardId, [props.element.id]);
        // set focus on the previous element
        props.setFocusState({elementId: idBefore, cursorLocation: "end"});
    }

    function onLastUpArrow(cursorPosition: number) {
        console.log("onLastUpArrow", cursorPosition)
    }

    function onLastDownArrow(cursorPosition: number) {
        console.log("onLastDownArrow", cursorPosition)
    }

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
        onTextChange: onTextChange,
        typeOptions: TYPE_OPTIONS_TEXT,
        dashboardId: props.dashboardId,
        selected: props.selected,
        onEnter: onEnterPress,
        onLastDelete: onFinalDelete,
        contentRef: contentRef,
        onFocused: onFocused,
        focused: props.focusState.elementId === props.element.id,
        focusState: props.focusState,
        setFocusState: props.setFocusState,
        onLastDownArrow: onLastDownArrow,
        onLastUpArrow: onLastUpArrow
    }

    switch (props.element.subtype) {
        case 'text-default':
            return <EditableText {...textElementProps}/>
        case 'text-h3':
            return <EditableH3 {...textElementProps}/>
    }
}