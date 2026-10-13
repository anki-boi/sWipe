import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';
import { bytesToHumanReadable } from '@/util/MediaUtil';
import { getAssetSize } from '@/util/ExpoFileUtil';

const getFileFormat = (filename?: string) => {
    if (!filename) return 'Unknown';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() : 'Unknown';
};

// Soft drop shadow; the colour is black in both themes
export const cardShadow = {
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
};

// Only the top card plays, so at most one video decoder runs at a time.
const VideoPreview = ({ uri }: { uri: string }) => {
    const player = useVideoPlayer(uri, (p) => {
        p.loop = true;
        p.muted = true;
    });
    // Swiper doesn't re-render cards on focus changes, so the preview pauses
    // itself while the viewer or review screen is on top.
    const isFocused = useIsFocused();
    useEffect(() => {
        if (isFocused) player.play();
        else player.pause();
    }, [isFocused, player]);
    return (
        <VideoView
            player={player}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            nativeControls={false}
        />
    );
};

const SwipeCard = React.memo(
    function SwipeCard({
        item,
        index,
        totalCount,
        isActive,
        onOpen,
    }: {
        item: AssetType;
        index: number;
        totalCount: number;
        isActive: boolean;
        onOpen: (item: AssetType) => void;
    }) {
        const fadeAnim = useSharedValue(0);
        const [showMetadata, setShowMetadata] = useState(false);
        const [size, setSize] = useState<number | null>(item.assetSize || null);

        // Sizes are looked up lazily, only when someone asks to see them
        useEffect(() => {
            if (!showMetadata || size !== null) return;
            let cancelled = false;
            getAssetSize(item.uri).then((bytes) => {
                if (!cancelled) setSize(bytes ?? 0);
            });
            return () => {
                cancelled = true;
            };
        }, [showMetadata, size, item.uri]);

        const toggleMetadata = () => {
            const nextValue = !showMetadata;
            setShowMetadata(nextValue);
            fadeAnim.value = withTiming(nextValue ? 1 : 0, { duration: 300 });
        };

        const animatedStyle = useAnimatedStyle(() => ({
            opacity: fadeAnim.value,
        }));

        const isVideo = item.mediaType === 'video';
        const fileFormat = getFileFormat(item.filename || item.uri);
        const resolutionText =
            item.width && item.height
                ? `${item.width} x ${item.height}`
                : 'Unknown';

        return (
            <View className="flex-1 rounded-3xl bg-card" style={cardShadow}>
                <View className="flex-1 overflow-hidden rounded-3xl bg-surface">
                    <Pressable
                        className="flex-1"
                        onPress={() => onOpen(item)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={`Open ${isVideo ? 'video' : 'photo'} full screen`}
                    >
                        {isVideo && isActive ? (
                            <VideoPreview uri={item.uri} />
                        ) : (
                            <Image
                                source={{ uri: item.uri }}
                                recyclingKey={item.uri}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                cachePolicy="memory"
                                accessibilityLabel={item.filename}
                            />
                        )}
                    </Pressable>
                    {isVideo && !isActive && (
                        <View
                            pointerEvents="none"
                            className="absolute inset-0 items-center justify-center"
                        >
                            <MaterialIcons
                                name="play-circle-outline"
                                size={64}
                                color="white"
                            />
                        </View>
                    )}

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '35%',
                        }}
                    />

                    <View className="absolute right-4 top-4 flex-row gap-x-2">
                        <TouchableOpacity
                            onPress={() => onOpen(item)}
                            className="rounded-full bg-black/50 p-2"
                            accessibilityRole="button"
                            accessibilityLabel="View full screen"
                        >
                            <MaterialIcons
                                name="open-in-full"
                                size={22}
                                color="white"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={toggleMetadata}
                            className="rounded-full bg-black/50 p-2"
                            accessibilityRole="button"
                            accessibilityLabel={
                                showMetadata ? 'Hide details' : 'Show details'
                            }
                        >
                            <MaterialIcons
                                name="info"
                                size={22}
                                color="white"
                            />
                        </TouchableOpacity>
                    </View>

                    <Animated.View
                        pointerEvents="none"
                        style={[
                            animatedStyle,
                            {
                                position: 'absolute',
                                top: 64,
                                right: 16,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                padding: 10,
                                borderRadius: 12,
                            },
                        ]}
                    >
                        <Text className="font-rubik text-sm text-white">
                            Resolution: {resolutionText}
                        </Text>
                        <Text className="font-rubik text-sm text-white">
                            Date:{' '}
                            {item.creationTime
                                ? new Date(item.creationTime).toDateString()
                                : 'Unknown'}
                        </Text>
                        <Text className="font-rubik text-sm text-white">
                            Size:{' '}
                            {size === null ? '…' : bytesToHumanReadable(size)}
                        </Text>
                        <Text className="font-rubik text-sm text-white">
                            Format: {fileFormat}
                        </Text>
                    </Animated.View>

                    <View
                        pointerEvents="none"
                        className="absolute bottom-4 left-4 right-4 flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center">
                            <MaterialIcons
                                name="photo-size-select-large"
                                size={18}
                                color="white"
                            />
                            <Text className="ml-1 font-rubik-medium text-sm text-white">
                                {resolutionText}
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <MaterialCommunityIcons
                                name="progress-alert"
                                size={18}
                                color="white"
                            />
                            <Text className="ml-1 font-rubik-bold text-sm text-white">
                                {index + 1}/{totalCount}
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <MaterialIcons
                                name={isVideo ? 'videocam' : 'image'}
                                size={18}
                                color="white"
                            />
                            <Text className="ml-1 font-rubik-medium text-sm text-white">
                                {fileFormat}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    },
    (prevProps, nextProps) =>
        prevProps.item.uri === nextProps.item.uri &&
        prevProps.index === nextProps.index &&
        prevProps.totalCount === nextProps.totalCount &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.onOpen === nextProps.onOpen
);

export default SwipeCard;
