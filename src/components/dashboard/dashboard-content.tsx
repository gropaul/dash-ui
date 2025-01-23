import {DashboardState} from "@/model/dashboard-state";
import {useRelationsState} from "@/state/relations.state";
import {Editor} from "@/components/editor/editor";
import {OutputData} from "@editorjs/editorjs";

interface DashboardContentProps {
    dashboard: DashboardState;
}

export interface FocusState {
    elementId: string | null;
    // start, end, number=global cursor position, {lineIndex, charIndex} = line and index in line
    cursorLocation?: "start" | "end" | number | { lineIndex: number, charIndex: number };

}

export interface FocusStateResolved {
    focused: boolean;
    // start, end, number=global cursor position, {lineIndex, charIndex} = line and index in line
    cursorLocation?: "start" | "end" | number | { lineIndex: number, charIndex: number };
}

export function FindIdInChildren(element: Element | null): string | null {
    if (!element) {
        return null;
    }
    const id = element.getAttribute("id");
    if (id) {
        return id;
    }
    // go down the tree
    for (let i = 0; i < element.children.length; i++) {
        const result = FindIdInChildren(element.children[i]);
        if (result) {
            return result;
        }
    }
    return null;
}

export function FindIdInParents(element: Element | null): string | null {
    if (!element) {
        return null;
    }
    const id = element.getAttribute("id");
    if (id) {
        return id;
    }
    return FindIdInParents(element.parentElement);
}

export function FindId(element: Element | null): string | null {
    return FindIdInParents(element) || FindIdInChildren(element);
}

export function DashboardContent(props: DashboardContentProps) {

    const dashboard = props.dashboard;
    const setDashboardState = useRelationsState((state) => state.setDashboardState);

    function onSaved(outputData: OutputData) {
        console.log("onSaved", outputData);
        setDashboardState(dashboard.id, {
            ...dashboard,
            elementState: outputData
        });
    }

    return (
        <div
            className="p-4 pl-1 overflow-auto w-full h-full"
        >
            <Editor
                initialData={dashboard.elementState}
                onSaved={onSaved}
            />
        </div>
    );
}
