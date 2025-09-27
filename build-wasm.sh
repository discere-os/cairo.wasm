#!/bin/bash

# Cairo.wasm Production Build System
# Comprehensive 2D vector graphics library with WASM SIMD optimization
# Copyright 2025 Superstruct Ltd, New Zealand - Licensed under LGPL 2.1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
EMSCRIPTEN_VERSION="4.0.13"
BUILD_TYPE="${BUILD_TYPE:-Release}"
SIMD_ENABLED="${SIMD_ENABLED:-ON}"
ENABLE_NATIVE_BUILD="${ENABLE_NATIVE_BUILD:-OFF}"

# Ecosystem dependencies paths
ZLIB_ROOT="${ZLIB_ROOT:-../zlib.wasm}"
LIBPNG_ROOT="${LIBPNG_ROOT:-../libpng.wasm}"
PIXMAN_ROOT="${PIXMAN_ROOT:-../pixman.wasm}"
FREETYPE_ROOT="${FREETYPE_ROOT:-../freetype.wasm}"
FONTCONFIG_ROOT="${FONTCONFIG_ROOT:-../fontconfig.wasm}"
GLIB_ROOT="${GLIB_ROOT:-../glib.wasm}"

echo "🎨 === Cairo.wasm Production Build System ==="
echo "📊 Build Type: $BUILD_TYPE"
echo "⚡ SIMD: $SIMD_ENABLED"
echo "🌐 WASM-Native: $ENABLE_NATIVE_BUILD"

# Verify Emscripten
if ! command -v emcc >/dev/null 2>&1; then
    echo "❌ Error: Emscripten not found. Please install Emscripten $EMSCRIPTEN_VERSION"
    exit 1
fi

EMCC_VERSION=$(emcc --version | head -n1 | grep -o '[0-9]*\.[0-9]*\.[0-9]*' | head -n1)
echo "🔧 Using Emscripten: $EMCC_VERSION"

# Check dependency availability
check_dependency() {
    local name=$1
    local path=$2
    
    if [ -d "$path" ]; then
        echo "✅ Found $name at $path"
        return 0
    else
        echo "⚠️  Missing $name at $path - will use fallback if available"
        return 1
    fi
}

echo ""
echo "🔍 Checking ecosystem dependencies:"
check_dependency "zlib.wasm" "$ZLIB_ROOT"
check_dependency "libpng.wasm" "$LIBPNG_ROOT"
check_dependency "pixman.wasm" "$PIXMAN_ROOT"
check_dependency "freetype.wasm" "$FREETYPE_ROOT"
check_dependency "fontconfig.wasm" "$FONTCONFIG_ROOT"
check_dependency "glib.wasm" "$GLIB_ROOT"

# Create build directories
BUILD_DIR="build"
INSTALL_DIR="install"
DIST_DIR="dist"

mkdir -p "$BUILD_DIR"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DIST_DIR"

echo ""
echo "🏗️  Configuring cairo.wasm with Meson..."

# Meson configuration
MESON_ARGS=(
    setup
    "$BUILD_DIR"
    --cross-file=wasm-cross.ini
    --prefix="$(pwd)/$INSTALL_DIR"
    --buildtype="$(echo $BUILD_TYPE | tr '[:upper:]' '[:lower:]')"
    --default-library=static
    -Dtests=disabled
    -Dspectre=disabled
    -Dgtk_doc=false
    -Dzlib=disabled
    -Dpng=disabled
    -Dfreetype=enabled
    -Dfontconfig=enabled
    -Dglib=enabled
    -Dxlib=disabled
    -Dxcb=disabled
    -Dquartz=disabled
    -Dtee=enabled
    -Dsymbol-lookup=disabled
)

# Set dependency paths if available
if [ -d "$ZLIB_ROOT/install" ]; then
    export PKG_CONFIG_PATH="$ZLIB_ROOT/install/lib/pkgconfig:$PKG_CONFIG_PATH"
fi

if [ -d "$LIBPNG_ROOT/install" ]; then
    export PKG_CONFIG_PATH="$LIBPNG_ROOT/install/lib/pkgconfig:$PKG_CONFIG_PATH"
fi

if [ -d "$PIXMAN_ROOT/install" ]; then
    export PKG_CONFIG_PATH="$PIXMAN_ROOT/install/lib/pkgconfig:$PKG_CONFIG_PATH"
fi

if [ -d "$FREETYPE_ROOT/install" ]; then
    export PKG_CONFIG_PATH="$FREETYPE_ROOT/install/lib/pkgconfig:$PKG_CONFIG_PATH"
fi

if [ -d "$FONTCONFIG_ROOT/install" ]; then
    export PKG_CONFIG_PATH="$FONTCONFIG_ROOT/install/lib/pkgconfig:$PKG_CONFIG_PATH"
