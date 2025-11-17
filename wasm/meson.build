# Web-native capability sources
web_native_sources = files(
  'web_native_capabilities.c',
  'web_native_simd_strings.c',
  'web_native_crypto.c',
  'web_native_threading.c',
  'web_native_networking.c',
  'web_native_filesystem.c',
  'web_native_memory.c',
  'web_native_mainloop.c',
)

# Conditional compilation flags based on build type
wasm_common_flags = [
  '-fPIC',
  '-sWASM_BIGINT=1',
  '-DCAIRO_WASM=1',
]

wasm_simd_flags = get_option('wasm_simd') ? ['-msimd128', '-DCAIRO_WASM_SIMD=1'] : []
wasm_threading_flags = get_option('wasm_threading') ? ['-pthread', '-sPTHREAD_POOL_SIZE=4'] : []

# Build type specific flags
if get_option('wasm_build_type') == 'minimal'
  wasm_memory_flags = [
    '-sINITIAL_MEMORY=67108864',  # 64MB
    '-sSTACK_SIZE=2097152',       # 2MB
  ]
elif get_option('wasm_build_type') == 'webgpu'
  wasm_memory_flags = [
    '-sINITIAL_MEMORY=134217728',  # 128MB
    '-sMAXIMUM_MEMORY=1073741824', # 1GB
    '-sUSE_WEBGPU=1',
    '-sASYNCIFY=1',
  ]
else  # standard
  wasm_memory_flags = [
    '-sINITIAL_MEMORY=134217728',  # 128MB
    '-sMAXIMUM_MEMORY=1073741824', # 1GB
  ]
endif

# MAIN_MODULE target (testing, NPM distribution)
cairo_main_cargs = wasm_common_flags + wasm_simd_flags + wasm_threading_flags

cairo_main_link_args = [
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sEXPORT_NAME=CairoModule',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sENVIRONMENT=web,webview,worker',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString","HEAPU8"]',
  '-sEXPORTED_FUNCTIONS=["_malloc","_free","_cairo_wasm_version","_web_get_capabilities"]',
  '-O3',
  '-flto',
] + wasm_memory_flags + wasm_simd_flags + wasm_threading_flags

executable(
  'cairo-main',
  files('cairo_wasm_module.c') + web_native_sources,
  dependencies: [libcairo_dep],
  c_args: cairo_main_cargs,
  link_args: cairo_main_link_args,
  install: true,
  install_dir: get_option('bindir'),
)

# SIDE_MODULE target (production, dynamic loading)
cairo_side_cargs = wasm_common_flags + wasm_simd_flags

cairo_side_link_args = [
  '-sSIDE_MODULE=2',
  '-fPIC',
  '-O3',
  '-flto',
  '-sERROR_ON_UNDEFINED_SYMBOLS=0',  # Host provides dependencies (pixman, freetype, fontconfig, glib, etc.)
  '-sEXPORTED_FUNCTIONS=["_cairo_wasm_version","_web_get_capabilities"]',
] + wasm_simd_flags

shared_module(
  'cairo-side',
  files('cairo_wasm_side.c') + web_native_sources,
  dependencies: [libcairo_dep],
  name_prefix: '',
  name_suffix: 'wasm',
  c_args: cairo_side_cargs,
  link_args: cairo_side_link_args,
  install: true,
  install_dir: get_option('libdir'),
)

