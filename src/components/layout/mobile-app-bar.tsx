import {Button} from "@/components/ui/button";
import {ArrowLeft} from "lucide-react";
import React from "react";


interface SettingsAppBarProps {
    onBackButtonClick: () => void;
    label: string;
}


export function MobileAppBar(props: SettingsAppBarProps) {
    return (
        <div className="w-full bg-background p-1.5 border-b border-separate flex flex-row items-center">
            <Button
                variant={'ghost'}
                size={'icon'}
                onClick={() => props.onBackButtonClick()}
            >
                {/* Back arrow icon */}
                <ArrowLeft className="h-6 w-6"/>
            </Button>
            {/* Title of the active tab */}
            <h5 className="font-bold inline align-middle">
                {props.label}
            </h5>
        </div>
    );
}
