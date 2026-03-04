import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scheduleCron } from '../../server/utils/cronUtils'

describe('cronUtils', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('scheduleCron', () => {
        it('fires when expression matches the current time', () => {
            const job = vi.fn()
            // Set 1 minute BEFORE target so advancing 60s lands on 14:00 (minute=0)
            vi.setSystemTime(new Date(2025, 0, 1, 13, 59, 0))

            const handle = scheduleCron('0 14 * * *', job)
            vi.advanceTimersByTime(60_000) // clock now at 14:00:00 → matches

            expect(job).toHaveBeenCalledTimes(1)
            clearInterval(handle)
        })

        it('does not fire when expression does not match', () => {
            const job = vi.fn()
            // Advancing 60s → 14:02 → minute 2, not 0
            vi.setSystemTime(new Date(2025, 0, 1, 14, 1, 0))

            const handle = scheduleCron('0 14 * * *', job)
            vi.advanceTimersByTime(60_000)

            expect(job).not.toHaveBeenCalled()
            clearInterval(handle)
        })

        it('fires every matching tick over multiple intervals', () => {
            const job = vi.fn()
            // Set 1 minute before 09:30
            vi.setSystemTime(new Date(2025, 0, 1, 9, 29, 0))

            const handle = scheduleCron('*/30 * * * *', job)

            // Tick 1 — fires at 09:30 (matches */30)
            vi.advanceTimersByTime(60_000)
            expect(job).toHaveBeenCalledTimes(1)

            // Set 1 minute before 10:00
            vi.setSystemTime(new Date(2025, 0, 1, 9, 59, 0))
            vi.advanceTimersByTime(60_000) // fires at 10:00 (matches */30)
            expect(job).toHaveBeenCalledTimes(2)

            clearInterval(handle)
        })

        it('returns a clearable interval handle', () => {
            const job = vi.fn()
            vi.setSystemTime(new Date(2025, 0, 1, 23, 59, 0))

            const handle = scheduleCron('0 * * * *', job)
            clearInterval(handle)

            vi.advanceTimersByTime(60_000)
            expect(job).not.toHaveBeenCalled()
        })

        it('supports comma-separated minute list', () => {
            const job = vi.fn()
            // Set 1 minute before 08:15
            vi.setSystemTime(new Date(2025, 0, 1, 8, 14, 0))

            const handle = scheduleCron('15,45 * * * *', job)
            vi.advanceTimersByTime(60_000) // fires at 08:15 → matches

            expect(job).toHaveBeenCalledTimes(1)
            clearInterval(handle)
        })

        it('supports range expressions', () => {
            const job = vi.fn()
            // Set 1 minute before 10:00 (hour 10 is within 9-11)
            vi.setSystemTime(new Date(2025, 0, 1, 9, 59, 0))

            const handle = scheduleCron('0 9-11 * * *', job)
            vi.advanceTimersByTime(60_000) // fires at 10:00 → matches

            expect(job).toHaveBeenCalledTimes(1)
            clearInterval(handle)
        })

        it('supports day-of-week filtering', () => {
            const job = vi.fn()
            // 2025-01-06 is Monday (day 1). Set 1 minute before 09:00
            vi.setSystemTime(new Date(2025, 0, 6, 8, 59, 0))

            const handle = scheduleCron('0 9 * * 1', job) // every Monday at 09:00
            vi.advanceTimersByTime(60_000) // fires at 09:00 on Monday → matches

            expect(job).toHaveBeenCalledTimes(1)
            clearInterval(handle)
        })

        it('does not fire on wrong day-of-week', () => {
            const job = vi.fn()
            // 2025-01-07 is Tuesday (day 2). Set 1 minute before 09:00
            vi.setSystemTime(new Date(2025, 0, 7, 8, 59, 0))

            const handle = scheduleCron('0 9 * * 1', job) // only Monday
            vi.advanceTimersByTime(60_000) // fires at Tuesday 09:00 → no match

            expect(job).not.toHaveBeenCalled()
            clearInterval(handle)
        })
    })
})
