import { View, Text, Pressable } from 'react-native';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SwipeMetadata from '@/common/lib/localstorage/lib/SwipeMetadata';
import { getScreenTitle } from '@/common/lib/filters';
import { useTheme } from '@/hooks/useTheme';

export const ContinueCard = ({
    session,
}: {
    session: SwipeMetadata | null;
}) => {
    const router = useRouter();
    const { colors } = useTheme();
    if (!session) return null;

    const title = getScreenTitle(session.type, session.name);
    const percent = Math.round(session.getProgress() * 100);

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: '/[screenKeyType]/[screenKey]',
                    params: {
                        screenKeyType: session.type,
                        screenKey: session.name,
                    },
                })
            }
            accessibilityRole="button"
            accessibilityLabel={`Continue ${title}, ${percent}% reviewed`}
            className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4 active:bg-surface"
        >
            <Text className="font-rubik-medium text-xs uppercase text-muted">
                Continue where you left off
            </Text>
            <View className="mt-1 flex-row items-center gap-3">
                <Text
                    className="flex-1 font-rubik-semibold text-xl text-foreground"
                    numberOfLines={1}
                >
                    {title}
                </Text>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <MaterialIcons
                        name="play-arrow"
                        size={22}
                        color={colors.primary}
                    />
                </View>
            </View>
            <View className="mt-3 flex-row items-center gap-3">
                <View className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                    <View
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percent}%` }}
                    />
                </View>
                <Text className="font-rubik-medium text-sm text-muted">
                    {percent}%
                </Text>
            </View>
        </Pressable>
    );
};
