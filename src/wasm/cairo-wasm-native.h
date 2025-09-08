/**
 * WASM-Native Extensions Header for Cairo.wasm
 * 
 * This header defines WASM-native API extensions for enhanced web integration
 * including persistent graphics caching, async resource loading, and streaming rendering.
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1 (same as cairo)
 */

#ifndef CAIRO_WASM_NATIVE_H
#define CAIRO_WASM_NATIVE_H

#include <cairo.h>
#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize WASM-native extensions with virtual file system
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_init_filesystem(void);

/**
 * Set persistent storage availability (called from JavaScript after IDBFS sync)
 * @param available: 1 if persistent storage is available, 0 otherwise
 */
void cairo_native_set_persistent_storage(int available);

/**
 * Load graphics resources from persistent storage
 * 
 * This function implements WASM-native pattern for graphics resource persistence:
 * 1. Check persistent storage (IDBFS) for saved graphics resources
 * 2. Apply cached surfaces, patterns, and font data
 * 3. Enable/disable features based on stored user preferences
 * 
 * @param resource_name: Resource name (e.g., "surfaces", "fonts", "patterns")
 * @param callback: Callback function called when loading completes
 * @param user_data: User data passed to callback
 * 
 * Returns: 1 if loading initiated successfully, 0 on error
 * 
 * Callback signature: void callback(int success, void* user_data)
 * - success: 1 if successful, 0 if failed or defaults used
 * - user_data: User data passed to cairo_native_load_resources
 */
int cairo_native_load_resources(const char* resource_name,
                                 void (*callback)(int success, void* user_data),
                                 void* user_data);

/**
 * Save graphics resources to persistent storage
 * 
 * Saves surfaces, patterns, and rendering preferences that persist
 * across browser sessions using IDBFS integration.
 * 
 * @param resource_name: Resource name to save
 * @param surface_cache_enabled: Enable surface result caching
 * @param pattern_cache_enabled: Enable pattern caching
 * @param font_cache_size: Font cache size for glyph caching
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_save_resources(const char* resource_name,
                                 int surface_cache_enabled,
                                 int pattern_cache_enabled,
                                 size_t font_cache_size);

/**
 * Create custom rendering pipeline with persistent caching
 * 
 * Creates a rendering pipeline that caches intermediate results
 * to persistent storage for improved performance on repeated operations.
 * 
 * @param pipeline_name: Name for the rendering pipeline
 * @param operations: Array of operation types to include
 * @param operation_count: Number of operations in the pipeline
 * @param cache_policy: Caching policy (0=memory, 1=persistent, 2=hybrid)
 * 
 * Returns: Pipeline handle or NULL on failure
 */
typedef struct cairo_native_pipeline cairo_native_pipeline_t;

cairo_native_pipeline_t* cairo_native_create_pipeline(const char* pipeline_name,
                                                       const int* operations,
                                                       size_t operation_count,
                                                       int cache_policy);

/**
 * Execute rendering pipeline with caching
 * 
 * @param pipeline: Pipeline handle
 * @param context: Cairo context for rendering
 * @param input_data: Input data for rendering
 * @param input_count: Number of input elements
 * @param output_surface: Output surface
 * @param progress_callback: Optional progress callback for large operations
 * @param user_data: User data for progress callback
 * 
 * Returns: Number of operations processed, or -1 on error
 */
int cairo_native_execute_pipeline(cairo_native_pipeline_t* pipeline,
                                   cairo_t* context,
                                   const void* input_data,
                                   size_t input_count,
                                   cairo_surface_t* output_surface,
                                   void (*progress_callback)(int percent, void* user_data),
                                   void* user_data);

