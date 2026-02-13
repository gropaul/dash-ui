import {getTitleForType, PlotDisplayError} from "@/model/relation-view-state/chart";
import {Button} from "@/components/ui/button";


interface ChartContentErrorProps {
    error: PlotDisplayError,
    updateShowConfig: (show: boolean) => void,
    showChartSettings: boolean,
}

export function ChartContentError(props: ChartContentErrorProps) {
    return (
        <div className={'w-full h-full flex justify-center items-center border-b border-t'}>
            <div className={'text-center mt-4'}>
                <div className={'text-lg font-bold'}>{getTitleForType(props.error.type)}</div>
                <div className={'text-sm'}>{props.error.message}</div>
                <div className={'mt-4 mb-4'}>
                    {!props.showChartSettings && (
                        <Button
                            variant={'outline'}
                            onClick={() => props.updateShowConfig(true)}
                        >
                            Show Settings
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}


