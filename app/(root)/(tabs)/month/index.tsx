import { View } from 'react-native';
import React from 'react';
import MonthList from '@/components/month-list';

export default function TimelineScreen() {
    return (
        <View className="flex-1 bg-background">
            <MonthList />
        </View>
    );
}
