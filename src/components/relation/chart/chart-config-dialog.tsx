import {RelationViewProps} from "@/components/relation/relation-view";
import {Dialog, DialogContent,} from "@/components/ui/dialog";
import {ChartContentWrapper} from "@/components/relation/chart/chart-content-wrapper";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";


interface ChartConfigDialogProps extends RelationViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function ChartConfigDialog(props: ChartConfigDialogProps) {

    const propsCopy = {
        ...props,
        embedded: false,
    }

    return (
        <Dialog
            open={props.isOpen}
            onOpenChange={props.onOpenChange}
        >
            <DialogContent className={'max-w-screen h-screen flex flex-col'}
                           style={{width: '90vw', height: '90vh'}}
            >
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel
                        defaultSize={70}
                    >
                        <ChartContentWrapper {...propsCopy} showOverlay={false} />
                    </ResizablePanel>
                    <ResizableHandle/>
                    <ResizablePanel
                        defaultSize={30}
                        style={{
                            overflowY: 'auto',
                        }}
                    >
                        <ChartConfigView
                            className={'pl-4 pr-[1px]'}
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


