import React from "react";
import {ColorResult, SketchPicker} from "react-color";
import {DEFAULT_COLORS} from "@/platform/global-data";

// shadcn/ui (or your own components)
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Separator} from "@/components/ui/separator";

import {
    PlotType,
    AxisDecoration,
    LineAxisDecoration,
    BarAxisDecoration,
    ScatterAxisDecoration,
    PieAxisDecoration,
    RadarAxisDecoration,
    AreaAxisDecoration,
} from "@/model/relation-view-state/chart";

import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* -------------------------------------------------------------------------- */
/* Original ColorSubMenu (unchanged) */

/* -------------------------------------------------------------------------- */

interface ColorSubMenuProps {
    label: string;
    color: string;
    setColor: (color: ColorResult) => void;
}

export function ColorSubMenu(props: ColorSubMenuProps) {
    const {color, setColor} = props;

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger withArrow={false} inset={false}>
                <div className="flex items-center gap-2 justify-between w-full">
                    <Label>{props.label}</Label>
                    <div
                        className="inline-block bg-white rounded-sm shadow border border-muted-foreground cursor-pointer h-4 w-4"
                        style={{
                            background: color,
                        }}
                    />
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <SketchPicker
                        styles={{
                            default: {
                                picker: {
                                    boxShadow: "none",
                                    border: "none",
                                },
                            },
                        }}
                        disableAlpha
                        color={color}
                        onChange={setColor}
                        presetColors={DEFAULT_COLORS}
                    />
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );
}

/* -------------------------------------------------------------------------- */
/* Main Axis Decoration Menu (Color + Chart-Specific) */

/* -------------------------------------------------------------------------- */

interface ButtonColorProps {
    plotType: PlotType;
    decoration: AxisDecoration;
    setDecoration: (decoration: AxisDecoration) => void;
}

