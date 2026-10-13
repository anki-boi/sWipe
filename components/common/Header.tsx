import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { router, usePathname } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

const TAB_ROUTES = ['/', '/album', '/month'];
// Full-bleed screens that draw their own chrome
const HIDDEN_ON = ['/onboarding', '/viewer'];

export default function Header() {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    if (HIDDEN_ON.includes(pathname)) {
        return null;
    }

    const canGoBack = !TAB_ROUTES.includes(pathname);

    return (
        <View
            className="bg-background flex-row justify-between items-center px-5 pb-2"
            style={{ paddingTop: insets.top + 8 }}
        >
            <View className="w-10">
                {canGoBack && (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        hitSlop={12}
                        className="h-10 w-10 rounded-full bg-surface items-center justify-center"
                    >
                        <MaterialIcons
                            name="chevron-left"
                            size={26}
                            color={colors.foreground}
                        />
                    </TouchableOpacity>
                )}
            </View>
            <Text className="text-3xl font-rubik-bold text-primary">sWipe</Text>
            <View className="w-10 items-end">
                {pathname !== '/settings' && (
                    <TouchableOpacity
                        onPress={() => router.navigate('/settings')}
                        accessibilityRole="button"
                        accessibilityLabel="Settings"
                        hitSlop={12}
                        className="h-10 w-10 rounded-full bg-surface items-center justify-center"
                    >
                        <MaterialIcons
                            name="settings"
                            size={22}
                            color={colors.foreground}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
