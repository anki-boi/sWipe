import { useEffect, useState } from 'react';
import {
    getCachedPreferences,
    getPreferences,
    Preferences,
    subscribeToPreferences,
    updatePreferences,
} from '@/common/lib/preferences';

export function usePreferences(): [
    Preferences,
    (changes: Partial<Preferences>) => Promise<Preferences>,
] {
    const [preferences, setPreferences] = useState(getCachedPreferences);
    useEffect(() => {
        let active = true;
        getPreferences().then((loaded) => active && setPreferences(loaded));
        const unsubscribe = subscribeToPreferences(setPreferences);
        return () => {
            active = false;
            unsubscribe();
        };
    }, []);
    return [preferences, updatePreferences];
}
