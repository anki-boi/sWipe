import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNav } from '@/components/common/bottom-nav';
import { PermissionGate } from '@/components/common/permission-gate';

export default function TabLayout() {
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
