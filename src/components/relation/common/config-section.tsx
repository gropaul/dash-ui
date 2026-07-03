// --- Collapsible config section ---

import {ChevronDown} from "lucide-react";
import {useState} from "react";
import {cn} from "@/lib/utils";
import {Muted} from "@/components/ui/typography"
import {Label} from "@/components/ui/label";

interface ConfigSectionProps {
    title: string;
    // shown on the right of the header while the section is collapsed
    collapsedSummary?: string;
    children: React.ReactNode;
}

export function ConfigSection({title, collapsedSummary, children}: ConfigSectionProps) {
    const [open, setOpen] = useState(true);
    return (
        <div className="flex flex-col gap-2">
            <div
                className="flex cursor-pointer items-center gap-1.5"
                onClick={() => setOpen(!open)}
            >
                <ChevronDown
                    size={14}
                    className={cn("text-muted-foreground transition-transform", !open && "-rotate-90")}
                />
                <Label className="flex-1 cursor-pointer"><Muted>{title}</Muted></Label>
                {!open && collapsedSummary && (
                    <span className="text-xs text-muted-foreground">{collapsedSummary}</span>
                )}
            </div>
            {open && children}
        </div>
    );
}