fi

if [ -d "$GLIB_ROOT/install" ]; then
    export PKG_CONFIG_PATH="$GLIB_ROOT/install/lib/pkgconfig:$PKG_CONFIG_PATH"
fi

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

# Configure with Meson
echo "⚙️  Configuring with Meson..."
meson "${MESON_ARGS[@]}"

if [ $? -ne 0 ]; then
    echo "❌ Meson configuration failed"
    exit 1
fi

echo ""
echo "🔨 Building cairo.wasm..."
cd "$BUILD_DIR"

# Build static library
ninja -j$(nproc)

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "📦 Installing cairo..."
ninja install

cd "$SCRIPT_DIR"

echo ""
echo "🔧 Creating WASM modules..."

# Foundation build (for graphics ecosystem integration)
FOUNDATION_FLAGS=(
    -O3
    -s WASM=1
    -s MODULARIZE=1  
    -s EXPORT_ES6=1
    -s INITIAL_MEMORY=128MB
    -s MAXIMUM_MEMORY=2GB
    -s ALLOW_MEMORY_GROWTH=1
    -s EXPORTED_FUNCTIONS='["_cairo_create","_cairo_destroy","_cairo_save","_cairo_restore","_cairo_status","_cairo_get_target","_cairo_push_group","_cairo_pop_group","_cairo_pop_group_to_source","_cairo_set_operator","_cairo_set_source","_cairo_set_source_rgba","_cairo_set_tolerance","_cairo_set_antialias","_cairo_set_fill_rule","_cairo_set_line_width","_cairo_set_line_cap","_cairo_set_line_join","_cairo_set_dash","_cairo_set_miter_limit","_cairo_translate","_cairo_scale","_cairo_rotate","_cairo_transform","_cairo_set_matrix","_cairo_identity_matrix","_cairo_user_to_device","_cairo_user_to_device_distance","_cairo_device_to_user","_cairo_device_to_user_distance","_cairo_new_path","_cairo_move_to","_cairo_new_sub_path","_cairo_line_to","_cairo_curve_to","_cairo_arc","_cairo_arc_negative","_cairo_rel_move_to","_cairo_rel_line_to","_cairo_rel_curve_to","_cairo_rectangle","_cairo_close_path","_cairo_path_extents","_cairo_paint","_cairo_paint_with_alpha","_cairo_mask","_cairo_mask_surface","_cairo_stroke","_cairo_stroke_preserve","_cairo_fill","_cairo_fill_preserve","_cairo_copy_page","_cairo_show_page","_cairo_in_stroke","_cairo_in_fill","_cairo_in_clip","_cairo_stroke_extents","_cairo_fill_extents","_cairo_reset_clip","_cairo_clip","_cairo_clip_preserve","_cairo_clip_extents","_cairo_copy_clip_rectangle_list","_cairo_rectangle_list_destroy","_cairo_glyph_allocate","_cairo_glyph_free","_cairo_text_cluster_allocate","_cairo_text_cluster_free","_cairo_font_options_create","_cairo_font_options_copy","_cairo_font_options_destroy","_cairo_font_options_status","_cairo_font_options_merge","_cairo_font_options_set_antialias","_cairo_font_options_get_antialias","_cairo_font_options_set_subpixel_order","_cairo_font_options_get_subpixel_order","_cairo_font_options_set_hint_style","_cairo_font_options_get_hint_style","_cairo_font_options_set_hint_metrics","_cairo_font_options_get_hint_metrics","_cairo_select_font_face","_cairo_set_font_size","_cairo_set_font_matrix","_cairo_set_font_options","_cairo_set_scaled_font","_cairo_get_font_matrix","_cairo_get_font_options","_cairo_get_font_face","_cairo_get_scaled_font","_cairo_show_text","_cairo_show_glyphs","_cairo_show_text_glyphs","_cairo_text_path","_cairo_glyph_path","_cairo_text_extents","_cairo_glyph_extents","_cairo_font_extents","_cairo_font_face_reference","_cairo_font_face_destroy","_cairo_font_face_get_reference_count","_cairo_font_face_status","_cairo_font_face_get_type","_cairo_font_face_get_user_data","_cairo_font_face_set_user_data","_cairo_scaled_font_create","_cairo_scaled_font_reference","_cairo_scaled_font_destroy","_cairo_scaled_font_get_reference_count","_cairo_scaled_font_status","_cairo_scaled_font_get_type","_cairo_scaled_font_get_font_face","_cairo_scaled_font_get_font_options","_cairo_scaled_font_get_font_matrix","_cairo_scaled_font_get_ctm","_cairo_scaled_font_get_scale_matrix","_cairo_scaled_font_text_extents","_cairo_scaled_font_glyph_extents","_cairo_scaled_font_text_to_glyphs","_cairo_get_operator","_cairo_get_source","_cairo_get_tolerance","_cairo_get_antialias","_cairo_has_current_point","_cairo_get_current_point","_cairo_get_fill_rule","_cairo_get_line_width","_cairo_get_line_cap","_cairo_get_line_join","_cairo_get_miter_limit","_cairo_get_dash_count","_cairo_get_dash","_cairo_get_matrix","_cairo_copy_path","_cairo_copy_path_flat","_cairo_append_path","_cairo_path_destroy","_cairo_status_to_string","_cairo_device_reference","_cairo_device_get_type","_cairo_device_status","_cairo_device_acquire","_cairo_device_release","_cairo_device_flush","_cairo_device_finish","_cairo_device_destroy","_cairo_device_get_reference_count","_cairo_device_get_user_data","_cairo_device_set_user_data","_cairo_surface_create_similar","_cairo_surface_create_similar_image","_cairo_surface_create_for_rectangle","_cairo_surface_reference","_cairo_surface_finish","_cairo_surface_destroy","_cairo_surface_get_device","_cairo_surface_get_reference_count","_cairo_surface_status","_cairo_surface_get_type","_cairo_surface_get_content","_cairo_surface_get_user_data","_cairo_surface_set_user_data","_cairo_surface_get_mime_data","_cairo_surface_set_mime_data","_cairo_surface_get_font_options","_cairo_surface_flush","_cairo_surface_mark_dirty","_cairo_surface_mark_dirty_rectangle","_cairo_surface_set_device_scale","_cairo_surface_get_device_scale","_cairo_surface_set_device_offset","_cairo_surface_get_device_offset","_cairo_surface_set_fallback_resolution","_cairo_surface_get_fallback_resolution","_cairo_surface_copy_page","_cairo_surface_show_page","_cairo_surface_has_show_text_glyphs","_cairo_image_surface_create","_cairo_format_stride_for_width","_cairo_image_surface_create_for_data","_cairo_image_surface_get_data","_cairo_image_surface_get_format","_cairo_image_surface_get_width","_cairo_image_surface_get_height","_cairo_image_surface_get_stride","_cairo_recording_surface_create","_cairo_recording_surface_ink_extents","_cairo_recording_surface_get_extents","_cairo_pattern_create_rgb","_cairo_pattern_create_rgba","_cairo_pattern_create_for_surface","_cairo_pattern_create_linear","_cairo_pattern_create_radial","_cairo_pattern_create_mesh","_cairo_pattern_reference","_cairo_pattern_destroy","_cairo_pattern_get_reference_count","_cairo_pattern_status","_cairo_pattern_get_user_data","_cairo_pattern_set_user_data","_cairo_pattern_get_type","_cairo_pattern_add_color_stop_rgb","_cairo_pattern_add_color_stop_rgba","_cairo_mesh_pattern_begin_patch","_cairo_mesh_pattern_end_patch","_cairo_mesh_pattern_curve_to","_cairo_mesh_pattern_line_to","_cairo_mesh_pattern_move_to","_cairo_mesh_pattern_set_control_point","_cairo_mesh_pattern_set_corner_color_rgb","_cairo_mesh_pattern_set_corner_color_rgba","_cairo_pattern_set_matrix","_cairo_pattern_get_matrix","_cairo_pattern_set_extend","_cairo_pattern_get_extend","_cairo_pattern_set_filter","_cairo_pattern_get_filter","_cairo_pattern_get_rgba","_cairo_pattern_get_surface","_cairo_pattern_get_color_stop_rgba","_cairo_pattern_get_color_stop_count","_cairo_pattern_get_linear_points","_cairo_pattern_get_radial_circles","_cairo_matrix_init","_cairo_matrix_init_identity","_cairo_matrix_init_translate","_cairo_matrix_init_scale","_cairo_matrix_init_rotate","_cairo_matrix_translate","_cairo_matrix_scale","_cairo_matrix_rotate","_cairo_matrix_invert","_cairo_matrix_multiply","_cairo_matrix_transform_distance","_cairo_matrix_transform_point","_cairo_region_create","_cairo_region_create_rectangle","_cairo_region_create_rectangles","_cairo_region_copy","_cairo_region_reference","_cairo_region_destroy","_cairo_region_equal","_cairo_region_status","_cairo_region_get_extents","_cairo_region_num_rectangles","_cairo_region_get_rectangle","_cairo_region_is_empty","_cairo_region_contains_rectangle","_cairo_region_contains_point","_cairo_region_translate","_cairo_region_subtract","_cairo_region_subtract_rectangle","_cairo_region_intersect","_cairo_region_intersect_rectangle","_cairo_region_union","_cairo_region_union_rectangle","_cairo_region_xor","_cairo_region_xor_rectangle","_cairo_debug_reset_static_data","_cairo_surface_observer_add_paint_callback","_cairo_surface_observer_add_mask_callback","_cairo_surface_observer_add_fill_callback","_cairo_surface_observer_add_stroke_callback","_cairo_surface_observer_add_glyphs_callback","_cairo_surface_observer_add_flush_callback","_cairo_surface_observer_add_finish_callback","_cairo_surface_observer_print","_cairo_surface_observer_elapsed","_cairo_device_observer_print","_cairo_device_observer_elapsed","_cairo_device_observer_paint_elapsed","_cairo_device_observer_mask_elapsed","_cairo_device_observer_fill_elapsed","_cairo_device_observer_stroke_elapsed","_cairo_device_observer_glyphs_elapsed","_cairo_ft_font_face_create_for_ft_face","_cairo_ft_font_face_create_for_pattern","_cairo_ft_font_options_substitute","_cairo_ft_scaled_font_lock_face","_cairo_ft_scaled_font_unlock_face","_malloc","_free"]'
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPU8","HEAPU32","HEAPF32","addFunction","removeFunction","FS"]'
    -s FORCE_FILESYSTEM=1
    -flto
)

