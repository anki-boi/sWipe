import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    Linking,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';

// Only photos and videos: asking for audio would show an extra, unrelated prompt.
const GRANULAR_PERMISSIONS: MediaLibrary.GranularPermission[] = [
    'photo',
    'video',
];

/**
 * Renders children once media access is granted. Re-checks whenever the app
 * comes back to the foreground, e.g. after the user changed it in Settings.
 */
export const PermissionGate = ({ children }: { children: React.ReactNode }) => {
    const [permission, setPermission] =
        useState<MediaLibrary.PermissionResponse | null>(null);

    const check = useCallback(async () => {
        setPermission(
            await MediaLibrary.getPermissionsAsync(false, GRANULAR_PERMISSIONS)
        );
    }, []);

    const request = useCallback(async () => {
        setPermission(
            await MediaLibrary.requestPermissionsAsync(
                false,
                GRANULAR_PERMISSIONS
            )
        );
    }, []);

    useEffect(() => {
        // Ask straight away on first launch; afterwards just check.
        MediaLibrary.getPermissionsAsync(false, GRANULAR_PERMISSIONS).then(
            (current) =>
                current.status === 'undetermined'
                    ? request()
                    : setPermission(current)
        );
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') check();
        });
        return () => subscription.remove();
    }, [check, request]);

    if (!permission) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#2563eb" />
            </View>
        );
    }

    if (permission.granted) {
        return (
            <View className="flex-1">
                {permission.accessPrivileges === 'limited' && (
                    <TouchableOpacity
                        className="bg-amber-100 px-5 py-3"
                        onPress={request}
                        accessibilityRole="button"
                    >
                        <Text className="text-amber-900">
                            sWipe can only see the photos you selected. Tap to
                            allow access to all photos and videos.
                        </Text>
                    </TouchableOpacity>
                )}
                {children}
            </View>
        );
    }

    return (
        <View className="flex-1 items-center justify-center bg-white px-8 gap-y-4">
            <Text className="text-2xl font-rubik-semibold text-gray-800 text-center">
                Allow access to your photos
            </Text>
            <Text className="text-gray-500 text-center">
                sWipe needs access to your photos and videos so you can review
                them. Nothing leaves your device.
            </Text>
            <TouchableOpacity
                className="bg-blue-600 px-6 py-3 rounded-full"
                onPress={
                    permission.canAskAgain ? request : Linking.openSettings
                }
                accessibilityRole="button"
            >
                <Text className="text-white font-medium">
                    {permission.canAskAgain ? 'Allow access' : 'Open settings'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};
