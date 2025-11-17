#include <stdbool.h>
#include <emscripten.h>

typedef struct {
    bool has_wasm_simd;
    bool has_webgpu;
    bool has_shared_array_buffer;
    bool has_web_crypto;
    bool has_opfs;
    bool has_workers;
    int chrome_version;
} WebCapabilities;

static WebCapabilities g_caps = {0};
static bool g_initialized = false;

EMSCRIPTEN_KEEPALIVE
const WebCapabilities* web_get_capabilities(void) {
    if (!g_initialized) {
        // Check WASM SIMD support
        g_caps.has_wasm_simd = EM_ASM_INT({
            return typeof WebAssembly.validate !== 'undefined' &&
                   WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,9,1,7,0,65,0,253,15,26,11]));
        });

        // Check WebGPU support
        g_caps.has_webgpu = EM_ASM_INT({
            return typeof navigator.gpu !== 'undefined';
        });

        // Check SharedArrayBuffer support
        g_caps.has_shared_array_buffer = EM_ASM_INT({
            return typeof SharedArrayBuffer !== 'undefined';
        });

        // Check Web Crypto support
        g_caps.has_web_crypto = EM_ASM_INT({
            return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
        });

        // Check OPFS support
        g_caps.has_opfs = EM_ASM_INT({
            return typeof navigator.storage !== 'undefined' &&
                   typeof navigator.storage.getDirectory !== 'undefined';
        });

        // Check Workers support
        g_caps.has_workers = EM_ASM_INT({
            return typeof Worker !== 'undefined';
        });

        // Detect Chrome version
        g_caps.chrome_version = EM_ASM_INT({
            const match = navigator.userAgent.match(/Chrome\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });

        g_initialized = true;
    }
    return &g_caps;
}

EMSCRIPTEN_KEEPALIVE
bool web_has_wasm_simd(void) {
    return web_get_capabilities()->has_wasm_simd;
}

EMSCRIPTEN_KEEPALIVE
bool web_has_webgpu(void) {
    return web_get_capabilities()->has_webgpu;
}

EMSCRIPTEN_KEEPALIVE
bool web_has_web_crypto(void) {
    return web_get_capabilities()->has_web_crypto;
}

EMSCRIPTEN_KEEPALIVE
bool web_has_opfs(void) {
    return web_get_capabilities()->has_opfs;
}

EMSCRIPTEN_KEEPALIVE
bool web_has_workers(void) {
    return web_get_capabilities()->has_workers;
}

EMSCRIPTEN_KEEPALIVE
int web_get_chrome_version(void) {
    return web_get_capabilities()->chrome_version;
}
