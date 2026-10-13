import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toAssetType } from '@/util/MediaUtil';
import { getScreenTitle, loadScreenMedia } from '@/common/lib/filters';
import SwiperDeck from '@/components/swipe/swiper-deck';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';
import { parseScreenKeyType } from '@/common/lib/localstorage/lib/StorageKeys';

type LoadState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; assets: AssetType[] };

export default function SwipeScreen() {
    const params = useLocalSearchParams<{
        screenKey: string;
        screenKeyType: string;
    }>();
    const screenKey = params.screenKey ?? '';
    const screenKeyType = parseScreenKeyType(params.screenKeyType);
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    // Ignores results from a load that a newer one has superseded
    const loadId = useRef(0);

    const loadAssets = useCallback(async (): Promise<void> => {
        const id = ++loadId.current;
        if (!screenKey || !screenKeyType) {
            setState({ status: 'error' });
            return;
        }
        try {
            const assets = await loadScreenMedia(screenKeyType, screenKey);
            if (id === loadId.current) {
                setState({
                    status: 'ready',
                    assets: assets.map(toAssetType),
                });
            }
        } catch (error) {
            console.error('Error loading assets:', error);
            if (id === loadId.current) {
                setState({ status: 'error' });
            }
        }
    }, [screenKey, screenKeyType]);

    useEffect(() => {
        setState({ status: 'loading' });
        loadAssets();
        return () => {
            // Invalidate the in-flight load; loadId is a counter, not a DOM ref.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            loadId.current++;
        };
    }, [loadAssets]);

    return (
        <View className="flex-1 bg-white p-4">
            <Text
                className="text-2xl font-rubik-semibold text-gray-800 mb-2"
                numberOfLines={1}
            >
                {screenKeyType
                    ? getScreenTitle(screenKeyType, screenKey)
                    : screenKey}
            </Text>
            {state.status === 'loading' && (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            )}
            {state.status === 'error' && (
                <View className="flex-1 items-center justify-center gap-y-4">
                    <Text className="text-gray-500 text-center">
                        Couldn't load the media for {screenKey || 'this view'}.
                    </Text>
                    <TouchableOpacity
                        className="bg-blue-600 px-5 py-3 rounded-full"
                        onPress={() => {
                            setState({ status: 'loading' });
                            loadAssets();
                        }}
                    >
                        <Text className="text-white font-medium">
                            Try again
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
            {state.status === 'ready' && state.assets.length === 0 && (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-500 text-center">
                        Nothing left to review here.
                    </Text>
                </View>
            )}
            {state.status === 'ready' &&
                state.assets.length > 0 &&
                screenKeyType && (
                    <SwiperDeck
                        mediaAssets={state.assets}
                        swipeKey={screenKey}
                        screenKeyType={screenKeyType}
                        reloadAssets={loadAssets}
                    />
                )}
        </View>
    );
}
