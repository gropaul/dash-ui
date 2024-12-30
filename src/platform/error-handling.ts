export function getErrorMessage(error: unknown): Record<string, any> {
    if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
        try {
            return JSON.parse(error.message)
        } catch (_) {
            // Let the lower part handle things...
        }
    }

    return {
        message: error?.toString() || ""
    }
}