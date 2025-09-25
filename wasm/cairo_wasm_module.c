// Minimal Cairo MAIN_MODULE wrapper for demos/tests
#include <emscripten.h>
#include <cairo.h>

EMSCRIPTEN_KEEPALIVE
const char* cairo_wasm_version(void) {
  return cairo_version_string();
}

EMSCRIPTEN_KEEPALIVE
const char* cairo_wasm_status_to_string(cairo_status_t status) {
  return cairo_status_to_string(status);
}

