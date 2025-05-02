import {RelationViewProps} from "@/components/relation/relation-view";
import {Select as ShadeCNSelect, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from "@/components/ui/select";


export function Select(props: RelationViewProps) {
    return <div className='pt-0.5 pb-0.5'>
        <ShadeCNSelect>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {props.relationState.data?.rows.map((row, index)  => (
                        <SelectItem key={index} value={row[0]}>{row[0]}</SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </ShadeCNSelect>
    </div>
}