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
            <div className={'w-full flex flex-row items-start'}>
                <div contentEditable={false} className={'flex flex-row items-center h-6'}>
                    <div className={'w-2 h-[1px] bg-primary rounded-full mr-2'}/>
                </div>
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