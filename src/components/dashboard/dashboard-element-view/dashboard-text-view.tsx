import {DashboardElementData, DashboardElementText} from "@/model/dashboard-state";


interface TextViewProps {
    element: DashboardElementText
}

export function DashboardTextView(props: TextViewProps){
    return <div>TextView: {props.element.text}</div>
}