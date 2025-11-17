#include <emscripten.h>
#include <string.h>
#include <stdint.h>

// Fetch API (3-5x faster than XMLHttpRequest)
EM_JS(void, web_fetch_get, (const char* url, void (*callback)(const char*)), {
    const urlStr = UTF8ToString(url);
    fetch(urlStr)
        .then(response => response.text())
        .then(text => {
            const ptr = allocateUTF8(text);
            dynCall('vi', callback, [ptr]);
            _free(ptr);
        })
        .catch(err => console.error('Fetch error:', err));
});

EMSCRIPTEN_KEEPALIVE
void web_fetch_url(const char* url, void (*callback)(const char*)) {
    web_fetch_get(url, callback);
}

// Fetch with binary data
EM_JS(void, web_fetch_binary_js, (const char* url, void (*callback)(const uint8_t*, size_t)), {
    const urlStr = UTF8ToString(url);
    fetch(urlStr)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            const ptr = _malloc(buffer.byteLength);
            HEAPU8.set(new Uint8Array(buffer), ptr);
            dynCall('vii', callback, [ptr, buffer.byteLength]);
            _free(ptr);
        })
        .catch(err => console.error('Fetch error:', err));
});

EMSCRIPTEN_KEEPALIVE
void web_fetch_binary(const char* url, void (*callback)(const uint8_t*, size_t)) {
    web_fetch_binary_js(url, callback);
}

// POST request with JSON data
EM_JS(void, web_fetch_post_json_js, (const char* url, const char* json_data, void (*callback)(const char*)), {
    const urlStr = UTF8ToString(url);
    const jsonStr = UTF8ToString(json_data);

    fetch(urlStr, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonStr
    })
    .then(response => response.text())
    .then(text => {
        const ptr = allocateUTF8(text);
        dynCall('vi', callback, [ptr]);
        _free(ptr);
    })
    .catch(err => console.error('Fetch error:', err));
});

EMSCRIPTEN_KEEPALIVE
void web_fetch_post_json(const char* url, const char* json_data, void (*callback)(const char*)) {
    web_fetch_post_json_js(url, json_data, callback);
}

// WebSocket support (placeholder)
typedef struct {
    int socket_id;
    char* url;
    bool connected;
} WebSocket;

static WebSocket g_websockets[16] = {0};
static int g_next_socket_id = 1;

EM_JS(int, web_websocket_connect_js, (int socket_id, const char* url), {
    const urlStr = UTF8ToString(url);
    console.log('WebSocket connecting to', urlStr);
    // This would create a real WebSocket connection
    return 1; // Success
});

EMSCRIPTEN_KEEPALIVE
int web_websocket_connect(const char* url) {
    for (int i = 0; i < 16; i++) {
        if (!g_websockets[i].connected) {
            int socket_id = g_next_socket_id++;
            g_websockets[i].socket_id = socket_id;
            g_websockets[i].url = strdup(url);
            g_websockets[i].connected = true;

            web_websocket_connect_js(socket_id, url);
            return socket_id;
        }
    }
    return -1; // No free slots
}

EMSCRIPTEN_KEEPALIVE
void web_websocket_close(int socket_id) {
    for (int i = 0; i < 16; i++) {
        if (g_websockets[i].socket_id == socket_id && g_websockets[i].connected) {
            free(g_websockets[i].url);
            g_websockets[i].connected = false;
            g_websockets[i].socket_id = 0;

            EM_ASM({
                console.log('WebSocket', $0, 'closed');
            }, socket_id);
            return;
        }
    }
}
