import {DashboardElementData, DashboardElementText} from "@/model/dashboard-state";
import MdEditor from "@/components/basics/input/md-editor";


interface TextViewProps {
    element: DashboardElementText
}

export function DashboardTextView(props: TextViewProps){
    return <MdEditor
        initialValue={props.element.text}
    />
}