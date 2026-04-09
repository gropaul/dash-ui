import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {ChartContentWrapper} from "@/components/relation/chart/chart-content-wrapper";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {WidgetConfigShell} from "@/components/relation/widget-config-shell";

export function Chart(props: RelationViewContentProps) {
    return (
        <WidgetConfigShell
            content={<ChartContentWrapper {...props}/>}
            configPanel={<ChartConfigView {...props}/>}
            {...props}
        />
    );
}
