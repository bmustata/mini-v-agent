/**
 * Formats a millisecond duration into a human-readable string.
 * Sub-second values are shown as "Xms"; longer as "X.XXs".
 */
export const formatElapsed = (ms: number): string => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`)

/**
 * Creates a timer to measure elapsed time in seconds
 * @returns An object with a stop() method that returns elapsed time
 */
export const startTimer = () => {
    const startTime = Date.now()
    return {
        stop: () => formatElapsed(Date.now() - startTime)
    }
}

/**
 * Generates a short random alphanumeric job ID for log correlation (e.g. "xk3mz9").
 * Uses lowercase letters and digits (a-z, 0-9) for safe use in logs and URLs.
 */
export const generateJobId = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
