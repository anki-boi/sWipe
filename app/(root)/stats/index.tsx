import { View, Text, ScrollView } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Title } from '@/components/common/title';
import { getAllMetadata } from '@/common/lib/localstorage/SwipeStore';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { bytesToHumanReadable } from '@/util/MediaUtil';

interface Totals {
    deleted: number;
    freed: number;
    kept: number;
    monthsStarted: number;
    albumsStarted: number;
}

const StatTile = ({ label, value }: { label: string; value: string }) => (
    <View className="w-[48%] bg-blue-50 rounded-2xl p-4 mb-4">
        <Text className="text-3xl font-rubik-semibold text-blue-700">
            {value}
        </Text>
        <Text className="text-gray-600 mt-1">{label}</Text>
    </View>
);

export default function StatsScreen() {
    const [totals, setTotals] = useState<Totals | null>(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            getAllMetadata().then((metadata) => {
                const all = [...metadata.values()];
                // Deletes are recorded on both the month and the album view, so
                // count them from one side only to avoid double counting.
                const months = all.filter(
                    (m) => m.type === SwipeScreenKeyType.MONTH
                );
                const albums = all.filter(
                    (m) => m.type === SwipeScreenKeyType.ALBUM
                );
                const deleteSource =
                    months.reduce((t, m) => t + m.deleteCount, 0) > 0
                        ? months
                        : albums;
                if (!active) return;
                setTotals({
                    deleted: deleteSource.reduce(
                        (t, m) => t + m.deleteCount,
                        0
                    ),
                    freed: deleteSource.reduce(
                        (t, m) => t + m.deletedMediaSize,
                        0
                    ),
                    kept: all.reduce((t, m) => t + m.keepCount, 0),
                    monthsStarted: months.filter((m) => m.lastAccessed > 0)
                        .length,
                    albumsStarted: albums.filter((m) => m.lastAccessed > 0)
                        .length,
                });
            });
            return () => {
                active = false;
            };
        }, [])
    );

    return (
        <ScrollView className="flex-1 bg-white px-5 pt-6">
            <Title text="Stats" subtitle="Your cleanup so far" />
            {totals && (
                <View className="flex-row flex-wrap justify-between mt-6">
                    <StatTile
                        label="Items deleted"
                        value={String(totals.deleted)}
                    />
                    <StatTile
                        label="Space freed"
                        value={bytesToHumanReadable(totals.freed)}
                    />
                    <StatTile
                        label="Decided to keep"
                        value={String(totals.kept)}
                    />
                    <StatTile
                        label="Months started"
                        value={String(totals.monthsStarted)}
                    />
                    <StatTile
                        label="Albums started"
                        value={String(totals.albumsStarted)}
                    />
                </View>
            )}
        </ScrollView>
    );
}
