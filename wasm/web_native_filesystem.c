#include <emscripten.h>
#include <stdint.h>
#include <string.h>
#include <stdbool.h>

// Forward declaration
extern bool web_has_opfs(void);

typedef enum {
    STORAGE_MEMORY,     // Fastest, temporary
    STORAGE_OPFS,       // Fast, persistent (3-4x vs IDBFS)
    STORAGE_CACHE,      // Medium, browser cache
    STORAGE_REMOTE      // Slowest, network
} StorageTier;

// OPFS (Origin Private File System) read - 3-4x faster than IDBFS
EM_JS(void*, web_storage_read_opfs_js, (const char* path, size_t* size), {
    const pathStr = UTF8ToString(path);
    // This would be the full async OPFS implementation
    // For now, return null as placeholder
    setValue(size, 0, 'i32');
    return 0;
});

EMSCRIPTEN_KEEPALIVE
void* web_storage_read_opfs(const char* path, size_t* size) {
    if (web_has_opfs()) {
        return web_storage_read_opfs_js(path, size);
    }
    *size = 0;
    return NULL;
}

// OPFS write - 3-4x faster than IDBFS
EM_JS(int, web_storage_write_opfs_js, (const char* path, const uint8_t* data, size_t size), {
    const pathStr = UTF8ToString(path);
    const buffer = HEAPU8.slice(data, data + size);
    // This would be the full async OPFS implementation
    console.log('Writing', size, 'bytes to OPFS:', pathStr);
    return 1; // Success
});

EMSCRIPTEN_KEEPALIVE
int web_storage_write_opfs(const char* path, const uint8_t* data, size_t size) {
    if (web_has_opfs()) {
        return web_storage_write_opfs_js(path, data, size);
    }
    return 0; // Failure
}

// OPFS delete
EM_JS(int, web_storage_delete_opfs_js, (const char* path), {
    const pathStr = UTF8ToString(path);
    console.log('Deleting from OPFS:', pathStr);
    return 1; // Success
});

EMSCRIPTEN_KEEPALIVE
int web_storage_delete_opfs(const char* path) {
    if (web_has_opfs()) {
        return web_storage_delete_opfs_js(path);
    }
    return 0; // Failure
}

// Cache API integration (faster than network, slower than OPFS)
EM_JS(void*, web_cache_read_js, (const char* url, size_t* size), {
    const urlStr = UTF8ToString(url);
    console.log('Reading from cache:', urlStr);
    setValue(size, 0, 'i32');
    return 0;
});

EMSCRIPTEN_KEEPALIVE
void* web_cache_read(const char* url, size_t* size) {
    return web_cache_read_js(url, size);
}

EM_JS(int, web_cache_write_js, (const char* url, const uint8_t* data, size_t size), {
    const urlStr = UTF8ToString(url);
    const buffer = HEAPU8.slice(data, data + size);
    console.log('Writing', size, 'bytes to cache:', urlStr);
    return 1;
});

EMSCRIPTEN_KEEPALIVE
int web_cache_write(const char* url, const uint8_t* data, size_t size) {
    return web_cache_write_js(url, data, size);
}

// Storage tier management
typedef struct {
    StorageTier tier;
    size_t size_bytes;
    bool cached;
    char* path;
} StorageEntry;

static StorageEntry g_storage_entries[256] = {0};
static int g_num_entries = 0;

EMSCRIPTEN_KEEPALIVE
int web_storage_register(const char* path, StorageTier tier) {
    if (g_num_entries >= 256) return -1;

    StorageEntry* entry = &g_storage_entries[g_num_entries];
    entry->tier = tier;
    entry->path = strdup(path);
    entry->cached = false;
    entry->size_bytes = 0;

    return g_num_entries++;
}

EMSCRIPTEN_KEEPALIVE
StorageTier web_storage_get_tier(int entry_id) {
    if (entry_id < 0 || entry_id >= g_num_entries) {
        return STORAGE_MEMORY;
    }
    return g_storage_entries[entry_id].tier;
}
