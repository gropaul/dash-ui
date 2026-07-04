import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";
import {WidgetToolbar} from "@/components/dashboard/widgets/widget-toolbar";
import {cn} from "@/lib/utils";

/**
 * Thin text-widget interface. Swapping the underlying editor later (e.g. a rich WYSIWYG) should
 * only touch this file. v1: markdown edited in a plain textarea, rendered with MarkdownRenderer.
 */
export interface TextWidgetProps {
    value: string;
    editable: boolean;
    onChange: (value: string) => void;
    onRemove: () => void;
}

export function TextWidget({value, editable, onChange, onRemove}: TextWidgetProps) {
    // View mode: an empty text widget shows nothing at all.
    if (!editable && !value.trim()) return null;

    return (
        <div className="relative w-full h-full group/widget">
            <div className={cn("w-full h-full overflow-auto bg-card rounded-2xl", editable && "border")}>
                {editable ? (
                    <textarea
                        className="w-full h-full resize-none bg-transparent p-2 text-sm outline-none font-mono"
                        placeholder="Write markdown…"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                ) : (
                    <div className="dashboard-prose w-full h-full overflow-auto p-2 text-sm">
                        <MarkdownRenderer markdown={value}/>
                    </div>
                )}
            </div>
            {editable && (
                <WidgetToolbar
                    className="absolute top-0 left-full z-10 opacity-0 transition-opacity group-hover/widget:opacity-100"
                    onRemove={onRemove}
                />
            )}
        </div>
    );
}
