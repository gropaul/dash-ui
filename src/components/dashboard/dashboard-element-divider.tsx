import { DashboardElementType } from "@/model/dashboard-state";
import {Button} from "@/components/ui/button";
import {ChartLine, LetterText} from "lucide-react";

export interface DashboardElementDividerProps {
    onlyShowOnHover?: boolean;
    onAddElementClicked: (elementType: DashboardElementType) => void;
}

export function DashboardElementDivider(props: DashboardElementDividerProps) {
    const onlyShowOnHover = props.onlyShowOnHover ?? false;

    const displayClass = onlyShowOnHover ? 'opacity-0 hover:opacity-100 transition-opacity duration-200' : 'block';

    return (
        <div className="h-4 relative">
            <div className={`absolute top-0 left-0 w-full h-full flex items-center justify-center z-[49] ${displayClass}`}>
                <div className="flex space-x-2">

                    <Button
                        variant={'outline'}
                        size={'sm'}
                        onClick={() => props.onAddElementClicked('text')}
                    >
                        <LetterText /> Add Text
                    </Button>
                    <Button
                        variant={'outline'}
                        size={'sm'}
                        onClick={() => props.onAddElementClicked('data')}
                    >
                        <ChartLine /> Add Data
                    </Button>
                </div>
            </div>
        </div>
    );
}
