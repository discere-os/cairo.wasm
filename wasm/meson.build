cairo_wasm_cargs = ['-msimd128', '-DCAIRO_WASM=1']

cairo_main_link_args = [
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sEXPORT_NAME=CairoModule',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sENVIRONMENT=web,webview,worker',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString"]',
  '-O3',
  '-flto',
]

executable(
  'cairo-main',
  files('cairo_wasm_module.c'),
  dependencies: [libcairo_dep],
  c_args: cairo_wasm_cargs,
  link_args: cairo_main_link_args,
  install: true,
  install_dir: get_option('bindir'),
)

cairo_side_link_args = [
  '-sSIDE_MODULE=2',
  '-fPIC',
  '-O3',
  '-flto',
  '-sERROR_ON_UNDEFINED_SYMBOLS=0',  # Host provides dependencies (pixman, freetype, fontconfig, glib, etc.)
  '-sEXPORTED_FUNCTIONS=["_cairo_wasm_version"]',
]

shared_module(
  'cairo-side',
  files('cairo_wasm_side.c'),
  dependencies: [libcairo_dep],
  name_prefix: '',
  name_suffix: 'wasm',
  c_args: cairo_wasm_cargs,
  link_args: cairo_side_link_args,
  install: true,
  install_dir: get_option('libdir'),
)

