import {ReactNode} from "react";
import {TooltipContent, TooltipProvider, TooltipTrigger, Tooltip} from "@/components/ui/tooltip";


interface TooltipWrapperProps {
    message: string;
    children: ReactNode;
}

export function TooltipWrapper({message, children}: TooltipWrapperProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{message}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}