import { View, Text, FlatList, Pressable } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getAllMetadata } from '@/common/lib/localstorage/SwipeStore';
import SwipeMetadata from '@/common/lib/localstorage/lib/SwipeMetadata';
import { getScreenTitle, getSmartFilter } from '@/common/lib/filters';
import { bytesToHumanReadable } from '@/util/MediaUtil';
import { convertDateToRelativeTimeString } from '@/util/DateUtil';
import { Title } from '../common/title';
import { useTheme } from '@/hooks/useTheme';

const iconFor = (item: SwipeMetadata) => {
    switch (item.type) {
        case SwipeScreenKeyType.MONTH:
            return 'calendar-month';
        case SwipeScreenKeyType.ALBUM:
            return 'perm-media';
        default:
            return getSmartFilter(item.name)?.icon ?? 'filter-list';
    }
};

const MonthList = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const [items, setItems] = useState<SwipeMetadata[] | null>(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            getAllMetadata().then((metadata) => {
                const history = [...metadata.values()]
                    .filter(
                        (item) => item.lastAccessed > 0 || item.deleteCount > 0
                    )
                    .sort((a, b) => b.lastAccessed - a.lastAccessed);
                if (active) setItems(history);
            });
            return () => {
                active = false;
            };
        }, [])
    );

    const renderItem = ({ item }: { item: SwipeMetadata }) => {
        const progress = item.getProgress();
        const done = progress >= 1;
        return (
            <Pressable
                onPress={() =>
                    router.push({
                        pathname: '/[screenKeyType]/[screenKey]',
                        params: {
                            screenKeyType: item.type,
                            screenKey: item.name,
                        },
                    })
                }
                accessibilityRole="button"
                className="mx-5 my-1.5 p-4 rounded-2xl bg-card border border-border flex-row items-center gap-4 active:opacity-80"
            >
                <View
                    className={`h-12 w-12 rounded-xl items-center justify-center ${done ? 'bg-success/15' : 'bg-primary/10'}`}
                >
                    <MaterialIcons
                        name={done ? 'check' : iconFor(item)}
                        size={24}
                        color={done ? colors.success : colors.primary}
                    />
                </View>
                <View className="flex-1 gap-0.5">
                    <Text
                        className="text-lg font-rubik-medium text-foreground"
                        numberOfLines={1}
                    >
                        {getScreenTitle(item.type, item.name)}
                    </Text>
                    <Text className="text-sm font-rubik text-muted">
                        {item.deleteCount} deleted ·{' '}
                        {bytesToHumanReadable(item.deletedMediaSize)} freed
                    </Text>
                    {item.lastAccessed > 0 && (
                        <Text className="text-xs font-rubik text-muted">
                            {convertDateToRelativeTimeString(
                                new Date(item.lastAccessed)
                            )}
                        </Text>
                    )}
                </View>
                {!done && progress > 0 && (
                    <Text className="px-3 py-1 text-xs font-rubik-semibold text-primary bg-primary/10 rounded-full">
                        {Math.round(progress * 100)}%
                    </Text>
                )}
            </Pressable>
        );
    };

    return (
        <FlatList
            data={items ?? []}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={
                <View className="px-5 pt-6 pb-3">
                    <Title text="Timeline" subtitle="Your cleanup history" />
                </View>
            }
            ListEmptyComponent={
                items === null ? null : (
                    <View className="items-center mt-12 px-8 gap-3">
                        <MaterialIcons
                            name="history"
                            size={48}
                            color={colors.muted}
                        />
                        <Text className="text-center text-muted font-rubik">
                            Nothing here yet. Start swiping through a month,
                            album or smart filter!
                        </Text>
                    </View>
                )
            }
        />
    );
};

export default MonthList;
