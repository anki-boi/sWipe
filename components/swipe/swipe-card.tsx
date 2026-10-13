import { View, Text, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
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

// Only the top card plays, so at most one video decoder runs at a time.
const VideoPreview = ({ uri }: { uri: string }) => {
    const player = useVideoPlayer(uri, (p) => {
        p.loop = true;
        p.muted = true;
        p.play();
    });
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
    }: {
        item: AssetType;
        index: number;
        totalCount: number;
        isActive: boolean;
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
            <View className="flex-1 flex flex-col p-2">
                <View className="h-2/3 rounded-2xl overflow-hidden relative bg-gray-900">
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
                    {isVideo && !isActive && (
                        <View className="absolute inset-0 items-center justify-center">
                            <MaterialIcons
                                name="play-circle-outline"
                                size={64}
                                color="white"
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={toggleMetadata}
                        className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
                        accessibilityRole="button"
                        accessibilityLabel={
                            showMetadata ? 'Hide details' : 'Show details'
                        }
                    >
                        <MaterialIcons name="info" size={24} color="white" />
                    </TouchableOpacity>

                    <Animated.View
                        pointerEvents="none"
                        style={[
                            animatedStyle,
                            {
                                position: 'absolute',
                                top: 52,
                                right: 30,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                padding: 10,
                                borderRadius: 10,
                            },
                        ]}
                    >
                        <Text className="text-white text-sm">
                            Resolution: {resolutionText}
                        </Text>
                        <Text className="text-white text-sm">
                            Date:{' '}
                            {item.creationTime
                                ? new Date(item.creationTime).toDateString()
                                : 'Unknown'}
                        </Text>
                        <Text className="text-white text-sm">
                            Size:{' '}
                            {size === null ? '…' : bytesToHumanReadable(size)}
                        </Text>
                        <Text className="text-white text-sm">
                            Format: {fileFormat}
                        </Text>
                    </Animated.View>

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '40%',
                        }}
                    />

                    <View
                        pointerEvents="none"
                        className="absolute bottom-4 left-4 right-4 flex flex-row items-center justify-around"
                    >
                        <View className="flex flex-row items-center">
                            <MaterialIcons
                                name="photo-size-select-large"
                                size={20}
                                color="white"
                            />
                            <Text className="text-white text-base font-rubik-bold ml-1">
                                {resolutionText}
                            </Text>
                        </View>
                        <View className="flex flex-row items-center">
                            <MaterialCommunityIcons
                                name="progress-alert"
                                size={20}
                                color="white"
                            />
                            <Text className="text-md font-rubik-bold text-white ml-1">
                                {index + 1}/{totalCount}
                            </Text>
                        </View>
                        <View className="flex flex-row items-center">
                            <MaterialIcons
                                name={isVideo ? 'videocam' : 'image'}
                                size={20}
                                color="white"
                            />
                            <Text className="text-white text-md font-rubik-bold ml-1">
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
        prevProps.isActive === nextProps.isActive
);

export default SwipeCard;
