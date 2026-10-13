import {
    View,
    FlatList,
    Text,
    TouchableNativeFeedback,
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

export interface ProgressListSource {
    name: string;
    count: number;
}

interface ProgressListItem extends ProgressListSource {
    progress: number;
    lastOpened: string;
}

const CircularProgress = ({
    progress,
    size,
    strokeWidth,
}: {
    progress: number;
    size: number;
    strokeWidth: number;
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
                stroke="#1D4ED84D"
                strokeWidth={strokeWidth}
                fill="none"
            />
            <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#2563eb"
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
}: {
    title: string;
    subtitle: string;
    type: SwipeScreenKeyType;
    loadSources: () => Promise<ProgressListSource[]>;
}) => {
    const router = useRouter();
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

    const renderItem = ({ item }: { item: ProgressListItem }) => (
        <TouchableNativeFeedback
            onPress={() =>
                router.push({
                    pathname: '/[screenKeyType]/[screenKey]',
                    params: { screenKeyType: type, screenKey: item.name },
                })
            }
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.count} items, ${Math.round(item.progress * 100)}% reviewed`}
        >
            <View className="flex-row justify-between items-center p-3 border-b border-gray-200">
                <View className="flex flex-row gap-4 items-center flex-1">
                    <View className="relative">
                        <CircularProgress
                            progress={item.progress}
                            size={56}
                            strokeWidth={6}
                        />
                        <View className="absolute inset-0 flex justify-center items-center">
                            <MaterialIcons
                                name={
                                    type === SwipeScreenKeyType.MONTH
                                        ? 'calendar-month'
                                        : 'perm-media'
                                }
                                size={24}
                                color="#2563eb"
                            />
                        </View>
                    </View>
                    <View className="flex flex-col flex-1">
                        <Text
                            className="font-rubik-medium text-gray-800 text-xl"
                            numberOfLines={1}
                        >
                            {item.name}
                        </Text>
                        <Text className="text-base text-gray-400">
                            {item.count} items · {item.lastOpened}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableNativeFeedback>
    );

    return (
        <View className="flex-1 px-5 mt-8">
            <View className="flex flex-row justify-between border-b-2 border-gray-200 border-dashed pb-1">
                <Title text={title} subtitle={subtitle} />
            </View>
            {items === null ? (
                <ActivityIndicator className="mt-6" color="#2563eb" />
            ) : (
                <FlatList
                    className="mt-3"
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.name}
                    // Leave room for the floating bottom navigation
                    contentContainerStyle={{ paddingBottom: 120 }}
                    ListEmptyComponent={
                        <Text className="text-center text-gray-400 mt-6">
                            No photos or videos found.
                        </Text>
                    }
                />
            )}
        </View>
    );
};
