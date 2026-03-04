/**
 * Minimal cron-style scheduler — no external dependencies.
 *
 * Supports 5-field expressions: <minute> <hour> <dom> <month> <dow>
 * Each field accepts: * | number | comma list (1,2,3) | range (1-5) | step (*\/2)
 *
 * Examples:
 *   '0 * * * *'   — every hour at minute 0
 *   '*\/30 * * * *' — every 30 minutes
 *   '0 9 * * 1'   — every Monday at 09:00
 */

type CronField = number[]

function parseField(field: string, min: number, max: number): CronField {
    if (field === '*') {
        return range(min, max)
    }
    // step: */n
    if (field.startsWith('*/')) {
        const step = parseInt(field.slice(2), 10)
        return range(min, max).filter((v) => (v - min) % step === 0)
    }
    // comma-separated parts (each may be a range or number)
    const values: number[] = []
    for (const part of field.split(',')) {
        if (part.includes('-')) {
            const [lo, hi] = part.split('-').map(Number)
            values.push(...range(lo, hi))
        } else {
            values.push(parseInt(part, 10))
        }
    }
    return values
}

function range(lo: number, hi: number): number[] {
    const out: number[] = []
    for (let i = lo; i <= hi; i++) out.push(i)
    return out
}

function matches(expr: string, date: Date): boolean {
    const [minF, hourF, domF, monF, dowF] = expr.trim().split(/\s+/)
    return (
        parseField(minF, 0, 59).includes(date.getMinutes()) &&
        parseField(hourF, 0, 23).includes(date.getHours()) &&
        parseField(domF, 1, 31).includes(date.getDate()) &&
        parseField(monF, 1, 12).includes(date.getMonth() + 1) &&
        parseField(dowF, 0, 6).includes(date.getDay())
    )
}

/**
 * Schedule a job using a cron expression.
 * Ticks every 60 seconds and fires when the expression matches.
 * Returns a handle that can be cleared with clearInterval.
 */
export function scheduleCron(expression: string, job: () => void): ReturnType<typeof setInterval> {
    return setInterval(() => {
        if (matches(expression, new Date())) {
            job()
        }
    }, 60_000)
}
