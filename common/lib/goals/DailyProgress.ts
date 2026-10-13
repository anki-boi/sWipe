import AsyncStorage from '@react-native-async-storage/async-storage';

// Under the swipe:v2 prefix so "Reset progress" clears it with everything else.
const DAILY_PROGRESS_KEY = 'swipe:v2:daily';
// Enough for long streaks without growing forever
const MAX_DAYS_KEPT = 400;

// Items reviewed per local calendar day, keyed "YYYY-MM-DD"
type DailyCounts = Record<string, number>;

export interface DailySummary {
    today: number;
    goal: number;
    // Consecutive days the goal was met, ending today (or yesterday if today
    // isn't done yet, so the streak doesn't look broken in the morning)
    streak: number;
    bestStreak: number;
    // Oldest first, ending today
    lastSevenDays: { date: string; count: number }[];
}

export const dayKey = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const addDays = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

// Memoised so concurrent first callers share one object and no increment
// lands on a copy that is then thrown away.
let counts: Promise<DailyCounts> | null = null;
let saveChain: Promise<void> = Promise.resolve();

function load(): Promise<DailyCounts> {
    if (!counts) {
        counts = AsyncStorage.getItem(DAILY_PROGRESS_KEY)
            .then((stored) => (stored ? JSON.parse(stored) : {}))
            .catch((error) => {
                console.error('Failed to load daily progress:', error);
                return {};
            });
    }
    return counts;
}

function save(data: DailyCounts) {
    const keys = Object.keys(data).sort();
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_DAYS_KEPT))) {
        delete data[key];
    }
    const value = JSON.stringify(data);
    saveChain = saveChain
        .then(() => AsyncStorage.setItem(DAILY_PROGRESS_KEY, value))
        .catch((error) =>
            console.error('Failed to save daily progress:', error)
        );
    return saveChain;
}

/** Adds (or, for an undo, subtracts) reviewed items to today's count. */
export async function recordReviewed(
    delta: number = 1,
    now: Date = new Date()
): Promise<void> {
    const data = await load();
    const key = dayKey(now);
    data[key] = Math.max(0, (data[key] ?? 0) + delta);
    await save(data);
}

export function summarize(
    data: DailyCounts,
    goal: number,
    now: Date = new Date()
): DailySummary {
    const met = (date: Date) => goal > 0 && (data[dayKey(date)] ?? 0) >= goal;

    let streak = 0;
    let cursor = met(now) ? now : addDays(now, -1);
    while (met(cursor)) {
        streak++;
        cursor = addDays(cursor, -1);
    }

    let bestStreak = 0;
    let run = 0;
    let previous: Date | null = null;
    for (const key of Object.keys(data).sort()) {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        if (goal > 0 && data[key] >= goal) {
            run =
                previous && dayKey(addDays(previous, 1)) === key ? run + 1 : 1;
            previous = date;
            bestStreak = Math.max(bestStreak, run);
        }
    }

    return {
        today: data[dayKey(now)] ?? 0,
        goal,
        streak,
        bestStreak: Math.max(bestStreak, streak),
        lastSevenDays: Array.from({ length: 7 }, (_, i) => {
            const date = addDays(now, i - 6);
            return { date: dayKey(date), count: data[dayKey(date)] ?? 0 };
        }),
    };
}

export async function getDailySummary(goal: number): Promise<DailySummary> {
    return summarize(await load(), goal);
}

// For "Reset progress": the stored key is removed by the store; drop the cache.
export function clearDailyProgressCache() {
    counts = null;
}
