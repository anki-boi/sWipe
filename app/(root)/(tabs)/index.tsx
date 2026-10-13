import { View } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Banner } from '@/components/home/banner';
import { DailyGoalCard } from '@/components/home/daily-goal-card';
import { ContinueCard } from '@/components/home/continue-card';
import { SmartFilters } from '@/components/home/smart-filters';
import { computeTotals, findContinueSession } from '@/components/home/logic';
import { ProgressList, ProgressListSource } from '@/components/progress-list';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getImageCountByMonthYear } from '@/common/lib/swipeandroid/SwipeAndroidLibary';
import { getAllMetadata } from '@/common/lib/localstorage/SwipeStore';
import SwipeMetadata from '@/common/lib/localstorage/lib/SwipeMetadata';
import {
    DailySummary,
    getDailySummary,
} from '@/common/lib/goals/DailyProgress';
import { getPreferences } from '@/common/lib/preferences';
import { getMonthNameFromOneBasedIndex } from '@/util/DateUtil';

const loadMonths = async (): Promise<ProgressListSource[]> =>
    (await getImageCountByMonthYear()).map((item) => ({
        name: `${getMonthNameFromOneBasedIndex(item.month)} ${item.year}`,
        count: item.count,
    }));

export default function Index() {
    const [totals, setTotals] = useState({ freedBytes: 0, deletedCount: 0 });
    const [continueSession, setContinueSession] =
        useState<SwipeMetadata | null>(null);
    const [summary, setSummary] = useState<DailySummary | null>(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const refresh = async () => {
                try {
                    // Per type: the map is keyed by name, so an album named like
                    // a month would otherwise overwrite it.
                    const [byType, preferences] = await Promise.all([
                        Promise.all(
                            Object.values(SwipeScreenKeyType).map((type) =>
                                getAllMetadata(type)
                            )
                        ),
                        getPreferences(),
                    ]);
                    const metadata = byType.flatMap((map) => [...map.values()]);
                    const daily = await getDailySummary(preferences.dailyGoal);
                    if (!active) return;
                    setTotals(computeTotals(metadata));
                    setContinueSession(findContinueSession(metadata));
                    setSummary(daily);
                } catch (error) {
                    console.error('Failed to load home dashboard:', error);
                }
            };
            refresh();
            return () => {
                active = false;
            };
        }, [])
    );

    return (
        <View className="flex-1 bg-background font-rubik">
            <ProgressList
                title="Months"
                subtitle="Pick up where you left off"
                type={SwipeScreenKeyType.MONTH}
                loadSources={loadMonths}
                header={
                    <View>
                        <Banner
                            freedBytes={totals.freedBytes}
                            deletedCount={totals.deletedCount}
                        />
                        <DailyGoalCard summary={summary} />
                        <ContinueCard session={continueSession} />
                        <SmartFilters />
                    </View>
                }
            />
        </View>
    );
}
