import {DashboardElementText, TYPE_OPTIONS_TEXT} from "@/model/dashboard-state";
import {
    EditableH3,
    EditableText,
    EditableTextComponentsProps
} from "@/components/dashboard/components/editable-text-components";
import {useRelationsState} from "@/state/relations.state";


export interface DashboardTextViewProps {
    dashboardId: string;
    elementIndex: number;
    elementsCount: number;
    element: DashboardElementText;
}

export function DashboardTextView(props: DashboardTextViewProps){

    const updateDashboardElement = useRelationsState((state) => state.updateDashboardElement);
    function onTextChange(text: string) {
        updateDashboardElement(props.dashboardId, props.element.id, {
            ...props.element,
            text: text,
        });
    }

    const startIconClassMap: {[key: string]: string} = {
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
    }

    switch (props.element.subtype) {
        case 'text-default':
            return <EditableText {...textElementProps}/>
        case 'text-h3':
            return <EditableH3 {...textElementProps}/>
    }
}