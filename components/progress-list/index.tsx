import {
    View,
    FlatList,
    Text,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import React, { useCallback, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { Title } from '../common/title';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getAllMetadata } from '@/common/lib/localstorage/SwipeStore';
import { convertDateToRelativeTimeString } from '@/util/DateUtil';
import { useTheme } from '@/hooks/useTheme';

export interface ProgressListSource {
    name: string;
    count: number;
}

interface ProgressListItem extends ProgressListSource {
    progress: number;
    lastOpened: string;
}

export const CircularProgress = ({
    progress,
    size,
    strokeWidth,
    color,
    trackColor,
}: {
    progress: number;
    size: number;
    strokeWidth: number;
    color: string;
    trackColor: string;
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
        circumference * (1 - Math.max(0, Math.min(progress, 1)));

    return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={trackColor}
                strokeWidth={strokeWidth}
                fill="none"
            />
            <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                fill="none"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </Svg>
    );
};

export const ProgressList = ({
    title,
    subtitle,
    type,
    loadSources,
    header,
}: {
    title: string;
    subtitle: string;
    type: SwipeScreenKeyType;
    loadSources: () => Promise<ProgressListSource[]>;
    // Content scrolled above the list title, e.g. the Home dashboard
    header?: React.ReactElement;
}) => {
    const router = useRouter();
    const { colors } = useTheme();
    const [items, setItems] = useState<ProgressListItem[] | null>(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const fetchData = async () => {
                try {
                    const [sources, metadata] = await Promise.all([
                        loadSources(),
                        getAllMetadata(type),
                    ]);
                    const result = sources.map((source) => {
                        const saved = metadata.get(source.name);
                        return {
                            ...source,
                            progress: saved?.getProgress() ?? 0,
                            lastOpened: convertDateToRelativeTimeString(
                                saved?.lastAccessed
                                    ? new Date(saved.lastAccessed)
                                    : null
                            ),
                        };
                    });
                    if (active) setItems(result);
                } catch (error) {
                    console.error('Failed to load list', title, error);
                    if (active) setItems([]);
                }
            };
            fetchData();
            return () => {
                active = false;
            };
        }, [loadSources, type, title])
    );

    const renderItem = ({ item }: { item: ProgressListItem }) => {
        const percent = Math.round(item.progress * 100);
        return (
            <Pressable
                onPress={() =>
                    router.push({
                        pathname: '/[screenKeyType]/[screenKey]',
                        params: { screenKeyType: type, screenKey: item.name },
                    })
                }
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.count} items, ${percent}% reviewed`}
                className="flex-row items-center gap-4 py-3 px-5 active:bg-surface"
            >
                <View className="relative">
                    <CircularProgress
                        progress={item.progress}
                        size={52}
                        strokeWidth={5}
                        trackColor={colors.border}
                        color={
                            item.progress >= 1 ? colors.success : colors.primary
                        }
                    />
                    <View className="absolute inset-0 items-center justify-center">
                        {item.progress >= 1 ? (
                            <MaterialIcons
                                name="check"
                                size={22}
                                color={colors.success}
                            />
                        ) : (
                            <MaterialIcons
                                name={
                                    type === SwipeScreenKeyType.MONTH
                                        ? 'calendar-month'
                                        : 'perm-media'
                                }
                                size={22}
                                color={colors.primary}
                            />
                        )}
                    </View>
                </View>
                <View className="flex-1">
                    <Text
                        className="font-rubik-medium text-foreground text-lg"
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    <Text className="font-rubik text-sm text-muted">
                        {item.count} items ·{' '}
                        {percent > 0 ? `${percent}% · ` : ''}
                        {item.lastOpened === 'Never'
                            ? 'Not started'
                            : `Opened ${item.lastOpened.toLowerCase()}`}
                    </Text>
                </View>
                <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={colors.muted}
                />
            </Pressable>
        );
    };

    return (
        <FlatList
            className="flex-1 bg-background"
            data={items ?? []}
            renderItem={renderItem}
            keyExtractor={(item) => item.name}
            // Leave room for the floating bottom navigation
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={
                <View>
                    {header}
                    <View className="px-5 pt-6 pb-2">
                        <Title text={title} subtitle={subtitle} />
                    </View>
                </View>
            }
            ListEmptyComponent={
                items === null ? (
                    <ActivityIndicator
                        style={{ marginTop: 24 }}
                        color={colors.primary}
                    />
                ) : (
                    <Text className="text-center text-muted mt-6 font-rubik">
                        No photos or videos found.
                    </Text>
                )
            }
        />
    );
};
