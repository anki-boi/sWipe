import { Stack } from 'expo-router';
import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Header from '@/components/common/Header';
import { flushAllSessions } from '@/common/lib/localstorage/SwipeStore';
import { applyTheme, getPreferences } from '@/common/lib/preferences';
import { useTheme } from '@/hooks/useTheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Rubik-Bold': require('../assets/fonts/Rubik-Bold.ttf'),
        'Rubik-ExtraBold': require('../assets/fonts/Rubik-ExtraBold.ttf'),
        'Rubik-Light': require('../assets/fonts/Rubik-Light.ttf'),
        'Rubik-Medium': require('../assets/fonts/Rubik-Medium.ttf'),
        'Rubik-Regular': require('../assets/fonts/Rubik-Regular.ttf'),
        'Rubik-SemiBold': require('../assets/fonts/Rubik-SemiBold.ttf'),
    });

    const { isDark, colors } = useTheme();
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);

    // Apply the saved theme before the first frame to avoid a flash
    useEffect(() => {
        getPreferences().then((preferences) => {
            applyTheme(preferences.theme);
            setPreferencesLoaded(true);
        });
    }, []);

    const ready = fontsLoaded && preferencesLoaded;

    useEffect(() => {
        if (ready) {
            SplashScreen.hideAsync();
        }
    }, [ready]);

    // Save swipe progress whenever the app is backgrounded, so it survives
    // the process being killed.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'active') {
                flushAllSessions();
            }
        });
        return () => subscription.remove();
    }, []);

    if (!ready) {
        return null;
    }

    return (
        <GestureHandlerRootView
            style={{ flex: 1, backgroundColor: colors.background }}
        >
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Header />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                }}
            />
        </GestureHandlerRootView>
    );
}
