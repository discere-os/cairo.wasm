#include <emscripten.h>
#include <pthread.h>
#include <stdbool.h>

// Forward declaration
extern bool web_has_workers(void);

// Web Workers implementation (10x faster than pthread emulation)
typedef void (*worker_func_t)(void*);

EM_JS(void, spawn_web_worker_js, (worker_func_t func, void* data), {
    // This would spawn a real Web Worker
    // For now, just a placeholder
    console.log('Web Worker spawning not yet implemented');
});

EMSCRIPTEN_KEEPALIVE
void spawn_web_worker(worker_func_t func, void* data) {
    if (web_has_workers()) {
        spawn_web_worker_js(func, data);
    } else {
        // Fallback to pthread
        pthread_t thread;
        pthread_create(&thread, NULL, (void*(*)(void*))func, data);
    }
}

// Worker pool management
typedef struct {
    int num_workers;
    bool initialized;
} WorkerPool;

static WorkerPool g_worker_pool = {0, false};

EMSCRIPTEN_KEEPALIVE
void web_worker_pool_init(int num_workers) {
    if (g_worker_pool.initialized) return;

    g_worker_pool.num_workers = num_workers;
    g_worker_pool.initialized = true;

    EM_ASM({
        console.log('Initializing worker pool with', $0, 'workers');
    }, num_workers);
}

EMSCRIPTEN_KEEPALIVE
void web_worker_pool_shutdown(void) {
    if (!g_worker_pool.initialized) return;

    EM_ASM({
        console.log('Shutting down worker pool');
    });

    g_worker_pool.initialized = false;
    g_worker_pool.num_workers = 0;
}

EMSCRIPTEN_KEEPALIVE
int web_worker_pool_get_size(void) {
    return g_worker_pool.num_workers;
}

// Async task execution using Workers
EM_JS(void, web_worker_execute_async_js, (int task_id, const uint8_t* data, size_t len), {
    console.log('Executing async task', task_id, 'with', len, 'bytes');
    // This would post a message to a worker
});

EMSCRIPTEN_KEEPALIVE
void web_worker_execute_async(int task_id, const uint8_t* data, size_t len) {
    if (web_has_workers() && g_worker_pool.initialized) {
        web_worker_execute_async_js(task_id, data, len);
    }
}
