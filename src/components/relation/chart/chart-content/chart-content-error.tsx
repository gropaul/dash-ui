import {getTitleForType, PlotDisplayError} from "@/model/relation-view-state/chart";
import {H5, P} from "@/components/ui/typography";


interface ChartContentErrorProps {
    error: PlotDisplayError
}

export function ChartContentError(props: ChartContentErrorProps) {
    return (
        <div className={'w-full h-full flex justify-center items-center'}>
            <div className={'text-center'}>
                <H5 className={'text-lg font-bold'}>{getTitleForType(props.error.type)}</H5>
                <P className={'text-sm'}>{props.error.message}</P>
            </div>
        </div>
    )
}


