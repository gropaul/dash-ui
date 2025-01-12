import {EditableTextProps} from "@/components/dashboard/components/editable-text-base";
import {H3} from "@/components/ui/typography";
import {TextViewElementBase, TextViewElementBaseProps} from "@/components/dashboard/components/text-view-element-base";


export function EditableH3(props: TextViewElementBaseProps) {
    return (
       <H3>
           <TextViewElementBase {...props}/>
       </H3>
    );
}


export function EditableText(props: TextViewElementBaseProps) {
    return (
        <TextViewElementBase {...props} />
    );
}