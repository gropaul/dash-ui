import {cn} from "@/lib/utils";
import {WindowSplitter} from "@/components/ui/window-splitter";
import {WidgetConfigDialog} from "@/components/relation/widget-config-dialog";
import {Layout} from "@/model/relation-view-state";
import {HeightType} from "@/components/relation/relation-view";

interface WidgetConfigShellProps {
    content: React.ReactNode;
    configPanel: React.ReactNode;
    showConfig: boolean;
    configDisplayMode: 'inline' | 'dialog';
    splitRatio: number;
    splitLayout: Layout;
    onSplitRatioChange: (ratio: number) => void;
    onOpenChange: (open: boolean) => void;
    embedded?: boolean;
    height?: HeightType;
}

export function WidgetConfigShell(props: WidgetConfigShellProps) {
    const {
        content, configPanel,
        showConfig, configDisplayMode,
        splitRatio, splitLayout,
        onSplitRatioChange, onOpenChange,
        embedded, height,
    } = props;

    const isEmbedded = embedded ?? false;
    const isResizable = height === 'resizable';

    const paddingClass = isEmbedded ? 'p-0' : 'p-2';
    const heightClass = isResizable ? 'h-fit' : 'h-full';
    const overflowClass = isResizable ? 'overflow-hidden' : 'overflow-auto';

    return (
        <>
            <div className={cn('group w-full relative overflow-hidden', heightClass)}>
                <WindowSplitter
                    ratio={splitRatio}
                    layout={splitLayout}
                    onChange={onSplitRatioChange}
                    child2Active={showConfig && configDisplayMode === 'inline'}
                >
                    <div className={cn(paddingClass, heightClass, overflowClass, 'relative')}>
                        {content}
                    </div>
                    {configDisplayMode === 'inline'
                        ? <div className={'px-4 py-3 w-full h-full overflow-y-auto'}>{configPanel}</div>
                        : <div/>
                    }
                </WindowSplitter>
            </div>
            <WidgetConfigDialog
                isOpen={showConfig && configDisplayMode === 'dialog'}
                onOpenChange={onOpenChange}
                content={content}
                configPanel={configPanel}
            />
        </>
    );
}
