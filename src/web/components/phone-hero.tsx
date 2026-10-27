import {ExternalLink} from "lucide-react";
import {canvasNodes} from "@/state/workspace/canvas-text";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";

/**
 * The landing canvas's text and links as a plain page: for phones, where the canvas is too small to use, and in the
 * page's HTML on every screen, for search engines.
 */
export function PhoneHero({text}: { text: string }) {
    const nodes = canvasNodes(text);
    return (
        <div className="space-y-5">
            {/* `note…` texts annotate the canvas, which phones don't show. */}
            {nodes.filter(n => n.type === 'text' && !n.id.startsWith('note')).map(node => node.attributes['text-style'] === 'h1'
                ? <h1 key={node.id} className="text-4xl font-bold tracking-tight">{node.body}</h1>
                : <p key={node.id} className="text-lg text-muted-foreground">{node.body}</p>)}
            <div className="flex flex-wrap gap-3">
                {nodes.filter(n => n.type === 'link').map(node => (
                    <a key={node.id} href={node.attributes.href} target="_blank" rel="noopener noreferrer"
                       className={cn(buttonVariants({variant: node.attributes.variant === 'outline' ? 'outline' : 'default', size: 'lg'}), "gap-2 rounded-2xl")}>
                        {node.body}
                        <ExternalLink className="h-4 w-4 opacity-70"/>
                    </a>
                ))}
            </div>
        </div>
    );
}
