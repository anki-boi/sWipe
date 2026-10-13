import { View, Text, TouchableOpacity } from 'react-native';
import React, { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { getMediaSizeByCategory } from '@/common/lib/swipeandroid/SwipeAndroidLibary';
import { bytesToHumanReadable } from '@/util/MediaUtil';
import { useTheme } from '@/hooks/useTheme';
import { CircularProgress } from '@/components/progress-list';

const Stat = ({ value, label }: { value: string; label: string }) => (
    <View className="flex-1">
        <Text
            className="text-on-primary text-2xl font-rubik-bold"
            numberOfLines={1}
            adjustsFontSizeToFit
        >
            {value}
        </Text>
        <Text className="text-on-primary/80 text-sm font-rubik">{label}</Text>
    </View>
);

export const Banner = ({
    freedBytes,
    deletedCount,
}: {
    freedBytes: number;
    deletedCount: number;
}) => {
    const router = useRouter();
    const { colors } = useTheme();
    const [percentage, setPercentage] = useState<number>(0);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const fetchData = async () => {
                try {
                    const totalStorageUsedByCategory =
                        await getMediaSizeByCategory();
                    const totalStorageUsed =
                        totalStorageUsedByCategory.images +
                        totalStorageUsedByCategory.videos +
                        totalStorageUsedByCategory.audio +
                        totalStorageUsedByCategory.gifs;
                    const totalDeviceStorage =
                        await FileSystem.getTotalDiskCapacityAsync();
                    if (active && totalDeviceStorage > 0) {
                        setPercentage(
                            (totalStorageUsed / totalDeviceStorage) * 100
                        );
                    }
                } catch (error) {
                    console.error('Failed to load storage usage:', error);
                }
            };
            fetchData();
            return () => {
                active = false;
            };
        }, [])
    );

    const rounded = Number(percentage.toFixed(1));

    return (
        <LinearGradient
            colors={[colors.primary, colors.primaryStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24 }}
            className="mx-5 mt-2 overflow-hidden p-5"
        >
            <View className="flex-row items-center gap-5">
                <View className="items-center justify-center">
                    <CircularProgress
                        progress={percentage / 100}
                        size={92}
                        strokeWidth={9}
                        color={colors.onPrimary}
                        trackColor={colors.primaryStrong}
                    />
                    <View className="absolute inset-0 items-center justify-center">
                        <Text className="text-on-primary font-rubik-bold text-lg">
                            {rounded}%
                        </Text>
                    </View>
                </View>
                <View className="flex-1 gap-4">
                    <Stat
                        value={bytesToHumanReadable(freedBytes)}
                        label="space freed"
                    />
                    <Stat
                        value={deletedCount.toLocaleString()}
                        label="items deleted"
                    />
                </View>
            </View>
            <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-on-primary/80 text-sm font-rubik flex-1 pr-3">
                    {rounded}% of storage used by photos & videos
                </Text>
                <TouchableOpacity
                    className="flex-row items-center rounded-full bg-on-primary/20 py-2 pl-4 pr-2"
                    onPress={() => router.push('/stats')}
                    accessibilityRole="button"
                    accessibilityLabel="View stats"
                >
                    <Text className="text-on-primary font-rubik-medium">
                        View stats
                    </Text>
                    <MaterialIcons
                        name="chevron-right"
                        color={colors.onPrimary}
                        size={20}
                    />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};
