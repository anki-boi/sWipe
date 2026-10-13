import { View } from 'react-native';
import React from 'react';
import { ProgressList, ProgressListSource } from '@/components/progress-list';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getImageCountByAlbumName } from '@/common/lib/swipeandroid/SwipeAndroidLibary';

const loadAlbums = async (): Promise<ProgressListSource[]> =>
    (await getImageCountByAlbumName())
        .map((item) => ({ name: item.album, count: item.count }))
        .sort((a, b) => b.count - a.count);

export default function AlbumScreen() {
    return (
        <View className="flex-1 bg-white">
            <ProgressList
                title="Albums"
                subtitle="Clean up one album at a time"
                type={SwipeScreenKeyType.ALBUM}
                loadSources={loadAlbums}
            />
        </View>
    );
}