export function DataAxisDecorationMenu(props: ButtonColorProps) {
    const {decoration, setDecoration} = props;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                {/* Series-level color swatch */}
                <div
                    className="inline-block bg-white rounded-sm shadow border border-gray-300 cursor-pointer h-4 w-4"
                    style={{
                        background: decoration.color,
                    }}
                />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 text-sm">
                {/* Submenu for main series color */}

                <ChartSpecificDecoration {...props} />

            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Chooses which sub-menu to show based on `plotType`.
 */
export function ChartSpecificDecoration(props: ButtonColorProps) {
    const {plotType} = props;
    switch (plotType) {
        case "line":
            return <LineAxisDecorationMenu {...props} />;
        case "bar":
            return <BarAxisDecorationMenu {...props} />;
        case "scatter":
            return <ScatterAxisDecorationMenu {...props} />;
        case "pie":
            return <PieAxisDecorationMenu {...props} />;
        case "radar":
            return <RadarAxisDecorationMenu {...props} />;
        case "area":
            return <AreaAxisDecorationMenu {...props} />;
        default:
            return null;
    }
}

/* -------------------------------------------------------------------------- */
/* LINE AXIS DECORATION MENU */

/* -------------------------------------------------------------------------- */

function LineAxisDecorationMenu({decoration, setDecoration}: ButtonColorProps) {
    const line = decoration.line;

    const updateLine = (partial: Partial<LineAxisDecoration>) => {
        setDecoration({
            ...decoration,
            line: {
                ...line,
                ...partial,
            },
        });
    };

    const handleColorChange = (color: ColorResult) => {
        setDecoration({
            ...decoration,
            color: color.hex,
        });
    };

    const updateDots = (partial: Partial<LineAxisDecoration["dots"]>) => {
        setDecoration({
            ...decoration,
            line: {
                ...line,
                dots: {
                    ...line.dots,
                    ...partial,
                },
            },
        });
    };

    return (
        <>
            {/* Stroke Settings */}
            <ColorSubMenu
                label="Stroke Color"
                color={decoration.color}
                setColor={handleColorChange}
            />
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Stroke Width</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={line.strokeWidth}
                    onChange={(e) => updateLine({strokeWidth: +e.target.value})}
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Dasharray</Label>
                <Input
                    className="max-w-[80px]"
                    type="text"
                    value={line.strokeDasharray}
                    onChange={(e) => updateLine({strokeDasharray: e.target.value})}
                    placeholder="5 5"
                />
            </DropdownMenuItem>

            <Separator className="my-2"/>

            {/* Dots Group */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Show Dots</Label>
                <Switch
                    checked={line.dots.visible}
                    onCheckedChange={(checked) => updateDots({visible: checked})}
                />
            </DropdownMenuItem>

            {line.dots.visible && (
                <>
                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Dot Radius</Label>
                        <Input
                            className="max-w-[80px]"
                            type="number"
                            value={line.dots.radius}
                            onChange={(e) => updateDots({radius: +e.target.value})}
                        />
                    </DropdownMenuItem>

                    <ColorSubMenu
                        label="Dot Fill"
                        color={line.dots.fill}
                        setColor={(c) => updateDots({fill: c.hex})}
                    />
                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Dot Border Width</Label>
                        <Input
                            className="max-w-[80px]"
                            type="number"
                            value={line.dots.borderWidth}
                            onChange={(e) => updateDots({borderWidth: +e.target.value})}
                        />
                    </DropdownMenuItem>

                    <ColorSubMenu
                        label="Dot Border Color"
                        color={line.dots.borderColor}
                        setColor={(c) => updateDots({borderColor: c.hex})}
                    />
                </>
            )}
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* BAR AXIS DECORATION MENU */

/* -------------------------------------------------------------------------- */

function BarAxisDecorationMenu({decoration, setDecoration}: ButtonColorProps) {
    const bar = decoration.bar;

    const updateBar = (partial: Partial<BarAxisDecoration>) => {
        setDecoration({
            ...decoration,
            bar: {
                ...bar,
                ...partial,
            },
        });
    };

    const handleColorChange = (color: ColorResult) => {
        setDecoration({
            ...decoration,
            color: color.hex,
        });
    };

    const updateBarBorder = (partial: Partial<BarAxisDecoration["border"]>) => {
        setDecoration({
            ...decoration,
            bar: {
                ...bar,
                border: {
                    ...bar.border,
                    ...partial,
                },
            },
        });
    };

    return (
        <>
            {/* Bar Main */}
            <ColorSubMenu
                label="Fill Color"
                color={decoration.color}
                setColor={handleColorChange}
            />
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Bar Width (px)</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={bar.barWidth}
                    onChange={(e) => updateBar({barWidth: +e.target.value})}
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Stacked</Label>
                <Switch
                    checked={bar.stacked}
                    onCheckedChange={(checked) => updateBar({stacked: checked})}
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Corner Radius</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={bar.cornerRadius}
                    onChange={(e) => updateBar({cornerRadius: +e.target.value})}
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Fill Opacity</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    step="0.1"
                    max={1}
                    min={0}
                    value={bar.fillOpacity}
                    onChange={(e) => updateBar({fillOpacity: +e.target.value})}
                />
            </DropdownMenuItem>

            <Separator className="my-2"/>

            {/* Border */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Border Width</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={bar.border.width}
                    onChange={(e) => updateBarBorder({width: +e.target.value})}
                />
            </DropdownMenuItem>

            <ColorSubMenu
                label="Border Color"
                color={bar.border.color}
                setColor={(c) => updateBarBorder({color: c.hex})}
            />
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* SCATTER AXIS DECORATION MENU */

/* -------------------------------------------------------------------------- */

function ScatterAxisDecorationMenu({decoration, setDecoration}: ButtonColorProps) {
    const scatter = decoration.scatter;

    const updateScatter = (partial: Partial<ScatterAxisDecoration>) => {
        setDecoration({
            ...decoration,
            scatter: {
                ...scatter,
                ...partial,
            },
        });
    };

    const updateStroke = (partial: Partial<ScatterAxisDecoration["stroke"]>) => {
        setDecoration({
            ...decoration,
            scatter: {
                ...scatter,
                stroke: {
                    ...scatter.stroke,
                    ...partial,
                },
            },
        });
    };

    return (
        <>
            {/* Shape */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Shape</Label>
                <Select
                    value={scatter.shape}
                    onValueChange={(v) =>
                        updateScatter({shape: v as ScatterAxisDecoration["shape"]})
                    }
                >
                    <SelectTrigger className="max-w-[120px]">
                        <SelectValue placeholder="Select shape"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="triangle">Triangle</SelectItem>
                        <SelectItem value="diamond">Diamond</SelectItem>
                    </SelectContent>
                </Select>
            </DropdownMenuItem>

            {/* Fill Settings */}
            <ColorSubMenu
                label="Fill Color"
                color={scatter.fillColor}
                setColor={(c) => updateScatter({fillColor: c.hex})}
            />

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Fill Opacity</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={scatter.fillOpacity}
                    onChange={(e) => updateScatter({fillOpacity: +e.target.value})}
                />
            </DropdownMenuItem>

            <Separator className="my-2"/>

            {/* Stroke Settings */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Stroke Width</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={scatter.stroke.width}
                    onChange={(e) => updateStroke({width: +e.target.value})}
                />
            </DropdownMenuItem>

            <ColorSubMenu
                label="Stroke Color"
                color={scatter.stroke.color}
                setColor={(c) => updateStroke({color: c.hex})}
            />

        </>
    );
}

/* -------------------------------------------------------------------------- */
/* PIE AXIS DECORATION MENU */

/* -------------------------------------------------------------------------- */

function PieAxisDecorationMenu({decoration, setDecoration}: ButtonColorProps) {
    const pie = decoration.pie;

    const updatePie = (partial: Partial<PieAxisDecoration>) => {
        setDecoration({
            ...decoration,
            pie: {
                ...pie,
                ...partial,
            },
        });
    };

    const updateLabel = (partial: Partial<PieAxisDecoration["label"]>) => {
        setDecoration({
            ...decoration,
            pie: {
                ...pie,
                label: {
                    ...pie.label,
                    ...partial,
                },
            },
        });
    };

    return (
        <>
            {/* Pie Settings */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Inner Radius</Label>
                <Input
                    className="max-w-[80px]"
                    type="text"
                    value={pie.innerRadius.toString()}
                    onChange={(e) => updatePie({innerRadius: e.target.value})}
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Pad Angle</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={pie.padAngle}
                    onChange={(e) => updatePie({padAngle: +e.target.value})}
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Corner Radius</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={pie.cornerRadius}
                    onChange={(e) => updatePie({cornerRadius: +e.target.value})}
                />
            </DropdownMenuItem>

            <Separator className="my-2"/>

            {/* Label Options */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Show Labels</Label>
                <Switch
                    checked={pie.showLabels}
                    onCheckedChange={(checked) => updatePie({showLabels: checked})}
                />
            </DropdownMenuItem>

            {pie.showLabels && (
                <>
                    <ColorSubMenu
                        label="Label Color"
                        color={pie.label.color}
                        setColor={(c) => updateLabel({color: c.hex})}
                    />

                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Font Size</Label>
                        <Input
                            className="max-w-[80px]"
                            type="number"
                            value={pie.label.fontSize}
                            onChange={(e) => updateLabel({fontSize: +e.target.value})}
                        />
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Font Family</Label>
                        <Input
                            className="max-w-[120px]"
                            type="text"
                            value={pie.label.fontFamily}
                            onChange={(e) => updateLabel({fontFamily: e.target.value})}
                        />
                    </DropdownMenuItem>
                </>
            )}
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* RADAR AXIS DECORATION MENU */

/* -------------------------------------------------------------------------- */

function RadarAxisDecorationMenu({decoration, setDecoration}: ButtonColorProps) {
    const radar = decoration.radar;

    const updateRadar = (partial: Partial<RadarAxisDecoration>) => {
        setDecoration({
            ...decoration,
            radar: {
                ...radar,
                ...partial,
            },
        });
    };

    return (
        <>
            {/* Stroke */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Stroke Width</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={radar.strokeWidth}
                    onChange={(e) => updateRadar({strokeWidth: +e.target.value})}
                />
            </DropdownMenuItem>

            <ColorSubMenu
                label="Border Color"
                color={radar.borderColor}
                setColor={(c) => updateRadar({borderColor: c.hex})}
            />

            <Separator className="my-2"/>

            {/* Fill */}
            <ColorSubMenu
                label="Fill Color"
                color={radar.fillColor}
                setColor={(c) => updateRadar({fillColor: c.hex})}
            />
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Fill Opacity</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    step="0.1"
                    min={0}
                    max={1}
                    value={radar.fillOpacity}
                    onChange={(e) => updateRadar({fillOpacity: +e.target.value})}
                />
            </DropdownMenuItem>

            <Separator className="my-2"/>

            {/* Dots */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Show Dots</Label>
                <Switch
                    checked={radar.showDots}
                    onCheckedChange={(checked) => updateRadar({showDots: checked})}
                />
            </DropdownMenuItem>

            {radar.showDots && (
                <>
                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Dot Size</Label>
                        <Input
                            className="max-w-[80px]"
                            type="number"
                            value={radar.dotSize}
                            onChange={(e) => updateRadar({dotSize: +e.target.value})}
                        />
                    </DropdownMenuItem>

                    <ColorSubMenu
                        label="Dot Color"
                        color={radar.dotColor}
                        setColor={(c) => updateRadar({dotColor: c.hex})}
                    />

                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Dot Border Width</Label>
                        <Input
                            className="max-w-[80px]"
                            type="number"
                            value={radar.dotBorderWidth}
                            onChange={(e) => updateRadar({dotBorderWidth: +e.target.value})}
                        />
                    </DropdownMenuItem>

                    <ColorSubMenu
                        label="Dot Border Color"
                        color={radar.dotBorderColor}
                        setColor={(c) => updateRadar({dotBorderColor: c.hex})}
                    />
                </>
            )}
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* AREA AXIS DECORATION MENU */

/* -------------------------------------------------------------------------- */

function AreaAxisDecorationMenu({decoration, setDecoration}: ButtonColorProps) {
    const area = decoration.area;

    const updateArea = (partial: Partial<AreaAxisDecoration>) => {
        setDecoration({
            ...decoration,
            area: {
                ...area,
                ...partial,
            },
        });
    };

    const updateAreaStroke = (partial: Partial<AreaAxisDecoration["stroke"]>) => {
        setDecoration({
            ...decoration,
            area: {
                ...area,
                stroke: {
                    ...area.stroke,
                    ...partial,
                },
            },
        });
    };

    return (
        <>
            {/* Stroke Settings */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Stroke Width</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={area.stroke.width}
                    onChange={(e) => updateAreaStroke({width: +e.target.value})}
                />
            </DropdownMenuItem>

            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Dasharray</Label>
                <Input
                    className="max-w-[80px]"
                    type="text"
                    value={area.stroke.dasharray}
                    onChange={(e) => updateAreaStroke({dasharray: e.target.value})}
                />
            </DropdownMenuItem>

            <ColorSubMenu
                label="Stroke Color"
                color={area.stroke.color}
                setColor={(c) => updateAreaStroke({color: c.hex})}
            />

            <Separator className="my-2"/>

            {/* Fill */}
            <ColorSubMenu
                label="Fill Color"
                color={area.fillColor}
                setColor={(c) => updateArea({fillColor: c.hex})}
            />
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Fill Opacity</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    step="0.1"
                    min={0}
                    max={1}
                    value={area.fillOpacity}
                    onChange={(e) => updateArea({fillOpacity: +e.target.value})}
                />
            </DropdownMenuItem>

            <Separator className="my-2"/>

            {/* Dots */}
            <DropdownMenuItem
                className={'flex items-center justify-between w-full'}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault()
                }}
            >
                <Label>Show Dots</Label>
                <Switch
                    checked={area.showDots}
                    onCheckedChange={(checked) => updateArea({showDots: checked})}
                />
            </DropdownMenuItem>

            {area.showDots && (
                <>
                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Dot Size</Label>
                        <Input
                            className="max-w-[80px]"
                            type="number"
                            value={area.dotSize}
                            onChange={(e) => updateArea({dotSize: +e.target.value})}
                        />
                    </DropdownMenuItem>

                    <ColorSubMenu
                        label="Dot Color"
                        color={area.dotColor}
                        setColor={(c) => updateArea({dotColor: c.hex})}
                    />

                    <DropdownMenuItem
                        className={'flex items-center justify-between w-full'}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault()
                        }}
                    >
                        <Label>Dot Border Width</Label>
                        <Input
                            className="max-w-[80px]"
                            type="number"
                            value={area.dotBorderWidth}
                            onChange={(e) => updateArea({dotBorderWidth: +e.target.value})}
                        />
                    </DropdownMenuItem>

                    <ColorSubMenu
                        label="Dot Border Color"
                        color={area.dotBorderColor}
                        setColor={(c) => updateArea({dotBorderColor: c.hex})}
                    />
                </>
            )}
        </>
    );
}
