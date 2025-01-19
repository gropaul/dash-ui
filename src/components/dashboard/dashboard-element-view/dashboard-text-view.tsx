import {
    DashboardElementText,
    DashboardState, findElementOfTypeAfter,
    findElementOfTypeBefore,
    getInitialElement,
    TYPE_OPTIONS_TEXT
} from "@/model/dashboard-state";
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
    const getDashboardState = useRelationsState((state) => state.getDashboardState);
    const setDashboardState = useRelationsState((state) => state.setDashboardState);
    const updateDashboardElement = useRelationsState((state) => state.updateDashboardElement);
    const deleteDashboardElements = useRelationsState((state) => state.deleteDashboardElements);
    const contentRef = useRef<HTMLTextAreaElement>(null);

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
    }

    async function onEnterPress(offset: number) {

        const dashboardState = getDashboardState(props.dashboardId);
        const elementsOrder = dashboardState.elementsOrder;
        const elements = dashboardState.elements;
        const newElements = {...elements};

        // get text after the cursor
        const text = props.element.text;

        // update the current element with text before the cursor
        newElements[props.element.id] = {
            ...props.element,
            text: text.substring(0, offset),
        }

        // insert new text element after this element, add text after the cursor to this element
        const newElement = await getInitialElement('text') as DashboardElementText;
        newElement.text = text.substring(offset);
        newElements[newElement.id] = newElement;

        // add it in the order after this element
        const newElementsOrder = [...elementsOrder];
        newElementsOrder.splice(props.elementIndex + 1, 0, newElement.id);

        const newDashboardState: DashboardState = {
            ...dashboardState,
            elements: newElements,
            elementsOrder: newElementsOrder,
        }

        setDashboardState(props.dashboardId, newDashboardState);
        props.setFocusState({elementId: newElement.id, cursorLocation: "start"});
    }

    async function onLastDelete() {

        // find a text element before this element
        const dashboardState = getDashboardState(props.dashboardId);
        const elementsOrder = dashboardState.elementsOrder;
        const elements = dashboardState.elements;

        const idBefore = findElementOfTypeBefore(dashboardState, 'text', props.elementIndex);
        if (!idBefore) return;

        const newElements = {...elements};

        // update the element before to append the text of the current element
        const elementBefore = elements[idBefore] as DashboardElementText;
        const oldTextOffset = elementBefore.text.length;
        newElements[idBefore] = {
            ...elementBefore,
            text: elementBefore.text + props.element.text,
        };

        // remove the current element and also its order entry
        delete newElements[props.element.id];
        const newElementsOrder = elementsOrder.filter(id => id !== props.element.id);

        const newDashboardState: DashboardState = {
            ...dashboardState,
            elements: newElements,
            elementsOrder: newElementsOrder,
        }

        setDashboardState(props.dashboardId, newDashboardState);
        props.setFocusState({elementId: idBefore, cursorLocation: oldTextOffset});
    }

    function onLastArrowUp(cursorPosition: number) {
        console.log("onLastUpArrow", cursorPosition)
    }

    function onLastArrowDown(cursorPosition: number) {
        console.log("onLastDownArrow", cursorPosition)
    }

    function onLastArrowLeft(cursorPosition: number) {
        // find the next text element before this element
        const dashboardState = getDashboardState(props.dashboardId);
        const idBefore = findElementOfTypeBefore(dashboardState, 'text', props.elementIndex);
        if (!idBefore) return;

        props.setFocusState({elementId: idBefore, cursorLocation: 'end'});

    }

    function onLastArrowRight(cursorPosition: number) {
        // find the next text element after this element
        const dashboardState = getDashboardState(props.dashboardId);
        const idAfter = findElementOfTypeAfter(dashboardState, 'text', props.elementIndex);
        if (!idAfter) return;

        props.setFocusState({elementId: idAfter, cursorLocation: 'start'});
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
        onLastDelete: onLastDelete,
        contentRef: contentRef,
        onFocused: onFocused,
        focus: {
            focused: props.focusState.elementId === props.element.id,
            cursorLocation: props.focusState.cursorLocation ?? "end",
        },
        focusState: props.focusState,
        setFocusState: props.setFocusState,
        onLastArrowDown: onLastArrowDown,
        onLastArrowUp: onLastArrowUp,
        onLastArrowLeft: onLastArrowLeft,
        onLastArrowRight: onLastArrowRight,
    }

    switch (props.element.subtype) {
        case 'text-default':
            return <EditableText {...textElementProps}/>
        case 'text-h3':
            return <EditableH3 {...textElementProps}/>
    }
}