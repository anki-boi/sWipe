import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { BottomNav } from '@/components/common/bottom-nav';
import { PermissionGate } from '@/components/common/permission-gate';
import { usePreferences } from '@/hooks/usePreferences';

export default function TabLayout() {
    const [preferences] = usePreferences();

    // First run: onboarding comes before the permission prompt
    if (!preferences.hasSeenOnboarding) {
        return <Redirect href="/onboarding" />;
    }

    return (
        <PermissionGate>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: 'none' },
                }}
            >
                <Tabs.Screen name="index" />
                <Tabs.Screen name="album/index" />
                <Tabs.Screen name="month/index" />
            </Tabs>
            {/* Custom Bottom Navigation */}
            <BottomNav />
        </PermissionGate>
    );
}
