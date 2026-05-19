import {cn} from "@/lib/utils";
import {WindowSplitter} from "@/components/ui/window-splitter";
import {WidgetConfigDialog} from "@/components/relation/widget-config-dialog";
import {Layout, RelationViewMode} from "@/model/relation-view-state";
import {HeightType} from "@/components/relation/relation-view";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";

interface WidgetConfigShellProps extends  RelationViewContentProps{
    content: React.ReactNode;
    configPanel: React.ReactNode;
}

type ConfigDisplayMode = 'inline' | 'dialog';

function getConfigDisplayMode(viewMode: RelationViewMode): ConfigDisplayMode {
    switch (viewMode) {
        case 'embedded':
            return 'dialog';
        case 'fullscreen':
            return 'inline';
    }
}

export function WidgetConfigShell(props: WidgetConfigShellProps) {

    const configDisplayMode = getConfigDisplayMode(props.mode);
    const isEmbedded = props.embedded ?? false;
    const isResizable = props.height === 'resizable';

    const actions = getRelationActions(props);
    const sessionState = props.getSessionState(props.mode);
    const showConfig = sessionState.configState.showConfig;
    const splitRatio = sessionState.configState.configSplitRatio;
    const splitLayout = sessionState.configState.configSplitLayout as Layout;

    const onSplitRatioChange = (ratio: number) => {
        actions.updateSessionState(props.mode, {configState: {configSplitRatio: ratio}});
    }
    const onOpenChange = (open: boolean) => {
        actions.updateSessionState(props.mode, {configState: {showConfig: open}});
    }

    const paddingClass = isEmbedded ? 'p-0' : 'p-2';
    const heightClass = isResizable ? 'h-fit' : 'h-full';
    const overflowClass = 'overflow-visible';

    return (
        <>
            <div className={cn('group w-full relative', heightClass)}>
                <WindowSplitter
                    ratio={splitRatio}
                    layout={splitLayout}
                    onChange={onSplitRatioChange}
                    child2Active={showConfig && configDisplayMode === 'inline'}
                >
                    <div className={cn(paddingClass, heightClass, overflowClass, 'relative')}>
                        {props.content}
                    </div>
                    {configDisplayMode === 'inline'
                        ? <div className={'px-4 py-3 w-full h-full overflow-y-auto'}>{props.configPanel}</div>
                        : <div/>
                    }
                </WindowSplitter>
            </div>
            <WidgetConfigDialog
                isOpen={showConfig && configDisplayMode === 'dialog'}
                onOpenChange={onOpenChange}
                content={props.content}
                configPanel={props.configPanel}
            />
        </>
    );
}
