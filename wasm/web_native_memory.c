#include <emscripten.h>
#include <stdlib.h>
#include <stdbool.h>

// WeakRef for automatic GC integration
EM_JS(void, register_weak_ref_js, (void* ptr), {
    if (typeof WeakRef !== 'undefined') {
        const ref = new WeakRef({ ptr: ptr });
        // Store in a global registry for cleanup
        if (!Module.weakRefs) {
            Module.weakRefs = [];
        }
        Module.weakRefs.push(ref);
    }
});

EMSCRIPTEN_KEEPALIVE
void register_weak_ref(void* ptr) {
    register_weak_ref_js(ptr);
}

// Memory pressure API integration
EM_JS(int, web_get_memory_pressure_js, (), {
    if (typeof performance !== 'undefined' && performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;

        // Return pressure level 0-100
        return Math.floor((used / limit) * 100);
    }
    return 50; // Unknown, assume medium pressure
});

EMSCRIPTEN_KEEPALIVE
int web_get_memory_pressure(void) {
    return web_get_memory_pressure_js();
}

// Smart allocation based on memory pressure
EMSCRIPTEN_KEEPALIVE
void* web_smart_malloc(size_t size) {
    int pressure = web_get_memory_pressure();

    if (pressure > 80) {
        // High memory pressure - try to trigger GC before allocating
        EM_ASM({
            if (typeof gc === 'function') {
                gc();
            }
        });
    }

    return malloc(size);
}

// Memory pool management
typedef struct {
    void* pool;
    size_t total_size;
    size_t used_size;
    size_t num_allocations;
} MemoryPool;

static MemoryPool g_memory_pools[8] = {0};
static int g_num_pools = 0;

EMSCRIPTEN_KEEPALIVE
int web_memory_pool_create(size_t size) {
    if (g_num_pools >= 8) return -1;

    MemoryPool* pool = &g_memory_pools[g_num_pools];
    pool->pool = malloc(size);
    if (!pool->pool) return -1;

    pool->total_size = size;
    pool->used_size = 0;
    pool->num_allocations = 0;

    return g_num_pools++;
}

EMSCRIPTEN_KEEPALIVE
void* web_memory_pool_alloc(int pool_id, size_t size) {
    if (pool_id < 0 || pool_id >= g_num_pools) return NULL;

    MemoryPool* pool = &g_memory_pools[pool_id];
    if (pool->used_size + size > pool->total_size) return NULL;

    void* ptr = (char*)pool->pool + pool->used_size;
    pool->used_size += size;
    pool->num_allocations++;

    return ptr;
}

EMSCRIPTEN_KEEPALIVE
void web_memory_pool_reset(int pool_id) {
    if (pool_id < 0 || pool_id >= g_num_pools) return;

    MemoryPool* pool = &g_memory_pools[pool_id];
    pool->used_size = 0;
    pool->num_allocations = 0;
}

EMSCRIPTEN_KEEPALIVE
void web_memory_pool_destroy(int pool_id) {
    if (pool_id < 0 || pool_id >= g_num_pools) return;

    MemoryPool* pool = &g_memory_pools[pool_id];
    if (pool->pool) {
        free(pool->pool);
        pool->pool = NULL;
    }
    pool->total_size = 0;
    pool->used_size = 0;
    pool->num_allocations = 0;
}

// Get memory statistics
EMSCRIPTEN_KEEPALIVE
size_t web_get_heap_size(void) {
    return EM_ASM_INT({
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
}

EMSCRIPTEN_KEEPALIVE
size_t web_get_total_memory(void) {
    return EM_ASM_INT({
        return HEAP8.length;
    });
}
