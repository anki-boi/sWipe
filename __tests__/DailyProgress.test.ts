import { dayKey, summarize } from '@/common/lib/goals/DailyProgress';

const day = (offset: number, now: Date) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return dayKey(d);
};

describe('summarize', () => {
    const now = new Date(2025, 2, 10, 9, 0);

    it('counts a streak ending today', () => {
        const data = {
            [day(-2, now)]: 50,
            [day(-1, now)]: 60,
            [day(0, now)]: 55,
        };
        expect(summarize(data, 50, now).streak).toBe(3);
    });

    it('keeps yesterday’s streak alive before today’s goal is met', () => {
        const data = {
            [day(-2, now)]: 50,
            [day(-1, now)]: 50,
            [day(0, now)]: 10,
        };
        const summary = summarize(data, 50, now);
        expect(summary.streak).toBe(2);
        expect(summary.today).toBe(10);
    });

    it('breaks the streak on a missed day', () => {
        const data = { [day(-3, now)]: 50, [day(-1, now)]: 50 };
        expect(summarize(data, 50, now).streak).toBe(1);
    });

    it('tracks the best streak', () => {
        const data = {
            [day(-10, now)]: 50,
            [day(-9, now)]: 50,
            [day(-8, now)]: 50,
            [day(-1, now)]: 50,
        };
        const summary = summarize(data, 50, now);
        expect(summary.bestStreak).toBe(3);
        expect(summary.streak).toBe(1);
    });

    it('handles month boundaries', () => {
        const march1 = new Date(2025, 2, 1);
        const data = { '2025-02-28': 50, '2025-03-01': 50 };
        expect(summarize(data, 50, march1).streak).toBe(2);
    });

    it('returns the last seven days, oldest first', () => {
        const summary = summarize({ [day(0, now)]: 4 }, 50, now);
        expect(summary.lastSevenDays).toHaveLength(7);
        expect(summary.lastSevenDays[6]).toEqual({
            date: day(0, now),
            count: 4,
        });
    });

    it('has no streak when the goal is off', () => {
        expect(summarize({ [day(0, now)]: 100 }, 0, now).streak).toBe(0);
    });
});
