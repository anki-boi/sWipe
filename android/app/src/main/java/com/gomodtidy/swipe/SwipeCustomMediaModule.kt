package com.gomodtidy.swipe

import android.app.Activity
import android.app.RecoverableSecurityException
import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import com.facebook.react.bridge.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SwipeCustomMediaModule(reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext), ActivityEventListener {
    // Class variables to track requests and promises
    private var pendingDeletePromise: Promise? = null
    private val DELETE_REQUEST_CODE = 1001
    private val TAG = "SwipeCustomMediaModule"

    init {
        // Register as an activity event listener
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String {
        return "SwipeCustomMediaModule"
    }

    /**
     * Iterates over all images and videos in MediaStore, invoking [block] for each row.
     * On API 29+ a single MediaStore.Files query is used; on older APIs the Images and Video
     * tables are queried separately.
     */
    private fun forEachImageOrVideo(columns: Array<String>, block: (Cursor) -> Unit) {
        val contentResolver = reactApplicationContext.contentResolver
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val selection =
                    "${MediaStore.Files.FileColumns.MEDIA_TYPE} IN (" +
                            "${MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE}," +
                            "${MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO})"
            contentResolver.query(
                            MediaStore.Files.getContentUri("external"),
                            columns,
                            selection,
                            null,
                            null
                    )
                    ?.use { cursor ->
                        if (cursor.moveToFirst()) {
                            do {
                                block(cursor)
                            } while (cursor.moveToNext())
                        }
                    }
        } else {
            val uris =
                    listOf(
                            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    )
            for (uri in uris) {
                contentResolver.query(uri, columns, null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        do {
                            block(cursor)
                        } while (cursor.moveToNext())
                    }
                }
            }
        }
    }

    @ReactMethod
    fun countImagesByAlbum(promise: Promise) {
        try {
            val albumColumn = MediaStore.Images.Media.BUCKET_DISPLAY_NAME
            val results = mutableMapOf<String, Int>()

            forEachImageOrVideo(arrayOf(albumColumn)) { cursor ->
                val albumIndex = cursor.getColumnIndex(albumColumn)
                val albumName =
                        (if (albumIndex >= 0) cursor.getString(albumIndex) else null) ?: "Unknown"
                results[albumName] = results.getOrDefault(albumName, 0) + 1
            }

            promise.resolve(Arguments.makeNativeMap(results.toMap()))

        } catch (e: Exception) {
            promise.reject("ERROR_COUNTING_ALBUMS", "Failed to count images by album", e)
        }
    }

    @ReactMethod
    fun countImagesByMonthYear(promise: Promise) {
        try {
            val dateTakenColumn = MediaStore.Images.Media.DATE_TAKEN // milliseconds
            val dateAddedColumn = MediaStore.Images.Media.DATE_ADDED // seconds

            val results = mutableMapOf<String, Int>()
            // Device local timezone (default), ASCII digits regardless of device locale
            val dateFormat = SimpleDateFormat("yyyy-MM", Locale.US)

            forEachImageOrVideo(arrayOf(dateTakenColumn, dateAddedColumn)) { cursor ->
                val takenIndex = cursor.getColumnIndex(dateTakenColumn)
                val addedIndex = cursor.getColumnIndex(dateAddedColumn)
                val taken = if (takenIndex >= 0) cursor.getLong(takenIndex) else 0L
                val added = if (addedIndex >= 0) cursor.getLong(addedIndex) else 0L
                // Mirrors expo-media-library creationTime: DATE_TAKEN, falling back to DATE_ADDED
                val timestamp = if (taken > 0) taken else added * 1000L
                if (timestamp > 0) {
                    val monthYear = dateFormat.format(Date(timestamp)) // YYYY-MM
                    results[monthYear] = results.getOrDefault(monthYear, 0) + 1
                } else {
                    Log.w(TAG, "No timestamp found for media item")
                }
            }

            promise.resolve(Arguments.makeNativeMap(results.toMap()))

        } catch (e: Exception) {
            promise.reject("ERROR_COUNTING_IMAGES", "Failed to count images", e)
        }
    }

    @ReactMethod
    fun deletePhotos(photos: ReadableArray, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            promise.reject("ERROR_UNSUPPORTED_API", "Media delete requests require Android 11+")
            return
        }

        val context = reactApplicationContext
        val urisToDelete = mutableListOf<Uri>()
        var unresolvedCount = 0

        for (i in 0 until photos.size()) {
            val filePath = photos.getString(i)
            val contentUri = getContentUriFromFilePath(context, filePath)
            if (contentUri != null) {
                urisToDelete.add(contentUri)
            } else {
                unresolvedCount++
                Log.e(TAG, "Failed to get content URI for: $filePath")
            }
        }

        if (urisToDelete.isEmpty() && unresolvedCount == 0) {
            promise.reject("ERROR", "No valid media URIs found for deletion")
            return
        }

        // Do not partially delete: bail out before showing the dialog.
        if (unresolvedCount > 0) {
            promise.reject(
                    "ERROR_UNRESOLVED_MEDIA",
                    "Could not resolve $unresolvedCount of ${photos.size()} media items"
            )
            return
        }

        synchronized(this) {
            if (pendingDeletePromise != null) {
                promise.reject("ERROR_DELETE_IN_PROGRESS", "A delete request is already pending")
                return
            }
            pendingDeletePromise = promise
        }

        try {
            val pendingIntent = MediaStore.createDeleteRequest(context.contentResolver, urisToDelete)
            val activity = currentActivity
            if (activity != null) {
                activity.startIntentSenderForResult(
                        pendingIntent.intentSender,
                        DELETE_REQUEST_CODE,
                        null,
                        0,
                        0,
                        0
                )
                // Don't resolve the promise yet - it will be resolved in onActivityResult
            } else {
                failPendingDelete("ERROR", "Activity is null")
            }
        } catch (e: RecoverableSecurityException) {
            failPendingDelete("SECURITY_EXCEPTION", e.localizedMessage)
        } catch (e: Throwable) {
            failPendingDelete("ERROR", e.localizedMessage)
        }
    }

    private fun failPendingDelete(code: String, message: String?) {
        val promise =
                synchronized(this) {
                    val p = pendingDeletePromise
                    pendingDeletePromise = null
                    p
                }
        promise?.reject(code, message)
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == DELETE_REQUEST_CODE) {
            val promise =
                    synchronized(this) {
                        val p = pendingDeletePromise
                        pendingDeletePromise = null
                        p
                    }
            if (promise != null) {
                if (resultCode == Activity.RESULT_OK) {
                    promise.resolve("Photos deleted successfully")
                } else {
                    promise.reject("ERROR_USER_REJECTED", "User cancelled the deletion")
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not needed for this functionality
    }

    /**
     * Calculates the total size of media files grouped by their categories
     * (images, videos, audio, and gifs)
     *
     * @param promise Promise to resolve with the media size information
     */
    @ReactMethod
    fun getMediaSizeByCategory(promise: Promise) {
        try {
            val contentResolver = reactApplicationContext.contentResolver
            val results = mutableMapOf<String, Long>() // Map to store category -> total size

            // Initialize size counters for each category
            results["images"] = 0L
            results["videos"] = 0L
            results["audio"] = 0L
            results["gifs"] = 0L

            // 1. Get Images size (including GIFs)
            processMediaCategoryTotalSize(
                contentResolver,
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                arrayOf(MediaStore.Images.Media.SIZE, MediaStore.Images.Media.MIME_TYPE),
                results
            )

            // 2. Get Videos size
            processMediaCategoryTotalSize(
                contentResolver,
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                arrayOf(MediaStore.Video.Media.SIZE, MediaStore.Video.Media.MIME_TYPE),
                results
            )

            // 3. Get Audio size
            processMediaCategoryTotalSize(
                contentResolver,
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                arrayOf(MediaStore.Audio.Media.SIZE, MediaStore.Audio.Media.MIME_TYPE),
                results
            )

            // Convert to WritableMap for React Native
            val writableMap = Arguments.createMap()
            for ((category, size) in results) {
                writableMap.putDouble(category, size.toDouble())
            }

            promise.resolve(writableMap)
        } catch (e: Exception) {
            promise.reject("ERROR_GETTING_MEDIA_SIZE", "Failed to get media size by category", e)
        }
    }

    /**
     * Helper function to process each media category and calculate sizes
     */
    private fun processMediaCategoryTotalSize(
        contentResolver: ContentResolver,
        uri: Uri,
        projection: Array<String>,
        results: MutableMap<String, Long>
    ) {
        contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            val sizeIndex = cursor.getColumnIndex(projection[0])
            val mimeTypeIndex = cursor.getColumnIndex(projection[1])

            if (cursor.moveToFirst()) {
                do {
                    val size = cursor.getLong(sizeIndex)
                    val mimeType = cursor.getString(mimeTypeIndex) ?: ""

                    when {
                        // Handle GIFs separately
                        mimeType.contains("image/gif") -> {
                            results["gifs"] = results.getOrDefault("gifs", 0L) + size
                        }
                        // Images
                        mimeType.startsWith("image/") -> {
                            results["images"] = results.getOrDefault("images", 0L) + size
                        }
                        // Videos
                        mimeType.startsWith("video/") -> {
                            results["videos"] = results.getOrDefault("videos", 0L) + size
                        }
                        // Audio
                        mimeType.startsWith("audio/") -> {
                            results["audio"] = results.getOrDefault("audio", 0L) + size
                        }
                    }
                } while (cursor.moveToNext())
            }
        }
    }


    private fun getContentUriFromFilePath(context: Context, filePath: String): Uri? {
        val path = Uri.decode(filePath.removePrefix("file://"))
        val projection =
                arrayOf(MediaStore.Files.FileColumns._ID, MediaStore.Files.FileColumns.MEDIA_TYPE)
        val selection = MediaStore.Files.FileColumns.DATA + "=?"

        context.contentResolver.query(
                        MediaStore.Files.getContentUri("external"),
                        projection,
                        selection,
                        arrayOf(path),
                        null
                )
                ?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val id =
                                cursor.getLong(
                                        cursor.getColumnIndexOrThrow(
                                                MediaStore.Files.FileColumns._ID
                                        )
                                )
                        val baseUri =
                                when (cursor.getInt(
                                                cursor.getColumnIndexOrThrow(
                                                        MediaStore.Files.FileColumns.MEDIA_TYPE
                                                )
                                        )
                                ) {
                                    MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE ->
                                            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                                    MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO ->
                                            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                                    else -> null
                                }
                        if (baseUri != null) {
                            return ContentUris.withAppendedId(baseUri, id)
                        }
                    }
                }
        return null
    }
}
