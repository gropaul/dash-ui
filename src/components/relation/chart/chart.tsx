import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {ChartContentWrapper} from "@/components/relation/chart/chart-content-wrapper";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {WidgetConfigShell} from "@/components/relation/widget-config-shell";

export function Chart(props: RelationViewContentProps) {
    const configState = props.relationState.viewState.configState;
    const configDisplayMode = props.configDisplayMode ?? configState?.configDisplayMode ?? (props.embedded ? 'dialog' : 'inline');

    return (
        <WidgetConfigShell
            showConfig={configState?.showConfig ?? true}
            configDisplayMode={configDisplayMode}
            splitRatio={configState?.configSplitRatio ?? 0.5}
            splitLayout={configState?.configSplitLayout ?? 'column'}
            onSplitRatioChange={(r) => props.updateRelationViewState({configState: {configSplitRatio: r}})}
            onOpenChange={(open) => props.updateRelationViewState({configState: {showConfig: open}})}
            embedded={props.embedded}
            height={props.height}
            content={<ChartContentWrapper {...props}/>}
            configPanel={<ChartConfigView {...props}/>}
        />
    );
}
