

function lightenColor(hex, lightnessFactor) {
    // Ensure the input starts with a "#" for consistency
    if (!hex.startsWith("#")) {
        hex = "#" + hex;
    }

    // Convert HEX to RGB
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    // Convert RGB to HSL
    const rgbToHsl = (r, g, b) => {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l;
        const delta = max - min;

        l = (max + min) / 2;

        if (delta === 0) {
            h = s = 0; // Achromatic
        } else {
            s = delta / (1 - Math.abs(2 * l - 1));
            switch (max) {
                case r:
                    h = ((g - b) / delta) % 6;
                    break;
                case g:
                    h = (b - r) / delta + 2;
                    break;
                case b:
                    h = (r - g) / delta + 4;
                    break;
            }
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }
        return [h, s, l];
    };

    let [h, s, l] = rgbToHsl(r, g, b);

    // Increase the lightness
    l = Math.min(1, l + lightnessFactor);

    // Convert HSL back to RGB
    const hslToRgb = (h, s, l) => {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return [r, g, b];
    };

    const [newR, newG, newB] = hslToRgb(h, s, l);

    // Convert RGB back to HEX
    return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1).toUpperCase()}`;
}

// Example usage:
const colors = ["5e2bff", "36827f", "db504a", "e3b505", "f2d7ee"];
const lightColors = colors.map(color => lightenColor(color, 0.4)); // Increase lightness by 40%
console.log(lightColors);
