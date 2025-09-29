import {WindowSplitter} from "@/components/ui/window-splitter";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {cn} from "@/lib/utils";
import {ChartConfigDialog} from "@/components/relation/chart/chart-config-dialog";
import {ChartContentWrapper} from "@/components/relation/chart/chart-content-wrapper";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";

export function Chart(props: RelationViewContentProps) {

    function updateConfigRatio(ratio: number) {
        props.updateRelationViewState( {
            chartState: {
                view: {
                    configPlotRatio: ratio,
                }
            }
        });
    }

    const config = props.relationState.viewState.chartState;
    const isEmbedded = props.embedded ?? false;
    const contentPaddingClass = isEmbedded ? 'p-0' : 'h-full p-2';
    const contentHeightClass = isEmbedded ? 'h-fit' : 'h-full';
    const overflowClass = isEmbedded ? 'overflow-hidden' : 'overflow-auto';
    return (
        <>
            <div className={cn('group w-full relative overflow-hidden', contentHeightClass)}>
                <WindowSplitter
                    ratio={config.view.configPlotRatio}
                    layout={config.view.layout}
                    onChange={updateConfigRatio}
                    child2Active={config.view.showConfig && !isEmbedded}
                >
                    <div className={cn(contentPaddingClass, overflowClass, 'relative')}>
                        <ChartContentWrapper {...props}/>
                    </div>
                    {!isEmbedded ? <div className={'px-4 py-3 w-full h-full overflow-y-auto'}>
                        <ChartConfigView {...props} />
                    </div> : <div/>}
                </WindowSplitter>
            </div>
            <ChartConfigDialog
                isOpen={config.view.showConfig && isEmbedded}
                onOpenChange={(open) => props.updateRelationViewState({
                    chartState: {
                        view: {
                            showConfig: open
                        }
                    }
                })}
                {...props}
            />
        </>
    )
}