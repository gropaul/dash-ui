// import {
//     DashboardElementText,
//     DashboardState, findElementOfTypeAfter,
//     findElementOfTypeBefore,
//     getInitialElement
// } from "@/model/dashboard-state";
// import { useRelationsState } from "@/state/relations.state";
//
// function onTextChange(text: string) {
//     const updateDashboardElement = useRelationsState.getState().updateDashboardElement;
//     updateDashboardElement(props.dashboardId, props.element.id, {
//         ...props.element,
//         text: text,
//     });
// }
//
// function onFocused() {
//     // set focused element if not already focused
// }

import { useRelationsState } from "@/state/relations.state";
import {
    DashboardElementText,
    DashboardState,
    findElementOfTypeBefore,
    getInitialElement
} from "@/model/dashboard-state";
import {FocusState} from "@/components/dashboard/dashboard-content";

export async function handleTextKeyDown(dashboardId: string, elementId: string, setFocusState: (focusState: FocusState) => void, event: React.KeyboardEvent<HTMLDivElement>): Promise<boolean> {

    const caretOffset = window.getSelection()?.focusOffset;

    if (caretOffset === undefined) {
        console.error("caretOffset is undefined");
        console.error(event);
        return false;
    }

    // if enter is pressed, and not ctrl+enter or cmd+enter
    if (event.key === "Enter") {
        console.log("Enter pressed: ", event);
        if (event.ctrlKey || event.shiftKey || event.metaKey) {
            console.log("Ctrl or Meta key pressed -> ignore");
            return false;
        }
        event.preventDefault();
        await onEnterPress(dashboardId, elementId, caretOffset, setFocusState);
        return true;
    } else if (event.key === "Backspace" && caretOffset === 0) {
        // event.preventDefault();
        // await onLastDelete(dashboardId, elementId, setFocusState);
        // console.log("onLastDelete");
        // return true;
    }

    return false;
}

//
async function onEnterPress(dashboardId: string, elementId: string, offset: number, setFocusState: (focusState: FocusState) => void) {

    console.log("onEnterPress on element", elementId, "at offset", offset);

    const getDashboardState = useRelationsState.getState().getDashboardState;
    const dashboardState = getDashboardState(dashboardId);
    const elementsOrder = dashboardState.elementsOrder;
    const elements = dashboardState.elements;
    const newElements = {...elements};
    const element = elements[elementId] as DashboardElementText;

    // get text after the cursor
    const text = element.text;

    // update the current element with text before the cursor
    newElements[element.id] = {
        ...element,
        text: text.substring(0, offset),
    }

    // insert new text element after this element, add text after the cursor to this element
    const newElement = await getInitialElement('text') as DashboardElementText;
    newElement.text = text.substring(offset);
    newElements[newElement.id] = newElement;

    // add it in the order after this element
    const newElementsOrder = [...elementsOrder];
    const elementIndex = newElementsOrder.indexOf(elementId);
    newElementsOrder.splice(elementIndex + 1, 0, newElement.id);

    const newDashboardState: DashboardState = {
        ...dashboardState,
        elements: newElements,
        elementsOrder: newElementsOrder,
    }

    const setDashboardState = useRelationsState.getState().setDashboardState;
    setDashboardState(dashboardId, newDashboardState);
    setFocusState({elementId: newElement.id, cursorLocation: "start"});
}

async function onLastDelete(dashboardId: string, elementId: string, setFocusState: (focusState: FocusState) => void) {

    // find a text element before this element
    const getDashboardState = useRelationsState.getState().getDashboardState;
    const dashboardState = getDashboardState(dashboardId);
    const elementsOrder = dashboardState.elementsOrder;
    const elementIndex = elementsOrder.indexOf(elementId);
    const elements = dashboardState.elements;

    const idBefore = findElementOfTypeBefore(dashboardState, 'text', elementIndex);
    if (!idBefore) return;

    const newElements = {...elements};
    const element = elements[elementId] as DashboardElementText;

    // update the element before to append the text of the current element
    const elementBefore = elements[idBefore] as DashboardElementText;
    const oldTextOffset = elementBefore.text.length;
    newElements[idBefore] = {
        ...elementBefore,
        text: elementBefore.text + element.text,
    };

    // remove the current element and also its order entry
    delete newElements[element.id];
    const newElementsOrder = elementsOrder.filter(id => id !== element.id);

    const newDashboardState: DashboardState = {
        ...dashboardState,
        elements: newElements,
        elementsOrder: newElementsOrder,
    }

    const setDashboardState = useRelationsState.getState().setDashboardState;
    setDashboardState(dashboardId, newDashboardState);
    setFocusState({elementId: idBefore, cursorLocation: oldTextOffset});
}
//
// function onLastArrowUp(cursorPosition: number) {
//     console.log("onLastUpArrow", cursorPosition)
// }
//
// function onLastArrowDown(cursorPosition: number) {
//     console.log("onLastDownArrow", cursorPosition)
// }
//
// function onLastArrowLeft(cursorPosition: number) {
//     // find the next text element before this element
//     const dashboardState = getDashboardState(props.dashboardId);
//     const idBefore = findElementOfTypeBefore(dashboardState, 'text', props.elementIndex);
//     if (!idBefore) return;
//
//     props.setFocusState({elementId: idBefore, cursorLocation: 'end'});
//
// }
//
// function onLastArrowRight(cursorPosition: number) {
//     // find the next text element after this element
//     const dashboardState = getDashboardState(props.dashboardId);
//     const idAfter = findElementOfTypeAfter(dashboardState, 'text', props.elementIndex);
//     if (!idAfter) return;
//
//     props.setFocusState({elementId: idAfter, cursorLocation: 'start'});
// }
