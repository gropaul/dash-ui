import {RelationViewProps} from "@/components/relation/relation-view";
import {Dialog, DialogContent,} from "@/components/ui/dialog";
import {ChartContentWrapper} from "@/components/relation/chart/chart-content-wrapper";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {useIsMobile} from "@/components/provider/responsive-node-provider";


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
            <DialogContent className={'max-w-full rounded-sm md:min-h-[100dvh] supports-[height:100dvh]:min-h-dvh flex flex-col p-2'}
                           style={{width: '90vw', height: '90%'}}
            >
                <ResizablePanelGroup direction="horizontal">
                    {
                        desktop &&
                        <>
                            <ResizablePanel defaultSize={70}>
                                <ChartContentWrapper {...propsCopy} showOverlay={false}/>
                            </ResizablePanel>
                            <ResizableHandle className={'mr-2 !cursor-col-resize'}/>
                        </>
                    }
                    <ResizablePanel
                        defaultSize={30}

                    >
                            <ChartConfigView
                                className={'p-2 pt-2.5'}
                                {...propsCopy}
                                embedded={true}
                            />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    )
}


