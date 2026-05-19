"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import {cn} from "@/lib/utils"
import {SliderMode} from "@/model/relation-view-state/slider"

const thumbClass = "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

interface SliderProps extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'value'> {
    value?: number[];
    mode?: SliderMode;
}

function formatBubble(v: number, step: number): string {
    if (step >= 1) return v.toFixed(0);
    const decimals = Math.min(Math.round(-Math.log10(step)), 10);
    return v.toFixed(decimals);
}

const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    SliderProps
>(({className, mode = 'eq', value, min = 0, max = 100, step, ...props}, ref) => {
    const values = value ?? [min];
    const [hoveredThumb, setHoveredThumb] = React.useState<number | null>(null);
    const [focusedThumb, setFocusedThumb] = React.useState<number | null>(null);

    const effectiveStep = typeof step === 'number' ? step : 1;
    const range = max - min || 1;
    const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));

    const p0 = pct(values[0] ?? min);
    const p1 = pct(values[1] ?? max);

    return (
        <SliderPrimitive.Root
            ref={ref}
            value={value}
            min={min}
            max={max}
            step={step}
            className={cn("relative flex w-full touch-none select-none items-center", className)}
            {...props}
        >
            <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
                {/* Hide default Range; custom segments below handle coloring */}
                <SliderPrimitive.Range className="absolute h-full bg-transparent"/>

                {mode === 'lower' && (
                    <div className="absolute h-full bg-primary" style={{left: 0, width: `${p0}%`}}/>
                )}
                {mode === 'higher' && (
                    <div className="absolute h-full bg-primary" style={{left: `${p0}%`, width: `${100 - p0}%`}}/>
                )}
                {mode === 'in_range' && (
                    <div className="absolute h-full bg-primary" style={{left: `${p0}%`, width: `${p1 - p0}%`}}/>
                )}
                {mode === 'out_range' && (
                    <>
                        <div className="absolute h-full bg-primary" style={{left: 0, width: `${p0}%`}}/>
                        <div className="absolute h-full bg-primary" style={{left: `${p1}%`, width: `${100 - p1}%`}}/>
                    </>
                )}
                {/* eq: no range highlight */}
            </SliderPrimitive.Track>

            {/* Bubbles rendered as siblings of Thumbs, positioned by percentage relative to Root */}
            {values.map((v, i) => {
                const showBubble = hoveredThumb === i || focusedThumb === i;
                const pos = i === 0 ? p0 : p1;
                return showBubble ? (
                    <span
                        key={`bubble-${i}`}
                        className="absolute rounded bg-popover border px-1.5 py-0.5 text-xs text-popover-foreground shadow-sm whitespace-nowrap pointer-events-none z-50"
                        style={{left: `${pos}%`, bottom: 'calc(100% + 6px)', transform: 'translateX(-50%)'}}
                    >
                        {formatBubble(v, effectiveStep)}
                    </span>
                ) : null;
            })}

            {values.map((v, i) => (
                <SliderPrimitive.Thumb
                    key={i}
                    className={thumbClass}
                    onMouseEnter={() => setHoveredThumb(i)}
                    onMouseLeave={() => setHoveredThumb(null)}
                    onFocus={() => setFocusedThumb(i)}
                    onBlur={() => setFocusedThumb(null)}
                    onKeyDown={(e) => {
                        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                            e.stopPropagation();
                        }
                    }}
                />
            ))}
        </SliderPrimitive.Root>
    );
});

Slider.displayName = SliderPrimitive.Root.displayName;

export {Slider};
