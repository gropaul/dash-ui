'use client';

import {BarChart3, Box, Compass, Database, FlaskConical, Layers, LucideIcon, Rocket, Sparkles} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {cn} from "@/lib/utils";
import {ProjectIconKey} from "@/model/project";

// The picker offers the Dash logo (default) plus 8 lucide presets. Order = grid order.
export const PROJECT_ICON_KEYS: ProjectIconKey[] = [
    'dash', 'database', 'chart', 'rocket', 'flask', 'compass', 'box', 'layers', 'sparkles',
];

const LUCIDE_ICONS: Record<Exclude<ProjectIconKey, 'dash'>, LucideIcon> = {
    database: Database,
    chart: BarChart3,
    rocket: Rocket,
    flask: FlaskConical,
    compass: Compass,
    box: Box,
    layers: Layers,
    sparkles: Sparkles,
};

interface ProjectIconProps {
    icon: ProjectIconKey;
    className?: string;
    size?: number;
}

/**
 * Renders a project's icon inside an Avatar (matching the app-icon look) — the Dash logo
 * image for 'dash', otherwise a lucide glyph in the fallback. Defaults to the app-icon size;
 * override via `className` (e.g. smaller in dropdown rows / the picker grid).
 */
export function ProjectIcon({icon, className, size = 16}: ProjectIconProps) {
    const Icon = icon !== 'dash' ? LUCIDE_ICONS[icon] : null;
    return (
        <Avatar className={cn("h-8 w-8 flex-shrink-0", className)}>
            {icon === 'dash' ? (
                <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Dash"/>
            ) : (
                <AvatarFallback className="bg-muted text-foreground">
                    {Icon && <Icon size={size}/>}
                </AvatarFallback>
            )}
        </Avatar>
    );
}

interface ProjectIconPickerProps {
    value: ProjectIconKey;
    onChange: (icon: ProjectIconKey) => void;
}

/** A grid of the 9 preset tiles; the selected one is ring-highlighted. */
export function ProjectIconPicker({value, onChange}: ProjectIconPickerProps) {
    return (
        <div className="grid grid-cols-5 gap-2">
            {PROJECT_ICON_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    aria-label={key}
                    aria-pressed={value === key}
                    onClick={() => onChange(key)}
                    className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-md border transition-colors",
                        value === key
                            ? "border-primary ring-2 ring-primary/30 bg-accent"
                            : "border-border hover:bg-accent",
                    )}
                >
                    <ProjectIcon icon={key} size={16} className="h-6 w-6"/>
                </button>
            ))}
        </div>
    );
}
