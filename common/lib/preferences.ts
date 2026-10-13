import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

// Kept outside the swipe:v2 prefix so "Reset progress" doesn't clear them.
const PREFERENCES_KEY = 'swipe:preferences';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Preferences {
    theme: ThemePreference;
    hasSeenOnboarding: boolean;
    hapticsEnabled: boolean;
    // Items to review per day; 0 turns the goal off
    dailyGoal: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
    theme: 'system',
    hasSeenOnboarding: false,
    hapticsEnabled: true,
    dailyGoal: 50,
};

let cached: Preferences | null = null;
const listeners = new Set<(preferences: Preferences) => void>();

export async function getPreferences(): Promise<Preferences> {
    if (cached) return cached;
    try {
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
        cached = {
            ...DEFAULT_PREFERENCES,
            ...(stored ? JSON.parse(stored) : {}),
        };
    } catch (error) {
        console.error('Failed to load preferences:', error);
        cached = { ...DEFAULT_PREFERENCES };
    }
    return cached!;
}

// Last loaded value, for synchronous reads (e.g. haptics on every swipe)
export const getCachedPreferences = (): Preferences =>
    cached ?? DEFAULT_PREFERENCES;

export async function updatePreferences(
    changes: Partial<Preferences>
): Promise<Preferences> {
    const next = { ...(await getPreferences()), ...changes };
    cached = next;
    if (changes.theme) applyTheme(changes.theme);
    listeners.forEach((listener) => listener(next));
    try {
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    } catch (error) {
        console.error('Failed to save preferences:', error);
    }
    return next;
}

export function subscribeToPreferences(
    listener: (preferences: Preferences) => void
): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function applyTheme(theme: ThemePreference) {
    try {
        colorScheme.set(theme);
    } catch (error) {
        console.error('Failed to apply theme:', error);
    }
}
