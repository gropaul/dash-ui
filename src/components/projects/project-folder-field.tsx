'use client';

import {FolderOpen, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";

/** Electron only: the folder holding a project's files; "/" is the default folder next to the project's database. */
export function ProjectFolderField({value, onChange}: { value: string; onChange: (rootPath: string) => void }) {
    const workspace = typeof window !== 'undefined' ? window.dashNative?.workspace : undefined;
    if (!workspace) return null;
    const isDefault = value === "/";

    const choose = async () => {
        const folder = await workspace.chooseFolder();
        if (folder) onChange(folder);
    };

    return (
        <div className="space-y-2">
            <Label>Folder</Label>
            <div className="flex items-center gap-1">
                <div className="flex h-9 min-w-0 flex-1 items-center rounded-md border px-3 text-sm">
                    <span className={`truncate ${isDefault ? "text-muted-foreground" : ""}`}>{isDefault ? "Default folder" : value}</span>
                </div>
                {!isDefault && (
                    <TooltipWrapper message="Use the default folder">
                        <Button variant="ghost" size="icon" aria-label="Use the default folder" onClick={() => onChange("/")}>
                            <X/>
                        </Button>
                    </TooltipWrapper>
                )}
                <Button variant="outline" onClick={choose}>
                    <FolderOpen className="mr-2 h-4 w-4"/> Choose…
                </Button>
            </div>
        </div>
    );
}
