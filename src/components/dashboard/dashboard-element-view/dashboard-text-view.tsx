import {DashboardElementText, TextElementType} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {EditableH3, EditableText} from "@/components/dashboard/components/editable-text-components";
import {useRelationsState} from "@/state/relations.state";


export interface DashboardTextViewProps {
    dashboardId: string;
    element: DashboardElementText;
}

export function DashboardTextView(props: DashboardTextViewProps){

    const setDashboardElement = useRelationsState((state) => state.setDashboardElement);

    function onTextChange(text: string) {
        setDashboardElement(props.dashboardId, props.element.id, {
            ...props.element,
            text: text,
        });
    }

    function onTypeChange(type: TextElementType) {
        setDashboardElement(props.dashboardId, props.element.id, {
            ...props.element,
            elementType: type,
        });
    }

    const elementProps = {
        className: 'w-full',
        text: props.element.text,
        onTextChange: onTextChange,
        onTypeChange: onTypeChange,
        type: props.element.elementType
    }

    switch (props.element.elementType) {
        case 'text':
            return <EditableText {...elementProps}/>
        case 'h3':
            return <EditableH3 {...elementProps}/>
    }
}