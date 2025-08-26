import {RelationViewProps} from "@/components/relation/relation-view";
import {Dialog, DialogContent,} from "@/components/ui/dialog";
import {ChartContentWrapper} from "@/components/relation/chart/chart-content-wrapper";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {useIsMobile} from "@/hooks/use-is-mobile";
import {ScrollArea} from "@/components/ui/scroll-area";


interface ChartConfigDialogProps extends RelationViewContentProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;

}

export function ChartConfigDialog(props: ChartConfigDialogProps) {

    const propsCopy = {
        ...props,
        embedded: false,
    }

    const desktop = !useIsMobile();

    return (
        <Dialog
            open={props.isOpen}
            onOpenChange={props.onOpenChange}
        >
            <DialogContent className={'max-w-screen rounded-sm h-screen flex flex-col p-2'}
                           style={{width: '90vw', height: '90vh'}}
            >
                <ResizablePanelGroup direction="horizontal">
                    {
                        desktop &&
                        <>
                            <ResizablePanel defaultSize={70}>
                                <ChartContentWrapper {...propsCopy} showOverlay={false}/>
                            </ResizablePanel>
                            <ResizableHandle className={'mr-2'}/>
                        </>
                    }
                    <ResizablePanel
                        defaultSize={30}

                    >
                            <ChartConfigView
                                data={props.data}
                                className={'p-2 pt-2.5'}
                                embedded={true}
                                relationState={props.relationState}
                                updateRelationViewState={props.updateRelationViewState}
                                updateRelationDataWithParams={props.updateRelationDataWithParams}
                            />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    )
}


