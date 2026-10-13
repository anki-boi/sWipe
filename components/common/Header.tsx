import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { router, usePathname } from 'expo-router';

const TAB_ROUTES = ['/', '/album', '/month'];

export default function Header() {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const canGoBack = !TAB_ROUTES.includes(pathname);

    return (
        <View
            className="bg-white flex-row justify-between items-center px-6 pb-2"
            style={{ paddingTop: insets.top + 8 }}
        >
            <View className="w-8">
                {canGoBack && (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        hitSlop={12}
                    >
                        <MaterialIcons
                            name="chevron-left"
                            size={28}
                            color="#1e293b"
                        />
                    </TouchableOpacity>
                )}
            </View>
            <Text className="text-4xl font-rubik-semibold text-blue-600">
                sWipe
            </Text>
            <View className="w-8">
                {pathname !== '/settings' && (
                    <TouchableOpacity
                        onPress={() => router.navigate('/settings')}
                        accessibilityRole="button"
                        accessibilityLabel="Settings"
                        hitSlop={12}
                    >
                        <MaterialIcons
                            name="settings"
                            size={25}
                            color="#1e293b"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
