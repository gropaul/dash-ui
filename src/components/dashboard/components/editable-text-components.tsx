import {H3} from "@/components/ui/typography";
import {ViewElementBase, ViewElementBaseProps} from "@/components/dashboard/components/view-element-base";
import {EditableTextBase, EditableTextProps} from "@/components/dashboard/components/editable-text-base";


export interface EditableTextComponentsProps extends ViewElementBaseProps, EditableTextProps {

}

export function EditableH3(props: EditableTextComponentsProps) {
    return (
        <ViewElementBase {...props}>
            <H3 className={'w-full'}>
                <EditableTextBase {...props} placeholder={'Enter title'} />
            </H3>
        </ViewElementBase>
    );
}

export function EditableList(props: EditableTextComponentsProps) {
    // list like
    // - item 1
    // - item 2
    return (
        <ViewElementBase {...props}>
            { /* first horizontal line */}
            <div className={'w-full flex flex-row'}>
                <div contentEditable={false}> - </div>
                <EditableTextBase {...props} placeholder={'Enter list item'} />
            </div>
            { /* list items */}


        </ViewElementBase>
    );
}

export function EditableText(props: EditableTextComponentsProps) {
    return (
        <ViewElementBase {...props}>
            <EditableTextBase {...props} onlyShowPlaceholderIfFocused/>
        </ViewElementBase>
    );
}