/**
 * Enable progressive rendering for large graphics operations
 * 
 * Implements streaming rendering for improved performance with large
 * graphics that don't fit in memory:
 * 1. Process graphics in chunks to prevent memory exhaustion
 * 2. Provide progress feedback for user interfaces
 * 3. Allow cancellation of long-running rendering operations
 * 
 * @param enable: 1 to enable progressive processing, 0 to disable
 * @param chunk_size: Size of each processing chunk (0 = automatic)
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_set_progressive_rendering(int enable, size_t chunk_size);

/**
 * Get rendering progress for long-running operations
 * 
 * @param pipeline: Pipeline handle
 * @param total_operations: Pointer to receive total operation count (can be NULL)
 * @param completed_operations: Pointer to receive completed count (can be NULL)
 * @param is_complete: Pointer to receive completion status (can be NULL)
 * 
 * Returns: Progress percentage (0-100)
 */
int cairo_native_get_rendering_progress(cairo_native_pipeline_t* pipeline,
                                        size_t* total_operations,
                                        size_t* completed_operations,
                                        int* is_complete);

/**
 * Get cache statistics
 * 
 * @param entry_count: Pointer to receive number of cached entries (can be NULL)
 * @param total_size: Pointer to receive total cache size in bytes (can be NULL)
 * @param persistent_enabled: Pointer to receive persistent storage status (can be NULL)
 * @param hit_rate: Pointer to receive cache hit rate as percentage (can be NULL)
 */
void cairo_native_get_cache_stats(int* entry_count, size_t* total_size,
                                   int* persistent_enabled, int* hit_rate);

/**
 * Configure cache behavior
 * 
 * @param max_entries: Maximum number of cache entries (0 = unlimited)
 * @param max_size_mb: Maximum cache size in megabytes (0 = unlimited)
 * @param ttl_minutes: Time-to-live in minutes for cache entries (0 = never expire)
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_configure_cache(int max_entries, int max_size_mb, int ttl_minutes);

/**
 * Clear rendering cache
 * 
 * @param clear_persistent: 1 to also clear persistent storage, 0 for memory only
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_clear_cache(int clear_persistent);

/**
 * Enable/disable offline mode
 * 
 * When enabled, only cached surfaces and patterns are used.
 * 
 * @param enable: 1 to enable offline mode, 0 to allow dynamic loading
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_set_offline_mode(int enable);

/**
 * Check if resource is available offline
 * 
 * @param resource_name: Resource name to check
 * 
 * Returns: 1 if available offline, 0 if requires network/initialization
 */
int cairo_native_is_resource_offline(const char* resource_name);

/**
 * Export rendering results to different formats
 * 
 * @param surface: Cairo surface to export from
 * @param format: Export format ("png", "svg", "pdf", "ps")
 * @param output_buffer: Buffer to receive exported data
 * @param buffer_size: Size of output buffer
 * 
 * Returns: Number of bytes written to buffer, or negative on error
 */
int cairo_native_export_surface(cairo_surface_t* surface,
                                 const char* format,
                                 char* output_buffer,
                                 size_t buffer_size);

/**
 * Import surface data from external format
 * 
 * @param format: Import format ("png", "svg")
 * @param input_data: Data to import
 * @param data_size: Size of input data
 * 
 * Returns: Cairo surface or NULL on error
 */
cairo_surface_t* cairo_native_import_surface(const char* format,
                                              const char* input_data,
                                              size_t data_size);

/**
 * Set network timeout for any remote operations
 * 
 * @param timeout_ms: Timeout in milliseconds (default: 30000)
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_set_network_timeout(int timeout_ms);

/**
 * Enable/disable compression for persistent storage
 * 
 * @param enable: 1 to enable compression, 0 to disable
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_set_compression(int enable);

/**
 * Get performance information and statistics
 * 
 * @param pipeline: Pipeline handle (can be NULL for global stats)
 * @param info_type: Type of information requested
 * @param output_buffer: Buffer for output
 * @param buffer_size: Size of output buffer
 * 
 * Info types:
 * - "performance": Performance statistics
 * - "memory": Memory usage information
 * - "cache": Cache efficiency metrics
 * - "simd": SIMD utilization stats
 * - "operations": Operation count and timing
 * - "version": Library version and capabilities
 * 
 * Returns: Length of information string, or -1 on error
 */
int cairo_native_get_info(cairo_native_pipeline_t* pipeline,
                           const char* info_type,
                           char* output_buffer,
                           size_t buffer_size);

