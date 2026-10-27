import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {EllipsisVertical} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewProps} from "@/components/relation/relation-view";
import React from "react";
import {FileMenuItems} from "@/components/workspace/file-menu-items";
import {useWorkspace} from "@/state/workspace/workspace.state";

export interface RelationSettingsProps extends RelationViewProps {
    align?: "start" | "center" | "end";
    className?: string;
    /** View-specific extras rendered above the file actions (e.g. the Show Query toggle). */
    children?: React.ReactNode;
}

/**
 * The `⋮` settings menu shown on a relation. Callers inject view-specific extras (like the Show Query toggle)
 * through `children`; a query shown from its own file adds the file's actions (Rename / Copy link / Delete).
 */
export function RelationSettings(props: RelationSettingsProps) {
    // A query's id is its file's path; a page block's is `page.md#name`, which is no file.
    const path = props.relationState.id;
    const isFile = useWorkspace(s => path in s.files);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={props.className}>
                    <EllipsisVertical className="h-4 w-4 mr-2"/>
                    <span className="sr-only">Open settings</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align={props.align ?? "start"}>
                {props.children}
                {props.children && isFile && <DropdownMenuSeparator/>}
                {isFile && <FileMenuItems variant="dropdown" path={path} isFolder={false}/>}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
