#include <emscripten.h>
#include <stdbool.h>

// RequestAnimationFrame loop (UI libraries only)
static void (*g_raf_callback)(void) = NULL;
static bool g_raf_running = false;

// Internal RAF loop function
EM_JS(void, setup_raf_loop_js, (void (*callback)(void)), {
    function loop() {
        if (Module.rafRunning) {
            dynCall('v', callback, []);
            requestAnimationFrame(loop);
        }
    }
    Module.rafRunning = true;
    requestAnimationFrame(loop);
});

EMSCRIPTEN_KEEPALIVE
void web_raf_start(void (*callback)(void)) {
    if (g_raf_running) return;

    g_raf_callback = callback;
    g_raf_running = true;

    setup_raf_loop_js(callback);
}

EMSCRIPTEN_KEEPALIVE
void web_raf_stop(void) {
    if (!g_raf_running) return;

    EM_ASM({
        Module.rafRunning = false;
    });

    g_raf_running = false;
    g_raf_callback = NULL;
}

EMSCRIPTEN_KEEPALIVE
bool web_raf_is_running(void) {
    return g_raf_running;
}

// Idle callback for low-priority work
EM_JS(void, web_request_idle_callback_js, (void (*callback)(void)), {
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
            dynCall('v', callback, []);
        });
    } else {
        // Fallback to setTimeout with low priority
        setTimeout(() => {
            dynCall('v', callback, []);
        }, 0);
    }
});

EMSCRIPTEN_KEEPALIVE
void web_request_idle_callback(void (*callback)(void)) {
    web_request_idle_callback_js(callback);
}

// High-precision timing
EMSCRIPTEN_KEEPALIVE
double web_performance_now(void) {
    return EM_ASM_DOUBLE({
        return performance.now();
    });
}

// Frame timing information
typedef struct {
    double frame_time;
    double fps;
    int dropped_frames;
} FrameStats;

static FrameStats g_frame_stats = {0};
static double g_last_frame_time = 0;
static int g_frame_count = 0;

EMSCRIPTEN_KEEPALIVE
const FrameStats* web_get_frame_stats(void) {
    double now = web_performance_now();

    if (g_last_frame_time > 0) {
        g_frame_stats.frame_time = now - g_last_frame_time;
        g_frame_stats.fps = 1000.0 / g_frame_stats.frame_time;
    }

    g_last_frame_time = now;
    g_frame_count++;

    return &g_frame_stats;
}

EMSCRIPTEN_KEEPALIVE
void web_reset_frame_stats(void) {
    g_frame_stats.frame_time = 0;
    g_frame_stats.fps = 0;
    g_frame_stats.dropped_frames = 0;
    g_last_frame_time = 0;
    g_frame_count = 0;
}

// Visibility API integration
EM_JS(bool, web_is_page_visible_js, (), {
    return !document.hidden;
});

EMSCRIPTEN_KEEPALIVE
bool web_is_page_visible(void) {
    return web_is_page_visible_js();
}

// Battery API integration (for power-aware rendering)
EM_JS(int, web_get_battery_level_js, (), {
    // This would use the Battery API
    // For now, return unknown (-1)
    return -1;
});

EMSCRIPTEN_KEEPALIVE
int web_get_battery_level(void) {
    return web_get_battery_level_js();
}

EMSCRIPTEN_KEEPALIVE
bool web_is_battery_charging(void) {
    return EM_ASM_INT({
        // This would use the Battery API
        return true; // Assume charging
    });
}
