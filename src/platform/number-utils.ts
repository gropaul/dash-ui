export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

// depending on how long the range is, format the dates differently
// e.g. if the range is less than a day, show time as well
// if the range is more than a year, show only year
// make it as short as possible while still being clear
export function formatDateRange(startDate: Date, endDate: Date): [string, string] {
    // if less then a day, show date time of first and only time of the end if same day
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 1) {
        // check if same day
        if (startDate.getDate() === endDate.getDate()
            && startDate.getMonth() === endDate.getMonth()
            && startDate.getFullYear() === endDate.getFullYear()) {
            return [
                startDate.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                endDate.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            ];
        } else {
            return [
                startDate.toLocaleString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                endDate.toLocaleString(undefined, {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            ];
        }
    } else if (diffDays < 365) {
        return [
            startDate.toLocaleDateString(undefined, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }),
            endDate.toLocaleDateString(undefined, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }),
        ];

    } else {
        return [
            startDate.toLocaleDateString(undefined, {
                year: 'numeric',
                month: '2-digit',
            }),
            endDate.toLocaleDateString(undefined, {
                year: 'numeric',
            }),
        ];
    }
}

// depending on how long the range is, format the numbers differently
// e.g. if the range is less than 1000, show full number
// if the range is more than 1 million, show in K/M/B format
// make it as short as possible while still being clear
export function formatNumberRange(start: number, end: number): [string, string] {
    // if range less then 1, show 2 decimal places
    const range = end - start;

    if (range < 1) {
        return [start.toFixed(2), end.toFixed(2)];
    } else if (range < 1000) {
        return [start.toFixed(0), end.toFixed(0)];
    } else {
        return [formatNumber(start), formatNumber(end)];
    }
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
        } else if (Math.abs(value) >= 1.0e+9) {
            return (value / 1.0e+9).toFixed(decimals) + "B";
        } else if (Math.abs(value) >= 1.0e+6) {
            return (value / 1.0e+6).toFixed(decimals) + "M";
        } else if (Math.abs(value) >= 1.0e+3) {
            return (value / 1.0e+3).toFixed(decimals) + "K";
        } else {
            return value.toFixed(decimals);
        }
    } catch (e) {
        console.error("Error formatting number:", e);
        return value.toString();
    }
}