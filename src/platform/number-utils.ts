


export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatDateShort(date: Date): string {
    // format date local but no seconds
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatNumberFixed(value: number) {
    return formatNumber(value, 1);
}

// Format number to a small repsentation, max 3 digits
// 1234 -> 1.23K
// 1234567 -> 1.23M
// 1234567890 -> 1.23B
// 12.3456 -> 12.35
// 0.123456 -> 0.1235
export function formatNumber(value: number, decimals: number = 1): string {
    try {
        if (isNaN(value)) {
            return "NaN";
        }
        if (value === Infinity) {
            return "∞";
        }
        if (value === -Infinity) {
            return "-∞";
        }
        // if larger than e+15, use exponential notation
        if (Math.abs(value) >= 1.0e+15) {
            return value.toExponential(decimals);
        }
        if (Math.abs(value) >= 1.0e+12) {
            return (value / 1.0e+9).toFixed(decimals) + "T";
        }
        else if (Math.abs(value) >= 1.0e+9) {
            return (value / 1.0e+9).toFixed(decimals) + "B";
        }
        else if (Math.abs(value) >= 1.0e+6) {
            return (value / 1.0e+6).toFixed(decimals) + "M";
        }
        else if (Math.abs(value) >= 1.0e+3) {
            return (value / 1.0e+3).toFixed(decimals) + "K";
        }
        else {
            return value.toFixed(decimals);
        }
    } catch (e) {
        console.error("Error formatting number:", e);
        return value.toString();
    }
}