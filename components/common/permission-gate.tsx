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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

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
    const { colors } = useTheme();
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
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (permission.granted) {
        return (
            <View className="flex-1 bg-background">
                {permission.accessPrivileges === 'limited' && (
                    <TouchableOpacity
                        className="flex-row items-center gap-3 border-b border-warning/40 bg-warning/15 px-5 py-3"
                        onPress={request}
                        accessibilityRole="button"
                    >
                        <MaterialIcons
                            name="info-outline"
                            size={20}
                            color={colors.warning}
                        />
                        <Text className="flex-1 font-rubik text-sm text-foreground">
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
        <View className="flex-1 items-center justify-center bg-background px-8">
            <LinearGradient
                colors={[colors.primary, colors.primaryStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 112, height: 112, borderRadius: 56 }}
                className="items-center justify-center"
            >
                <MaterialIcons
                    name="photo-library"
                    size={52}
                    color={colors.onPrimary}
                />
            </LinearGradient>
            <Text className="mt-8 text-center font-rubik-semibold text-2xl text-foreground">
                Allow access to your photos
            </Text>
            <Text className="mt-3 text-center font-rubik text-base text-muted">
                sWipe needs access to your photos and videos so you can review
                them. Nothing leaves your device.
            </Text>
            <TouchableOpacity
                className="mt-8 rounded-full bg-primary px-8 py-4 active:bg-primary-strong"
                onPress={
                    permission.canAskAgain ? request : Linking.openSettings
                }
                accessibilityRole="button"
            >
                <Text className="font-rubik-medium text-base text-on-primary">
                    {permission.canAskAgain ? 'Allow access' : 'Open settings'}
                </Text>
            </TouchableOpacity>
            {!permission.canAskAgain && (
                <Text className="mt-4 text-center font-rubik text-sm text-muted">
                    Access was turned off. Enable Photos and videos in the app's
                    settings, then come back.
                </Text>
            )}
        </View>
    );
};
