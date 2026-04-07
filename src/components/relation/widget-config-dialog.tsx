import {Dialog, DialogContent} from "@/components/ui/dialog";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {useIsMobile} from "@/components/provider/responsive-node-provider";

interface WidgetConfigDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    content: React.ReactNode;
    configPanel: React.ReactNode;
}

export function WidgetConfigDialog(props: WidgetConfigDialogProps) {
    const desktop = !useIsMobile();

    return (
        <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
            <DialogContent className={'max-w-full w-screen h-screen supports-[height:100dvh]:h-dvh md:max-w-7xl md:h-[90vh] md:supports-[height:100dvh]:h-[90dvh] rounded-sm flex flex-col p-2'}>
                <ResizablePanelGroup direction="horizontal">
                    {desktop && (
                        <>
                            <ResizablePanel defaultSize={70}>
                                {props.content}
                            </ResizablePanel>
                            <ResizableHandle className={'mr-2 !cursor-col-resize'}/>
                        </>
                    )}
                    <ResizablePanel defaultSize={30}>
                        {props.configPanel}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    );
}
