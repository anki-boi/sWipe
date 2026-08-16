import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

/**
 * User settings (persisted via AsyncStorage).
 */

export type SwipeUpActionType = 'off' | 'favorites' | 'custom';

export interface SettingsType {
    /** Play active videos automatically while swiping. Default: true. */
    autoplayVideos: boolean;
    /** Start videos with audio enabled (session default). Default: false (muted). */
    defaultAudioEnabled: boolean;
    /** Action performed when the user swipes a card up. Default: 'off'. */
    swipeUpAction: SwipeUpActionType;
    /** Album name used when swipeUpAction === 'custom'. */
    customFolderName: string;
}

export const DEFAULT_SETTINGS: SettingsType = {
    autoplayVideos: true,
    defaultAudioEnabled: false,
    swipeUpAction: 'off',
    customFolderName: '',
};

const STORAGE_KEYS = {
    autoplayVideos: 'settings.autoplayVideos',
    defaultAudioEnabled: 'settings.defaultAudioEnabled',
    swipeUpAction: 'settings.swipeUpAction',
    customFolderName: 'settings.customFolderName',
} as const;

export async function loadSettings(): Promise<SettingsType> {
    try {
        const [autoplayVideos, defaultAudioEnabled, swipeUpAction, customFolderName] =
            await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.autoplayVideos),
                AsyncStorage.getItem(STORAGE_KEYS.defaultAudioEnabled),
                AsyncStorage.getItem(STORAGE_KEYS.swipeUpAction),
                AsyncStorage.getItem(STORAGE_KEYS.customFolderName),
            ]);
        return {
            autoplayVideos:
                autoplayVideos === null
                    ? DEFAULT_SETTINGS.autoplayVideos
                    : autoplayVideos === 'true',
            defaultAudioEnabled:
                defaultAudioEnabled === null
                    ? DEFAULT_SETTINGS.defaultAudioEnabled
                    : defaultAudioEnabled === 'true',
            swipeUpAction:
                swipeUpAction === 'favorites' || swipeUpAction === 'custom'
                    ? swipeUpAction
                    : DEFAULT_SETTINGS.swipeUpAction,
            customFolderName:
                customFolderName === null
                    ? DEFAULT_SETTINGS.customFolderName
                    : customFolderName,
        };
    } catch (error) {
        console.error('Failed to load settings', error);
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings: SettingsType): Promise<void> {
    try {
        await Promise.all([
            AsyncStorage.setItem(
                STORAGE_KEYS.autoplayVideos,
                String(settings.autoplayVideos)
            ),
            AsyncStorage.setItem(
                STORAGE_KEYS.defaultAudioEnabled,
                String(settings.defaultAudioEnabled)
            ),
            AsyncStorage.setItem(STORAGE_KEYS.swipeUpAction, settings.swipeUpAction),
            AsyncStorage.setItem(STORAGE_KEYS.customFolderName, settings.customFolderName),
        ]);
    } catch (error) {
        console.error('Failed to save settings', error);
    }
}

/**
 * React context so settings are readable from anywhere in the app
 * (swipe deck, cards, settings screen).
 */

interface SettingsContextType {
    settings: SettingsType;
    updateSettings: (patch: Partial<SettingsType>) => void;
    isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
    undefined
);

export function SettingsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const loaded = await loadSettings();
            if (mounted) {
                setSettings(loaded);
                // Session audio default comes from settings (only at app start —
                // later in-session toggles persist via setSessionMuted).
                setSessionMuted(!loaded.defaultAudioEnabled);
                setIsLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const updateSettings = useCallback((patch: Partial<SettingsType>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            saveSettings(next);
            return next;
        });
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings(): SettingsContextType {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

/**
 * Session-persistent audio state.
 *
 * Survives card → card and deck → deck within a single app session, but is
 * intentionally NOT persisted to AsyncStorage (resets on app restart).
 */

let sessionMuted = true;
const sessionMutedListeners = new Set<() => void>();

export function getSessionMuted(): boolean {
    return sessionMuted;
}

export function setSessionMuted(value: boolean): void {
    if (sessionMuted === value) return;
    sessionMuted = value;
    sessionMutedListeners.forEach((listener) => listener());
}

export function useSessionMuted(): [boolean, (value: boolean) => void] {
    const [muted, setMuted] = useState<boolean>(getSessionMuted);

    useEffect(() => {
        const listener = () => setMuted(getSessionMuted());
        sessionMutedListeners.add(listener);
        return () => {
            sessionMutedListeners.delete(listener);
        };
    }, []);

    return [muted, setSessionMuted];
}
