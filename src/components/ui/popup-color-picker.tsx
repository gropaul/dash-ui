import React, {useEffect, useRef, useState} from 'react'
import {ColorResult, SketchPicker} from 'react-color'
import {DEFAULT_COLORS} from "@/platform/global-data";

interface ButtonColorProps {
    color?: string
    setColor?: (color: string) => void
}

export function PopupColorPicker({color = DEFAULT_COLORS[0], setColor}: ButtonColorProps) {
    const [displayColorPicker, setDisplayColorPicker] = useState<boolean>(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleClick = () => {
        setDisplayColorPicker(!displayColorPicker)
    }

    const handleClose = () => {
        setDisplayColorPicker(false)
    }

    const handleChange = (newColor: ColorResult) => {
        setColor && setColor(newColor.hex)
    }

    // Close the color picker when clicking outside the popover
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                handleClose()
            }
        }

        if (displayColorPicker) {
            document.addEventListener('mousedown', handleClickOutside)
        } else {
            document.removeEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [displayColorPicker])

    return (
        <div className="relative inline-block" ref={containerRef}>
            <div
                className="inline-block bg-white rounded-sm shadow border border-gray-300 cursor-pointer"
                onClick={handleClick}
            >
                <div
                    className="w-4 h-4"
                    style={{
                        background: color,
                    }}
                />
            </div>

            {displayColorPicker && (
                <div className="absolute z-50">
                    {/* This fixed backdrop will close the picker when clicked */}
                    <div className="fixed inset-0" onClick={handleClose}/>
                    <div className="relative">
                        <SketchPicker
                            color={color}
                            onChange={handleChange}
                            presetColors={DEFAULT_COLORS}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default PopupColorPicker
