import {Dialog, DialogContent} from "@/components/ui/dialog";
import {RelationBlockData} from "@/components/editor/tools/relation.tool";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {RelationView} from "@/components/relation/relation-view";

interface FullscreenDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    relationState: RelationBlockData;
    updateRelation: (state: RelationBlockData) => void;
    inputManager: InputManager;
}

export function FullscreenDialog({
    isOpen,
    onOpenChange,
    relationState,
    updateRelation,
    inputManager
}: FullscreenDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className={'max-w-full w-screen h-screen supports-[height:100dvh]:h-dvh md:max-w-7xl md:h-[90vh] md:supports-[height:100dvh]:h-[90dvh] rounded-sm flex flex-col p-2'}>
                <RelationView
                    relationState={relationState}
                    updateRelation={updateRelation}
                    inputManager={inputManager}
                    embedded={false}
                    configDisplayMode={'dialog'}
                    height={'fit'}
                />
            </DialogContent>
        </Dialog>
    );
}
