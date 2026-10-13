import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getAllMetadata } from '@/common/lib/localstorage/SwipeStore';
import SwipeMetadata from '@/common/lib/localstorage/lib/SwipeMetadata';
import { bytesToHumanReadable } from '@/util/MediaUtil';

const MonthList = () => {
    const router = useRouter();
    const [items, setItems] = useState<SwipeMetadata[]>([]);

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
        const isInProgress = item.getProgress() < 1;
        return (
            <TouchableOpacity
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
                className={`p-4 my-2 rounded-2xl flex-row items-center ${
                    isInProgress
                        ? 'bg-blue-600'
                        : 'bg-white border border-blue-300'
                }`}
            >
                <MaterialIcons
                    name={
                        item.type === SwipeScreenKeyType.MONTH
                            ? 'calendar-month'
                            : 'perm-media'
                    }
                    size={28}
                    color={isInProgress ? 'white' : '#2563eb'}
                    style={{ marginRight: 16 }}
                />
                <View className="flex-1">
                    <Text
                        className={`text-lg font-semibold ${isInProgress ? 'text-white' : 'text-blue-600'}`}
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    <Text
                        className={`text-sm ${isInProgress ? 'text-blue-200' : 'text-blue-400'}`}
                    >
                        {item.deleteCount} items deleted
                    </Text>
                    <Text
                        className={`text-xs ${isInProgress ? 'text-blue-100' : 'text-blue-600'}`}
                    >
                        {bytesToHumanReadable(item.deletedMediaSize)} freed
                    </Text>
                </View>
                {isInProgress && (
                    <Text className="px-3 py-1 text-xs font-bold text-blue-600 bg-white rounded-full">
                        {Math.round(item.getProgress() * 100)}%
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <FlatList
            className="mt-3"
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={
                <Text className="text-center text-gray-400 mt-6">
                    Nothing here yet. Start swiping through a month or album!
                </Text>
            }
        />
    );
};

export default MonthList;
