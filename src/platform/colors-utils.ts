export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };

/**
 * Converts a HEX color to an RGB object.
 */
export function hexToRgb(hex: string): RGB {
    if (!hex.startsWith("#")) {
        hex = "#" + hex;
    }
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

/**
 * Converts an RGB object to a HEX color string.
 */
export function rgbToHex({ r, g, b }: RGB): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/**
 * Converts an RGB object to an HSL object.
 */
export function rgbToHsl({ r, g, b }: RGB): HSL {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    let l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r:
                h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
                break;
            case g:
                h = ((b - r) / delta + 2) * 60;
                break;
            case b:
                h = ((r - g) / delta + 4) * 60;
                break;
        }
    }
    return { h, s, l };
}

/**
 * Converts an HSL object to an RGB object.
 */
export function hslToRgb({ h, s, l }: HSL): RGB {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
        r = c; g = 0; b = x;
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
    };
}

/**
 * Lightens a HEX color by a given lightness factor.
 */
export function lightenColor(hex: string, lightnessFactor: number): string {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb);

    // Increase the lightness and ensure it doesn't exceed 1
    hsl.l = Math.min(1, hsl.l + lightnessFactor);

    const newRgb = hslToRgb(hsl);
    return rgbToHex(newRgb);
}