/**
 * Create streaming surface for large graphics
 * 
 * Creates a surface that can handle arbitrarily large graphics by streaming
 * data to/from persistent storage as needed.
 * 
 * @param format: Cairo surface format
 * @param width: Width in pixels
 * @param height: Height in pixels
 * @param chunk_width: Chunk width for streaming (0 = automatic)
 * @param chunk_height: Chunk height for streaming (0 = automatic)
 * 
 * Returns: Streaming surface or NULL on error
 */
cairo_surface_t* cairo_native_create_streaming_surface(cairo_format_t format,
                                                        int width,
                                                        int height,
                                                        int chunk_width,
                                                        int chunk_height);

/**
 * Load font from URL with caching
 * 
 * Loads a font from a URL (e.g., Google Fonts) and caches it persistently.
 * 
 * @param font_url: URL to load font from
 * @param font_family: Font family name
 * @param callback: Callback when loading completes
 * @param user_data: User data for callback
 * 
 * Returns: 1 if loading initiated, 0 on error
 */
int cairo_native_load_font_from_url(const char* font_url,
                                     const char* font_family,
                                     void (*callback)(cairo_font_face_t* font_face, void* user_data),
                                     void* user_data);

/**
 * Create pattern from URL (e.g., texture, image)
 * 
 * Loads an image from URL and creates a Cairo pattern with caching.
 * 
 * @param image_url: URL to load image from
 * @param pattern_type: Pattern type (0=surface, 1=linear, 2=radial)
 * @param callback: Callback when loading completes
 * @param user_data: User data for callback
 * 
 * Returns: 1 if loading initiated, 0 on error
 */
int cairo_native_create_pattern_from_url(const char* image_url,
                                          int pattern_type,
                                          void (*callback)(cairo_pattern_t* pattern, void* user_data),
                                          void* user_data);

/**
 * Canvas integration utilities
 */

/**
 * Render Cairo surface to HTML5 Canvas
 * 
 * @param surface: Cairo surface to render
 * @param canvas_id: HTML Canvas element ID
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_render_to_canvas(cairo_surface_t* surface, const char* canvas_id);

/**
 * Create Cairo surface from Canvas ImageData
 * 
 * @param image_data: Canvas ImageData object
 * @param width: Width in pixels
 * @param height: Height in pixels
 * 
 * Returns: Cairo surface or NULL on error
 */
cairo_surface_t* cairo_native_surface_from_imagedata(const uint8_t* image_data,
                                                      int width,
                                                      int height);

/**
 * WebGPU integration (when available)
 */

/**
 * Create Cairo surface backed by WebGPU texture
 * 
 * @param gpu_texture: WebGPU texture handle
 * @param width: Width in pixels
 * @param height: Height in pixels
 * 
 * Returns: Cairo surface or NULL on error
 */
cairo_surface_t* cairo_native_create_webgpu_surface(void* gpu_texture,
                                                     int width,
                                                     int height);

/**
 * Render Cairo operations to WebGPU command buffer
 * 
 * @param context: Cairo context
 * @param command_buffer: WebGPU command buffer
 * 
 * Returns: 1 on success, 0 on failure
 */
int cairo_native_render_to_webgpu(cairo_t* context, void* command_buffer);

/**
 * Validate pipeline integrity
 * 
 * @param pipeline: Pipeline to validate
 * @param validation_level: Validation strictness (1=basic, 2=standard, 3=strict)
 * @param error_buffer: Buffer for error messages (can be NULL)
 * @param error_buffer_size: Size of error buffer
 * 
 * Returns: 1 if valid, 0 if invalid
 */
int cairo_native_validate_pipeline(cairo_native_pipeline_t* pipeline,
                                    int validation_level,
                                    char* error_buffer,
                                    size_t error_buffer_size);

/**
 * Free pipeline resources
 * 
 * @param pipeline: Pipeline to free
 */
void cairo_native_free_pipeline(cairo_native_pipeline_t* pipeline);

#ifdef __cplusplus
}
#endif

#endif // CAIRO_WASM_NATIVE_H