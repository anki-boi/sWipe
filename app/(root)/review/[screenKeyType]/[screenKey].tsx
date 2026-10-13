import {
    ActivityIndicator,
    FlatList,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { getScreenTitle, loadScreenMedia } from '@/common/lib/filters';
import { toAssetType, bytesToHumanReadable } from '@/util/MediaUtil';
import { getAssetSizes } from '@/util/ExpoFileUtil';
import { parseScreenKeyType } from '@/common/lib/localstorage/lib/StorageKeys';
import { acquireSession } from '@/common/lib/localstorage/SwipeStore';
import SwipeSession from '@/common/lib/localstorage/lib/SwipeSession';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';
import {
    SwipeActionType,
    SwipeScreenKeyType,
} from '@/common/types/SwipeMediaTypes';
import { useDeleteFlow } from '@/components/swipe/useDeleteFlow';
import { successFeedback, tapFeedback, warningFeedback } from '@/util/Haptics';

const COLUMNS = 3;
const GAP = 4;
const PADDING = 16;

type LoadState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; items: AssetType[] };

export default function ReviewScreen() {
    const params = useLocalSearchParams<{
        screenKey: string;
        screenKeyType: string;
    }>();
    const screenKey = params.screenKey ?? '';
    const screenKeyType = parseScreenKeyType(params.screenKeyType);
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [session, setSession] = useState<SwipeSession | null>(null);
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    // Items switched back to Keep from this screen
    const [kept, setKept] = useState<Set<string>>(new Set());
    const [sizes, setSizes] = useState<Map<string, number> | null>(null);
    const [attempt, setAttempt] = useState(0);
    const { deleteAssets, isDeleting } = useDeleteFlow(
        session,
        screenKeyType ?? SwipeScreenKeyType.MONTH
    );

    useEffect(() => {
        if (!screenKey || !screenKeyType) {
            setState({ status: 'error' });
            return;
        }
        let cancelled = false;
        let release: (() => void) | undefined;
        setState({ status: 'loading' });
        (async () => {
            try {
                const acquired = await acquireSession(screenKeyType, screenKey);
                release = acquired.release;
                // The cleanup may have run before release was assigned;
                // release() is idempotent, so calling it here is safe.
                if (cancelled) return acquired.release();
                const marked = new Set(acquired.session.getPendingDeleteUris());
                const assets = await loadScreenMedia(screenKeyType, screenKey);
                if (cancelled) return acquired.release();
                setSession(acquired.session);
                setKept(new Set());
                setState({
                    status: 'ready',
                    items: assets
                        .filter((asset) => marked.has(asset.uri))
                        .map(toAssetType),
                });
            } catch (error) {
                console.error('Failed to load items to review', error);
                if (!cancelled) setState({ status: 'error' });
            }
        })();
        return () => {
            cancelled = true;
            release?.();
        };
    }, [screenKey, screenKeyType, attempt]);

    // Persist toggles when leaving
    useEffect(
        () => () => {
            session?.flush();
        },
        [session]
    );

    const items = state.status === 'ready' ? state.items : null;

    useEffect(() => {
        if (!items) return;
        let cancelled = false;
        getAssetSizes(items.map((item) => item.uri)).then((result) => {
            if (cancelled) return;
            setSizes(
                new Map(items.map((item, i) => [item.uri, result[i] ?? 0]))
            );
        });
        return () => {
            cancelled = true;
        };
    }, [items]);

    const marked = useMemo(
        () => (items ?? []).filter((item) => !kept.has(item.uri)),
        [items, kept]
    );
    const markedSize = useMemo(
        () =>
            sizes
                ? marked.reduce((t, item) => t + (sizes.get(item.uri) ?? 0), 0)
                : null,
        [sizes, marked]
    );

    const toggle = useCallback(
        (uri: string) => {
            if (!session || isDeleting) return;
            tapFeedback();
            const keepIt = !kept.has(uri);
            session.setDecision(
                uri,
                keepIt ? SwipeActionType.KEEP : SwipeActionType.DELETE
            );
            session.scheduleSave();
            setKept((previous) => {
                const next = new Set(previous);
                if (keepIt) next.add(uri);
                else next.delete(uri);
                return next;
            });
        },
        [session, kept, isDeleting]
    );

    const openViewer = useCallback((item: AssetType) => {
        router.push({
            pathname: '/viewer',
            params: { uri: item.uri, mediaType: item.mediaType },
        });
    }, []);

    const handleDelete = async () => {
        warningFeedback();
        const outcome = await deleteAssets(marked);
        if (outcome === 'deleted') {
            successFeedback();
        }
        if (outcome === 'deleted' || outcome === 'gone') {
            router.back();
        }
    };

    const size = Math.floor(
        (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS
    );

    const renderItem = ({ item }: { item: AssetType }) => {
        const isKept = kept.has(item.uri);
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggle(item.uri)}
                onLongPress={() => openViewer(item)}
                style={{ width: size, height: size }}
                className="overflow-hidden rounded-xl bg-surface"
                accessibilityRole="button"
                accessibilityLabel={`${item.filename || 'Item'}, ${
                    isKept ? 'kept' : 'marked for deletion'
                }`}
                accessibilityHint="Tap to toggle, long press to view"
            >
                <Image
                    source={{ uri: item.uri }}
                    recyclingKey={item.uri}
                    style={{
                        width: '100%',
                        height: '100%',
                        opacity: isKept ? 0.35 : 1,
                    }}
                    contentFit="cover"
                    cachePolicy="memory"
                />
                {item.mediaType === 'video' && (
                    <View className="absolute bottom-1 left-1 rounded-full bg-black/60 p-1">
                        <MaterialIcons
                            name="videocam"
                            size={14}
                            color="white"
                        />
                    </View>
                )}
                <View
                    className={`absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full ${
                        isKept ? 'bg-success' : 'bg-danger'
                    }`}
                >
                    <MaterialIcons
                        name={isKept ? 'check' : 'delete'}
                        size={15}
                        color={colors.onPrimary}
                    />
                </View>
            </TouchableOpacity>
        );
    };

    const title = screenKeyType
        ? getScreenTitle(screenKeyType, screenKey)
        : screenKey;
    const nothingToDelete = marked.length === 0;

    return (
        <View className="flex-1 bg-background">
            <View className="px-4 pb-3 pt-1">
                <Text
                    className="font-rubik-semibold text-2xl text-foreground"
                    numberOfLines={1}
                >
                    Review before delete
                </Text>
                <Text
                    className="font-rubik text-sm text-muted"
                    numberOfLines={1}
                >
                    {title}
                    {items
                        ? ` · ${marked.length} marked${
                              markedSize !== null
                                  ? ` · ${bytesToHumanReadable(markedSize)}`
                                  : ''
                          }`
                        : ''}
                </Text>
            </View>

            {state.status === 'loading' && (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}
            {state.status === 'error' && (
                <View className="flex-1 items-center justify-center gap-y-4 px-6">
                    <Text className="text-center font-rubik text-muted">
                        Couldn't load the marked items.
                    </Text>
                    <TouchableOpacity
                        className="rounded-full bg-primary px-5 py-3"
                        onPress={() => setAttempt((n) => n + 1)}
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                    >
                        <Text className="font-rubik-medium text-on-primary">
                            Try again
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
            {items && items.length === 0 && (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-center font-rubik text-muted">
                        Nothing is marked for deletion.
                    </Text>
                </View>
            )}
            {items && items.length > 0 && (
                <>
                    <Text className="px-4 pb-2 font-rubik text-xs text-muted">
                        Tap an item to keep it instead. Long press to view.
                    </Text>
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.uri}
                        numColumns={COLUMNS}
                        renderItem={renderItem}
                        extraData={kept}
                        columnWrapperStyle={{ gap: GAP }}
                        contentContainerStyle={{
                            paddingHorizontal: PADDING,
                            paddingBottom: 16,
                            gap: GAP,
                        }}
                        initialNumToRender={18}
                        windowSize={7}
                    />
                    <View
                        className="border-t border-border bg-background px-4 pt-3"
                        style={{ paddingBottom: insets.bottom + 12 }}
                    >
                        <TouchableOpacity
                            onPress={handleDelete}
                            disabled={nothingToDelete || isDeleting}
                            className={`h-14 flex-row items-center justify-center gap-x-2 rounded-full bg-danger ${
                                nothingToDelete || isDeleting
                                    ? 'opacity-50'
                                    : ''
                            }`}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${marked.length} items`}
                            accessibilityState={{
                                disabled: nothingToDelete || isDeleting,
                            }}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color={colors.onPrimary} />
                            ) : (
                                <>
                                    <MaterialIcons
                                        name="delete"
                                        size={22}
                                        color={colors.onPrimary}
                                    />
                                    <Text className="font-rubik-semibold text-base text-on-primary">
                                        {nothingToDelete
                                            ? 'Nothing to delete'
                                            : `Delete ${marked.length} ${marked.length === 1 ? 'item' : 'items'}`}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}
