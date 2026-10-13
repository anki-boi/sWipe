import { Text, View } from 'react-native';
import React from 'react';

export const Title = ({
    text,
    subtitle,
}: {
    text: string;
    subtitle?: string;
}) => (
    <View className="flex flex-col gap-1">
        <Text className="text-3xl font-rubik-semibold text-foreground">
            {text}
        </Text>
        {subtitle && (
            <Text className="text-base text-muted font-rubik">{subtitle}</Text>
        )}
    </View>
);
