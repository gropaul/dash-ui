import {ColorPalette} from "@/components/ui/color-palette";
import {Slider} from "@/components/ui/slider";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Blend, Diameter, Highlighter, PenTool, Pencil} from "lucide-react";
import {DrawSettings, DrawToolVariant, TOOL_VARIANT_PRESETS} from "@/components/workflow/models";

interface FreeDrawToolbarProps {
    settings: DrawSettings;
    onSettingsChange: (settings: DrawSettings) => void;
}

export function FreeDrawToolbar({settings, onSettingsChange}: FreeDrawToolbarProps) {
    const updateSettings = (partial: Partial<DrawSettings>) => {
        onSettingsChange({...settings, ...partial});
    };

    const selectToolVariant = (variant: DrawToolVariant) => {
        const preset = TOOL_VARIANT_PRESETS[variant];
        onSettingsChange({
            ...settings,
            toolVariant: variant,
            ...preset,
        });
    };

    return (
        <div
            className="absolute bottom-[72px] left-1/2 -translate-x-1/2 bg-white border border-[#ededed] rounded-xl shadow-sm z-[200]"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
        >
            <div className="flex items-center">
                {/* Tool Variants */}
                <ToggleGroup
                    type="single"
                    value={settings.toolVariant}
                    onValueChange={(value) => value && selectToolVariant(value as DrawToolVariant)}
                    size="sm"
                    className="gap-0"
                >
                    <ToggleGroupItem value="pen" className="w-10 h-10 rounded-none border-r border-border rounded-l-xl">
                        <Pencil size={16}/>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="marker" className="w-10 h-10 rounded-none  border-r border-border">
                        <PenTool size={16} className="-rotate-90"/>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="highlighter" className="w-10 h-10 rounded-none  border-r border-border">
                        <Highlighter size={16}/>
                    </ToggleGroupItem>
                </ToggleGroup>

                <div className="w-4 h-10"/>

                {/* Color */}
                <ColorPalette
                    color={settings.color}
                    onChange={(color) => updateSettings({color})}
                />

                <div className="w-px mr-3 ml-4 h-10 bg-border"/>

                {/* Size */}
                <div className="flex items-center gap-2">
                    <Diameter size={16} className="text-muted-foreground"/>
                    <Slider
                        value={[settings.size]}
                        onValueChange={([size]) => updateSettings({size})}
                        min={1}
                        max={40}
                        step={1}
                        className="w-24"
                    />
                </div>

                <div className="w-px mr-3 ml-4 h-10 bg-border"/>

                {/* Opacity */}
                <div className="flex items-center gap-2">
                    <Blend size={16} className="text-muted-foreground"/>
                    <Slider
                        value={[settings.opacity * 100]}
                        onValueChange={([opacity]) => updateSettings({opacity: opacity / 100})}
                        min={10}
                        max={100}
                        step={5}
                        className="w-24"
                    />
                </div>
                <div className="w-4 h-10"/>
            </div>
        </div>
    );
}
