import {DEFAULT_COLORS} from "@/platform/global-data";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {SketchPicker, ColorResult} from "react-color";
import {useState, useEffect, useMemo} from "react";
import {throttleLatest} from "@/lib/throttle-latest";
import {cn} from "@/lib/utils";

interface ColorSwatchProps {
    color: string;
    selected?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
}

export function ColorSwatch({color, selected, onClick, size = 'md'}: ColorSwatchProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };

    return (
        <div
            className={cn(
                sizeClasses[size],
                "rounded-sm cursor-pointer border transition-all",
                selected ? "ring-2 ring-blue-500 ring-offset-1" : "border-muted-foreground/30 hover:border-muted-foreground"
            )}
            style={{backgroundColor: color}}
            onClick={onClick}
        />
    );
}

interface ColorPaletteProps {
    color: string;
    onChange: (color: string) => void;
    colors?: string[];
    showPicker?: boolean;
    debounceMs?: number;
}

export function ColorPalette({
    color,
    onChange,
    colors = DEFAULT_COLORS,
    showPicker = true,
    debounceMs = 100,
}: ColorPaletteProps) {
    const [localColor, setLocalColor] = useState(color);
    const [pickerOpen, setPickerOpen] = useState(false);

    const throttledOnChange = useMemo(
        () => throttleLatest((c: string) => onChange(c), debounceMs),
        [onChange, debounceMs]
    );

    useEffect(() => {
        setLocalColor(color);
    }, [color]);

    const handleColorChange = (newColor: string) => {
        setLocalColor(newColor);
        throttledOnChange(newColor);
    };

    const handlePickerChange = (result: ColorResult) => {
        handleColorChange(result.hex);
    };

    return (
        <div className="flex items-center gap-1.5">
            {colors.map((c) => (
                <ColorSwatch
                    key={c}
                    color={c}
                    selected={localColor === c}
                    onClick={() => handleColorChange(c)}
                    size="sm"
                />
            ))}
            {showPicker && (
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild>
                        <div
                            className="w-4 h-4 rounded-sm cursor-pointer border border-muted-foreground/30 hover:border-muted-foreground flex items-center justify-center text-[10px] text-muted-foreground"
                            style={{
                                background: colors.includes(localColor)
                                    ? 'linear-gradient(135deg, #fff 50%, #000 50%)'
                                    : localColor
                            }}
                        >
                            {colors.includes(localColor) && '+'}
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <SketchPicker
                            styles={{default: {picker: {boxShadow: "none", border: "none"}}}}
                            disableAlpha
                            color={localColor}
                            onChange={handlePickerChange}
                            presetColors={colors}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
