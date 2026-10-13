import { View } from 'react-native';
import React from 'react';
import { Banner } from '@/components/home/banner';
import { ProgressList, ProgressListSource } from '@/components/progress-list';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getImageCountByMonthYear } from '@/common/lib/swipeandroid/SwipeAndroidLibary';
import { getMonthNameFromOneBasedIndex } from '@/util/DateUtil';

const loadMonths = async (): Promise<ProgressListSource[]> =>
    (await getImageCountByMonthYear()).map((item) => ({
        name: `${getMonthNameFromOneBasedIndex(item.month)} ${item.year}`,
        count: item.count,
    }));

export default function Index() {
    return (
        <View className="flex-1 bg-white font-rubik">
            <Banner />
            <ProgressList
                title="Months"
                subtitle="Pick up where you left off"
                type={SwipeScreenKeyType.MONTH}
                loadSources={loadMonths}
            />
        </View>
    );
}