# SIMD flags if enabled
if [ "$SIMD_ENABLED" = "ON" ]; then
    FOUNDATION_FLAGS+=("-msimd128")
    echo "⚡ Building with WASM SIMD support"
fi

echo "🏗️  Building foundation cairo.wasm module..."
emcc "${FOUNDATION_FLAGS[@]}" \
    -I"$INSTALL_DIR/include/cairo" \
    -I"$INSTALL_DIR/include" \
    "$INSTALL_DIR/lib/libcairo.a" \
    "../pixman.wasm/install/lib/libpixman-1.a" \
    "../fontconfig.wasm/install/lib/libfontconfig.a" \
    "../freetype.wasm/build-wasm/install/lib/libfreetype.a" \
    "../libexpat.wasm/install/lib/libexpat.a" \
    "../glib.wasm/install/lib/libglib-2.0.a" \
    "../glib.wasm/install/lib/libgobject-2.0.a" \
    -o "$DIST_DIR/cairo.js"

if [ $? -ne 0 ]; then
    echo "❌ Foundation build failed"
    exit 1
fi

# WASM-native build (advanced web features)
if [ "$ENABLE_NATIVE_BUILD" = "ON" ]; then
    echo "🌐 Building WASM-native cairo.wasm module..."
    
    NATIVE_FLAGS=(
        -O3
        -s WASM=1
        -s MODULARIZE=1
        -s EXPORT_ES6=1
        -s ASYNCIFY=1
        -s FORCE_FILESYSTEM=1
        -s INITIAL_MEMORY=128MB
        -s MAXIMUM_MEMORY=2GB
        -s ALLOW_MEMORY_GROWTH=1
        -lidbfs.js
        --preload-file assets@/assets
        -s ENVIRONMENT=web,webview,worker,node
    )
    
    if [ "$SIMD_ENABLED" = "ON" ]; then
        NATIVE_FLAGS+=("-msimd128")
    fi
    
    # Create assets directory with default resources
    mkdir -p assets/fonts
    mkdir -p assets/patterns
    
    emcc "${NATIVE_FLAGS[@]}" "${FOUNDATION_FLAGS[@]:2}" \
        -I"$INSTALL_DIR/include/cairo" \
        -I"$INSTALL_DIR/include" \
        "$INSTALL_DIR/lib/libcairo.a" \
        "../pixman.wasm/install/lib/libpixman-1.a" \
        "../fontconfig.wasm/install/lib/libfontconfig.a" \
        "../freetype.wasm/build-wasm/install/lib/libfreetype.a" \
        "../libexpat.wasm/install/lib/libexpat.a" \
        "../glib.wasm/install/lib/libglib-2.0.a" \
        "../glib.wasm/install/lib/libgobject-2.0.a" \
        -o "$DIST_DIR/cairo-native.js"
        
    if [ $? -ne 0 ]; then
        echo "❌ WASM-native build failed"
        exit 1
    fi
fi

echo ""
echo "📊 Build Statistics:"
ls -lh "$DIST_DIR/"*.{wasm,js} 2>/dev/null || true

echo ""
echo "✅ Cairo.wasm build completed successfully!"
echo ""
echo "📁 Outputs:"
echo "   Foundation: $DIST_DIR/cairo.{js,wasm}"
if [ "$ENABLE_NATIVE_BUILD" = "ON" ]; then
    echo "   WASM-native: $DIST_DIR/cairo-native.{js,wasm}"
fi
echo ""
echo "🔗 Install directory: $INSTALL_DIR"
echo "📚 Static library: $INSTALL_DIR/lib/libcairo.a"
echo "📄 Headers: $INSTALL_DIR/include/cairo/"