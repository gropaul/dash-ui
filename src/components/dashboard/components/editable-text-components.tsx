import {EditableTextBase, EditableTextProps} from "@/components/dashboard/components/editable-text-base";
import {H3} from "@/components/ui/typography";


export function EditableH3(props: EditableTextProps) {
    return (
       <H3>
           <EditableTextBase {...props}/>
       </H3>
    );
}


export function EditableText(props: EditableTextProps) {
    return (
        <EditableTextBase {...props} />
    );
}