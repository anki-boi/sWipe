import { View, Text, Pressable } from 'react-native';
import React from 'react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { DailySummary } from '@/common/lib/goals/DailyProgress';
import { useTheme } from '@/hooks/useTheme';
import { CircularProgress } from '@/components/progress-list';

const BAR_HEIGHT = 44;

const weekdayLetter = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        weekday: 'narrow',
    });
};

export const DailyGoalCard = ({
    summary,
}: {
    summary: DailySummary | null;
}) => {
    const { colors } = useTheme();
    if (!summary) return null;

    if (summary.goal <= 0) {
        return (
            <Link href="/settings" asChild>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Set a daily goal"
                    className="mx-5 mt-4 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:bg-surface"
                >
                    <MaterialIcons
                        name="flag"
                        size={22}
                        color={colors.primary}
                    />
                    <Text className="flex-1 font-rubik-medium text-foreground">
                        Set a daily goal
                    </Text>
                    <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={colors.muted}
                    />
                </Pressable>
            </Link>
        );
    }

    const progress = Math.min(summary.today / summary.goal, 1);
    const done = summary.today >= summary.goal;
    const max = Math.max(
        summary.goal,
        ...summary.lastSevenDays.map((d) => d.count)
    );

    return (
        <View className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-4">
                <View className="items-center justify-center">
                    <CircularProgress
                        progress={progress}
                        size={88}
                        strokeWidth={9}
                        color={done ? colors.success : colors.primary}
                        trackColor={colors.border}
                    />
                    <View className="absolute inset-0 items-center justify-center">
                        {done ? (
                            <MaterialIcons
                                name="check"
                                size={30}
                                color={colors.success}
                            />
                        ) : (
                            <Text className="font-rubik-bold text-lg text-foreground">
                                {Math.round(progress * 100)}%
                            </Text>
                        )}
                    </View>
                </View>
                <View className="flex-1">
                    <Text className="font-rubik-semibold text-lg text-foreground">
                        Daily goal
                    </Text>
                    <Text className="font-rubik text-muted">
                        {summary.today} of {summary.goal} reviewed today
                    </Text>
                    <View className="mt-2 flex-row items-center gap-1">
                        <MaterialCommunityIcons
                            name="fire"
                            size={20}
                            color={
                                summary.streak > 0
                                    ? colors.warning
                                    : colors.muted
                            }
                        />
                        <Text className="font-rubik-medium text-foreground">
                            {summary.streak} day streak
                        </Text>
                        <Text className="font-rubik text-sm text-muted">
                            {' '}
                            · best {summary.bestStreak}
                        </Text>
                    </View>
                </View>
            </View>
            <View className="mt-4 flex-row items-end justify-between">
                {summary.lastSevenDays.map((day, index) => {
                    const isToday = index === summary.lastSevenDays.length - 1;
                    const metGoal = day.count >= summary.goal;
                    const height = Math.max(
                        4,
                        Math.round((day.count / max) * BAR_HEIGHT)
                    );
                    return (
                        <View
                            key={day.date}
                            className="flex-1 items-center gap-1"
                            accessibilityLabel={`${day.date}: ${day.count} reviewed`}
                        >
                            <View
                                style={{ height: BAR_HEIGHT }}
                                className="justify-end"
                            >
                                <View
                                    style={{ height, width: 14 }}
                                    className={`rounded-full ${
                                        metGoal
                                            ? 'bg-success'
                                            : day.count > 0
                                              ? 'bg-primary'
                                              : 'bg-border'
                                    } ${isToday ? '' : 'opacity-70'}`}
                                />
                            </View>
                            <Text
                                className={`text-xs ${
                                    isToday
                                        ? 'font-rubik-semibold text-foreground'
                                        : 'font-rubik text-muted'
                                }`}
                            >
                                {weekdayLetter(day.date)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};
