import { View, Text, Pressable, ScrollView } from 'react-native';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SMART_FILTERS } from '@/common/lib/filters';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { useTheme } from '@/hooks/useTheme';

export const SmartFilters = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <View className="mt-6">
            <Text className="px-5 font-rubik-semibold text-xl text-foreground">
                Quick clean-up
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    gap: 12,
                }}
            >
                {SMART_FILTERS.map((filter) => (
                    <Pressable
                        key={filter.id}
                        onPress={() =>
                            router.push({
                                pathname: '/[screenKeyType]/[screenKey]',
                                params: {
                                    screenKeyType: SwipeScreenKeyType.FILTER,
                                    screenKey: filter.id,
                                },
                            })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${filter.title}. ${filter.description}`}
                        className="w-40 rounded-2xl border border-border bg-card p-4 active:bg-surface"
                    >
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <MaterialIcons
                                name={filter.icon}
                                size={22}
                                color={colors.primary}
                            />
                        </View>
                        <Text
                            className="mt-3 font-rubik-semibold text-foreground"
                            numberOfLines={1}
                        >
                            {filter.title}
                        </Text>
                        <Text
                            className="mt-1 font-rubik text-xs text-muted"
                            numberOfLines={2}
                        >
                            {filter.description}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
};
