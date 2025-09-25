// Minimal Cairo SIDE_MODULE wrapper
#include <cairo.h>

const char* cairo_wasm_version(void) {
  return cairo_version_string();
}

