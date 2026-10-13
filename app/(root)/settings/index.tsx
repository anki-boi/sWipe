import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import React from 'react';
import Constants from 'expo-constants';
import { Title } from '@/components/common/title';
import { clearAllProgress } from '@/common/lib/localstorage/SwipeStore';

const SOURCE_URL = 'https://github.com/madhavpcm/sWipe';

const Row = ({
    title,
    subtitle,
    onPress,
    destructive,
}: {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    destructive?: boolean;
}) => (
    <TouchableOpacity
        className="py-4 border-b border-gray-200"
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
    >
        <Text
            className={`text-lg ${destructive ? 'text-red-600' : 'text-gray-800'}`}
        >
            {title}
        </Text>
        {subtitle && <Text className="text-gray-500">{subtitle}</Text>}
    </TouchableOpacity>
);

export default function SettingsScreen() {
    const resetProgress = () =>
        Alert.alert(
            'Reset progress?',
            'This forgets every swipe and all cleanup stats. Your photos and videos are not affected.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllProgress();
                        Alert.alert('Done', 'Your progress has been reset.');
                    },
                },
            ]
        );

    return (
        <View className="flex-1 bg-white px-5 pt-6">
            <Title text="Settings" />
            <View className="mt-4">
                <Row
                    title="Reset progress"
                    subtitle="Forget all swipes and stats"
                    onPress={resetProgress}
                    destructive
                />
                <Row
                    title="Source code"
                    subtitle={SOURCE_URL}
                    onPress={() => Linking.openURL(SOURCE_URL)}
                />
                <Row
                    title="Version"
                    subtitle={Constants.expoConfig?.version ?? 'unknown'}
                />
            </View>
        </View>
    );
}
