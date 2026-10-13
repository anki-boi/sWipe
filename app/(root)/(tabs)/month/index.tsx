import { View } from 'react-native';
import React from 'react';
import { Title } from '@/components/common/title';
import MonthList from '@/components/month-list';

export default function TimelineScreen() {
    return (
        <View className="flex-1 bg-white px-5 mt-8">
            <Title text="Timeline" subtitle="Your cleanup history" />
            <MonthList />
        </View>
    );
}
