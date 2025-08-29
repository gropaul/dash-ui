import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger,
    ContextMenuTrigger
} from "@/components/ui/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {ArrowDown, ChevronDown, Ellipsis, EllipsisVertical, Menu} from "lucide-react";
import {MouseEventHandler} from "react";
import { useIsMobile } from "@/components/provider/responsive-node-provider";
import {cn} from "@/lib/utils";


interface ResponsiveMenuProps {
    children?: React.ReactNode;
}

export function ResponsiveMenu(props: ResponsiveMenuProps) {

    const isMobile = useIsMobile();

    if (isMobile) {
        return <DropdownMenu>
            {props.children}
        </DropdownMenu>
    } else {
        return <ContextMenu>
            {props.children}
        </ContextMenu>

    }
}

interface ResponsiveMenuTriggerProps {
    children?: React.ReactNode;
    disabled?: boolean;
    className?: string;
}


export function ResponsiveMenuTrigger(props: ResponsiveMenuTriggerProps) {

    const isMobile = useIsMobile();

    if (isMobile) {
        return <div className={cn('flex flex-row items-center', props.className)}>
            {props.children}
            <DropdownMenuTrigger disabled={props.disabled} className={'flex-shrink-0'}>
                <Button variant={'ghost'} size={'icon'} className={'h-8 w-8 text-muted-foreground'}>
                    <Menu size={16}/>
                </Button>
            </DropdownMenuTrigger>
        </div>
    } else {
        return <ContextMenuTrigger disabled={props.disabled} className={props.className}>
            {props.children}
        </ContextMenuTrigger>
    }
}

export interface ResponsiveMenuContentProps {
    children?: React.ReactNode
    className?: string
}

export function ResponsiveMenuContent(props: ResponsiveMenuContentProps) {

    const isMobile = useIsMobile();

    if (isMobile) {
        return <DropdownMenuContent className={props.className}>
            {props.children}
        </DropdownMenuContent>
    } else {
        return <ContextMenuContent className={props.className}>
            {props.children}
        </ContextMenuContent>
    }
}

export interface ResponsiveMenuItemProps {
    children?: React.ReactNode
    className?: string
    onClick?: MouseEventHandler | undefined;
}

export function ResponsiveMenuItem(props: ResponsiveMenuItemProps) {

    const isMobile = useIsMobile();

    if (isMobile) {
        return <DropdownMenuItem className={props.className} onClick={props.onClick}>
            {props.children}
        </DropdownMenuItem>
    } else {
        return <ContextMenuItem className={props.className} onClick={props.onClick}>
            {props.children}
        </ContextMenuItem>
    }
}

export interface ResponsiveMenuSeparatorProps {
    className?: string
}

export function ResponsiveMenuSeparator(props: ResponsiveMenuSeparatorProps) {

    const isMobile = useIsMobile();

    if (isMobile) {
        return <DropdownMenuSeparator className={props.className}/>
    } else {
        return <ContextMenuSeparator className={props.className}/>
    }
}

export interface ResponsiveMenuSubProps {
    children?: React.ReactNode
}

export function ResponsiveMenuSub(props: ResponsiveMenuSubProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return <DropdownMenuSub>
            {props.children}
        </DropdownMenuSub>
    } else {
        return <ContextMenuSub>
            {props.children}
        </ContextMenuSub>
    }
}


export interface ResponsiveMenuSubTriggerProps {
    children?: React.ReactNode
    className?: string
}

export function ResponsiveMenuSubTrigger(props: ResponsiveMenuSubTriggerProps) {

    const isMobile = useIsMobile();

    if (isMobile) {
        return <DropdownMenuSubTrigger className={props.className}>
            {props.children}
        </DropdownMenuSubTrigger>
    } else {
        return <ContextMenuSubTrigger className={props.className}>
            {props.children}
        </ContextMenuSubTrigger>
    }
}


export interface ResponsiveMenuSubContentProps {
    children?: React.ReactNode
    className?: string
    onClick?: MouseEventHandler | undefined;
}

export function ResponsiveMenuSubContent(props: ResponsiveMenuSubContentProps) {

    const isMobile = useIsMobile();

    if (isMobile) {
        return <DropdownMenuSubContent className={props.className} onClick={props.onClick}>
            {props.children}
        </DropdownMenuSubContent>
    } else {
        return <ContextMenuSubContent className={props.className} onClick={props.onClick}>
            {props.children}
        </ContextMenuSubContent>
    }
}