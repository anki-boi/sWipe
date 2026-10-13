import { View, Text, ScrollView } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Title } from '@/components/common/title';
import { getAllMetadata } from '@/common/lib/localstorage/SwipeStore';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { bytesToHumanReadable } from '@/util/MediaUtil';
import {
    DailySummary,
    getDailySummary,
} from '@/common/lib/goals/DailyProgress';
import { getPreferences } from '@/common/lib/preferences';
import { useTheme } from '@/hooks/useTheme';

interface Totals {
    deleted: number;
    freed: number;
    kept: number;
    skipped: number;
    started: number;
    finished: number;
}

const StatTile = ({
    icon,
    label,
    value,
}: {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
}) => {
    const { colors } = useTheme();
    return (
        <View className="w-[48%] bg-card border border-border rounded-2xl p-4 mb-4 gap-2">
            <MaterialIcons name={icon} size={22} color={colors.primary} />
            <Text className="text-2xl font-rubik-semibold text-foreground">
                {value}
            </Text>
            <Text className="text-sm font-rubik text-muted">{label}</Text>
        </View>
    );
};

export default function StatsScreen() {
    const { colors } = useTheme();
    const [totals, setTotals] = useState<Totals | null>(null);
    const [daily, setDaily] = useState<DailySummary | null>(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                const [metadata, preferences] = await Promise.all([
                    getAllMetadata(),
                    getPreferences(),
                ]);
                const summary = await getDailySummary(preferences.dailyGoal);
                const all = [...metadata.values()];
                // Every delete is credited to its month (album and filter
                // deletes included), so months alone give the true total.
                const months = all.filter(
                    (m) => m.type === SwipeScreenKeyType.MONTH
                );
                // Albums and filters overlap months, so count decisions on
                // months plus anything the month views haven't seen.
                const sum = (key: 'keepCount' | 'skipCount') =>
                    Math.max(
                        months.reduce((t, m) => t + m[key], 0),
                        all
                            .filter((m) => m.type !== SwipeScreenKeyType.MONTH)
                            .reduce((t, m) => t + m[key], 0)
                    );
                if (!active) return;
                setDaily(summary);
                setTotals({
                    deleted: months.reduce((t, m) => t + m.deleteCount, 0),
                    freed: months.reduce((t, m) => t + m.deletedMediaSize, 0),
                    kept: sum('keepCount'),
                    skipped: sum('skipCount'),
                    started: all.filter((m) => m.lastAccessed > 0).length,
                    finished: all.filter(
                        (m) => m.lastAccessed > 0 && m.getProgress() >= 1
                    ).length,
                });
            })();
            return () => {
                active = false;
            };
        }, [])
    );

    const maxDay = Math.max(
        1,
        ...(daily?.lastSevenDays.map((d) => d.count) ?? [])
    );

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        >
            <Title text="Stats" subtitle="Your cleanup so far" />
            {totals && (
                <View className="flex-row flex-wrap justify-between mt-6">
                    <StatTile
                        icon="delete-sweep"
                        label="Items deleted"
                        value={String(totals.deleted)}
                    />
                    <StatTile
                        icon="sd-storage"
                        label="Space freed"
                        value={bytesToHumanReadable(totals.freed)}
                    />
                    <StatTile
                        icon="favorite"
                        label="Kept"
                        value={String(totals.kept)}
                    />
                    <StatTile
                        icon="skip-next"
                        label="Skipped"
                        value={String(totals.skipped)}
                    />
                    <StatTile
                        icon="local-fire-department"
                        label="Current streak"
                        value={`${daily?.streak ?? 0} days`}
                    />
                    <StatTile
                        icon="emoji-events"
                        label="Best streak"
                        value={`${daily?.bestStreak ?? 0} days`}
                    />
                    <StatTile
                        icon="play-circle-outline"
                        label="Decks started"
                        value={String(totals.started)}
                    />
                    <StatTile
                        icon="task-alt"
                        label="Decks finished"
                        value={String(totals.finished)}
                    />
                </View>
            )}
            {daily && (
                <View className="bg-card border border-border rounded-2xl p-4">
                    <Text className="text-base font-rubik-medium text-foreground mb-4">
                        Reviewed in the last 7 days
                    </Text>
                    <View className="flex-row items-end justify-between h-28">
                        {daily.lastSevenDays.map((day) => {
                            const [y, m, d] = day.date.split('-').map(Number);
                            const label = new Date(
                                y,
                                m - 1,
                                d
                            ).toLocaleDateString(undefined, {
                                weekday: 'narrow',
                            });
                            const metGoal =
                                daily.goal > 0 && day.count >= daily.goal;
                            return (
                                <View
                                    key={day.date}
                                    className="items-center flex-1 gap-1"
                                >
                                    <Text className="text-xs font-rubik text-muted">
                                        {day.count || ''}
                                    </Text>
                                    <View
                                        style={{
                                            height: Math.max(
                                                4,
                                                (day.count / maxDay) * 72
                                            ),
                                            backgroundColor: metGoal
                                                ? colors.success
                                                : colors.primary,
                                        }}
                                        className="w-5 rounded-md"
                                    />
                                    <Text className="text-xs font-rubik text-muted">
                                        {label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}
