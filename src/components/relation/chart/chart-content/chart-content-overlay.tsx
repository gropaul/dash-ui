import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Download, Eye, EyeOff, ImageDown, Menu} from "lucide-react";
import {MyChartProps} from "@/components/relation/chart/chart-content";
import {ConfigViewState} from "@/model/relation-view-state/chart";
import {useRelationsState} from "@/state/relations.state";


export interface ChartContentOverlayProps extends MyChartProps{
    hasError?: boolean;
    view: ConfigViewState;
    relationId: string;

    onExportAsSVG?: () => void;
    onExportAsPNG?: () => void;
}

export function ChartContentOverlay(props: ChartContentOverlayProps) {

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);
    const showChartSettings = props.view.showConfig;

    function updateShowConfig() {
        updateRelationViewState(props.relationId, {
            chartState: {
                view: {
                    showConfig: !showChartSettings
                }
            },
        });
    }
    return (
        <div className='absolute right-2 top-2'>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={'ghost'} size={'icon'}>
                        <Menu className="h-4 w-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuSub>
                        <DropdownMenuItem onClick={updateShowConfig}>
                            {showChartSettings ?
                                <> <EyeOff size={16 }/> Hide Chart Settings </>
                                :
                                <> <Eye size={16} /> Show Chart Settings</>
                            }
                        </DropdownMenuItem>
                        <DropdownMenuSubTrigger>
                            <ImageDown size={16}/> Export Chart
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={props.onExportAsPNG}>PNG</DropdownMenuItem>
                                <DropdownMenuItem disabled onClick={props.onExportAsSVG}>SVG</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}