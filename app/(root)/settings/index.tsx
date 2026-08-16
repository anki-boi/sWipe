import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
    useSettings,
    SwipeUpActionType,
} from '@/common/lib/settings/SettingsStore';

const SWIPE_UP_OPTIONS: {
    value: SwipeUpActionType;
    label: string;
    description: string;
}[] = [
    {
        value: 'off',
        label: 'Off',
        description: 'Swiping up does nothing',
    },
    {
        value: 'favorites',
        label: 'Move to Favorites',
        description: 'Adds the asset to your Favorites album',
    },
    {
        value: 'custom',
        label: 'Move to custom folder',
        description: 'Adds the asset to a folder you name',
    },
];

const SettingsScreen = () => {
    const { settings, updateSettings } = useSettings();

    return (
        <ScrollView className="flex-1 bg-white">
            <View className="p-4">
                {/* General */}
                <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                    General
                </Text>
                <View className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="text-base font-rubik-medium text-gray-800">
                                Autoplay videos
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1">
                                Play videos automatically while swiping
                            </Text>
                        </View>
                        <Switch
                            value={settings.autoplayVideos}
                            onValueChange={(value) =>
                                updateSettings({ autoplayVideos: value })
                            }
                            trackColor={{ false: '#d1d5db', true: '#2563eb' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                    <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <View className="flex-1 pr-4">
                            <Text className="text-base font-rubik-medium text-gray-800">
                                Video audio by default
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1">
                                Start videos with sound on (applies on next app launch)
                            </Text>
                        </View>
                        <Switch
                            value={settings.defaultAudioEnabled}
                            onValueChange={(value) =>
                                updateSettings({ defaultAudioEnabled: value })
                            }
                            trackColor={{ false: '#d1d5db', true: '#2563eb' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                </View>

                {/* Swipe-up action */}
                <Text className="text-lg font-rubik-semibold text-gray-800 mb-2">
                    Swipe-up action
                </Text>
                <View className="bg-gray-50 rounded-2xl p-4 mb-6">
                    {SWIPE_UP_OPTIONS.map((option) => {
                        const selected =
                            settings.swipeUpAction === option.value;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() =>
                                    updateSettings({
                                        swipeUpAction: option.value,
                                    })
                                }
                                className={`flex-row items-center justify-between py-3 ${
                                    selected ? '' : 'opacity-60'
                                }`}
                            >
                                <View className="flex-1 pr-4">
                                    <Text
                                        className={`text-base ${
                                            selected
                                                ? 'text-blue-600 font-rubik-semibold'
                                                : 'text-gray-800 font-rubik-medium'
                                        }`}
                                    >
                                        {option.label}
                                    </Text>
                                    <Text className="text-sm text-gray-500 mt-1">
                                        {option.description}
                                    </Text>
                                </View>
                                {selected && (
                                    <MaterialIcons
                                        name="check-circle"
                                        size={24}
                                        color="#2563eb"
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {settings.swipeUpAction === 'custom' && (
                        <View className="mt-2 pt-3 border-t border-gray-200">
                            <Text className="text-sm text-gray-500 mb-2">
                                Folder name
                            </Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800"
                                placeholder="e.g. Screenshots"
                                placeholderTextColor="#9ca3af"
                                value={settings.customFolderName}
                                onChangeText={(text) =>
                                    updateSettings({ customFolderName: text })
                                }
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

export default SettingsScreen;
