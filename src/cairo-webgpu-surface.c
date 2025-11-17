/* cairo - a vector graphics library with display and print output
 *
 * Copyright © 2024 Discere OS Contributors
 *
 * This library is free software; you can redistribute it and/or
 * modify it either under the terms of the GNU Lesser General Public
 * License version 2.1 as published by the Free Software Foundation
 * (the "LGPL") or, at your option, under the terms of the Mozilla
 * Public License Version 1.1 (the "MPL"). If you do not alter this
 * notice, a recipient may use your version of this file under either
 * the MPL or the LGPL.
 */

#include "cairoint.h"
#include "cairo-webgpu.h"
#include "cairo-error-private.h"
#include "cairo-surface-backend-private.h"
#include "cairo-image-surface-private.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/html5_webgpu.h>
#else
/* Stub definitions for non-Emscripten builds */
typedef void* WGPUDevice;
typedef void* WGPUQueue;
typedef void* WGPUTexture;
typedef void* WGPUTextureView;
typedef void* WGPUComputePipeline;
typedef void* WGPURenderPipeline;
typedef void* WGPUBuffer;
typedef void* WGPUCommandEncoder;
typedef void* WGPUCommandBuffer;
typedef void* WGPUBindGroup;
typedef void* WGPUComputePassEncoder;
typedef void* WGPURenderPassEncoder;
typedef unsigned int WGPUTextureFormat;
typedef unsigned int WGPUBufferUsage;
typedef unsigned int WGPUTextureUsage;
#define WGPUTextureFormat_RGBA8Unorm 0
#define WGPUBufferUsage_CopyDst 0
#define WGPUBufferUsage_MapRead 0
#define WGPUTextureUsage_RenderAttachment 0
#define WGPUTextureUsage_CopySrc 0
#define WGPUTextureUsage_StorageBinding 0
#endif

/* Device structure */
typedef struct _cairo_webgpu_device_private {
    WGPUDevice device;
    WGPUQueue queue;
} cairo_webgpu_device_private_t;

/* Surface structure */
typedef struct _cairo_webgpu_surface {
    cairo_surface_t base;

    cairo_webgpu_device_t *device;
    WGPUTexture texture;
    WGPUTextureView texture_view;

    int width;
    int height;

    /* GPU pipelines (created on demand) */
    WGPUComputePipeline fill_rect_pipeline;
    WGPUComputePipeline composite_pipeline;
    WGPURenderPipeline gradient_pipeline;
} cairo_webgpu_surface_t;

/* Shader sources embedded as strings */
static const char *fill_rect_shader_wgsl =
    "@group(0) @binding(0) var<uniform> color: vec4<f32>;\n"
    "@group(0) @binding(1) var output: texture_storage_2d<rgba8unorm, write>;\n"
    "\n"
    "@compute @workgroup_size(8, 8)\n"
    "fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {\n"
    "    let coords = vec2<i32>(global_id.xy);\n"
    "    let dims = textureDimensions(output);\n"
    "    if (coords.x >= i32(dims.x) || coords.y >= i32(dims.y)) {\n"
    "        return;\n"
    "    }\n"
    "    textureStore(output, coords, color);\n"
    "}\n";

static const char *composite_shader_wgsl =
    "@group(0) @binding(0) var src_texture: texture_2d<f32>;\n"
    "@group(0) @binding(1) var dst_texture: texture_storage_2d<rgba8unorm, read_write>;\n"
    "@group(0) @binding(2) var<uniform> params: CompositeParams;\n"
    "\n"
    "struct CompositeParams {\n"
    "    operator: u32,\n"
    "    alpha: f32,\n"
    "}\n"
    "\n"
    "@compute @workgroup_size(8, 8)\n"
    "fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {\n"
    "    let coords = vec2<i32>(global_id.xy);\n"
    "    let dims = textureDimensions(dst_texture);\n"
    "    if (coords.x >= i32(dims.x) || coords.y >= i32(dims.y)) {\n"
    "        return;\n"
    "    }\n"
    "    let src = textureLoad(src_texture, coords, 0);\n"
    "    let dst = textureLoad(dst_texture, coords);\n"
    "    var result: vec4<f32>;\n"
    "    switch (params.operator) {\n"
    "        case 0u: { result = src + dst * (1.0 - src.a); }\n"
    "        case 1u: { result = src + dst; }\n"
    "        case 2u: { result = src * dst; }\n"
    "        default: { result = src; }\n"
    "    }\n"
    "    result.a *= params.alpha;\n"
    "    textureStore(dst_texture, coords, result);\n"
    "}\n";

/* Forward declarations */
static cairo_status_t
_cairo_webgpu_surface_finish (void *abstract_surface);

static cairo_bool_t
_cairo_webgpu_surface_get_extents (void *abstract_surface,
                                   cairo_rectangle_int_t *extents);

static cairo_status_t
_cairo_webgpu_surface_acquire_source_image (void *abstract_surface,
                                            cairo_image_surface_t **image_out,
                                            void **image_extra);

static void
_cairo_webgpu_surface_release_source_image (void *abstract_surface,
                                            cairo_image_surface_t *image,
                                            void *image_extra);

static cairo_int_status_t
_cairo_webgpu_surface_paint (void *abstract_surface,
                             cairo_operator_t op,
                             const cairo_pattern_t *source,
                             const cairo_clip_t *clip);

static cairo_int_status_t
_cairo_webgpu_surface_fill (void *abstract_surface,
                            cairo_operator_t op,
                            const cairo_pattern_t *source,
                            const cairo_path_fixed_t *path,
                            cairo_fill_rule_t fill_rule,
                            double tolerance,
                            cairo_antialias_t antialias,
                            const cairo_clip_t *clip);

/* Surface backend */
static const cairo_surface_backend_t cairo_webgpu_surface_backend = {
    CAIRO_SURFACE_TYPE_WEBGPU,
    _cairo_webgpu_surface_finish,
    NULL, /* create_context */
    NULL, /* create_similar */
    NULL, /* create_similar_image */
    NULL, /* map_to_image */
    NULL, /* unmap_image */
    NULL, /* source */
    _cairo_webgpu_surface_acquire_source_image,
    _cairo_webgpu_surface_release_source_image,
    NULL, /* snapshot */
    NULL, /* copy_page */
    NULL, /* show_page */
    _cairo_webgpu_surface_get_extents,
    NULL, /* get_font_options */
    NULL, /* flush */
    NULL, /* mark_dirty_rectangle */
    _cairo_webgpu_surface_paint,
    NULL, /* mask */
    NULL, /* stroke */
    _cairo_webgpu_surface_fill,
    NULL, /* fill_stroke */
    NULL, /* show_glyphs */
    NULL, /* has_show_text_glyphs */
    NULL, /* show_text_glyphs */
    NULL, /* get_supported_mime_types */
    NULL, /* tag */
    NULL, /* supports_color_glyph */
    NULL, /* analyze_recording_surface */
    NULL, /* command_id */
};

/* Implementation */

static cairo_status_t
_cairo_webgpu_surface_finish (void *abstract_surface)
{
    cairo_webgpu_surface_t *surface = abstract_surface;

#ifdef __EMSCRIPTEN__
    if (surface->texture_view)
        wgpuTextureViewRelease (surface->texture_view);

    if (surface->texture)
        wgpuTextureRelease (surface->texture);

    if (surface->fill_rect_pipeline)
        wgpuComputePipelineRelease (surface->fill_rect_pipeline);

    if (surface->composite_pipeline)
        wgpuComputePipelineRelease (surface->composite_pipeline);

    if (surface->gradient_pipeline)
        wgpuRenderPipelineRelease (surface->gradient_pipeline);
#endif

    return CAIRO_STATUS_SUCCESS;
}

static cairo_bool_t
_cairo_webgpu_surface_get_extents (void *abstract_surface,
                                   cairo_rectangle_int_t *extents)
{
    cairo_webgpu_surface_t *surface = abstract_surface;

    extents->x = 0;
    extents->y = 0;
    extents->width = surface->width;
    extents->height = surface->height;

    return TRUE;
}

static cairo_status_t
_cairo_webgpu_surface_acquire_source_image (void *abstract_surface,
                                            cairo_image_surface_t **image_out,
                                            void **image_extra)
{
    cairo_webgpu_surface_t *surface = abstract_surface;
    cairo_image_surface_t *image;
    unsigned char *data;
    size_t buffer_size;

    buffer_size = surface->width * surface->height * 4;
    data = _cairo_malloc (buffer_size);
    if (unlikely (data == NULL))
        return _cairo_error (CAIRO_STATUS_NO_MEMORY);

#ifdef __EMSCRIPTEN__
    cairo_webgpu_device_private_t *device =
        (cairo_webgpu_device_private_t*) surface->device;

    /* Create staging buffer for texture readback */
    WGPUBufferDescriptor bufferDesc = {
        .nextInChain = NULL,
        .label = "Cairo WebGPU Staging Buffer",
        .size = buffer_size,
        .usage = WGPUBufferUsage_CopyDst | WGPUBufferUsage_MapRead,
        .mappedAtCreation = false,
    };

    WGPUBuffer staging = wgpuDeviceCreateBuffer (device->device, &bufferDesc);

    /* Copy texture to buffer */
    WGPUCommandEncoder encoder = wgpuDeviceCreateCommandEncoder (device->device, NULL);

    WGPUImageCopyTexture src = {
        .nextInChain = NULL,
        .texture = surface->texture,
        .mipLevel = 0,
        .origin = {0, 0, 0},
        .aspect = 0, /* WGPUTextureAspect_All */
    };

    WGPUImageCopyBuffer dst = {
        .nextInChain = NULL,
        .buffer = staging,
        .layout = {
            .offset = 0,
            .bytesPerRow = surface->width * 4,
            .rowsPerImage = surface->height,
        },
    };

    WGPUExtent3D extent = {surface->width, surface->height, 1};
    wgpuCommandEncoderCopyTextureToBuffer (encoder, &src, &dst, &extent);

    WGPUCommandBuffer commands = wgpuCommandEncoderFinish (encoder, NULL);
    wgpuQueueSubmit (device->queue, 1, &commands);

    /* TODO: Async map buffer and read data - simplified here */
    /* In production, this needs proper async handling with callbacks */
    memset (data, 0, buffer_size); /* Placeholder */

    wgpuBufferRelease (staging);
    wgpuCommandBufferRelease (commands);
    wgpuCommandEncoderRelease (encoder);
#else
    /* Stub for non-Emscripten builds */
    memset (data, 0, buffer_size);
#endif

    image = (cairo_image_surface_t *)
        cairo_image_surface_create_for_data (data,
                                            CAIRO_FORMAT_ARGB32,
                                            surface->width,
                                            surface->height,
                                            surface->width * 4);

    if (unlikely (image->base.status)) {
        free (data);
        return image->base.status;
    }

    *image_out = image;
    *image_extra = data;

    return CAIRO_STATUS_SUCCESS;
}

static void
_cairo_webgpu_surface_release_source_image (void *abstract_surface,
                                            cairo_image_surface_t *image,
                                            void *image_extra)
{
    cairo_surface_destroy (&image->base);
    free (image_extra);
}

static cairo_int_status_t
_cairo_webgpu_surface_paint (void *abstract_surface,
                             cairo_operator_t op,
                             const cairo_pattern_t *source,
                             const cairo_clip_t *clip)
{
    cairo_webgpu_surface_t *surface = abstract_surface;

#ifdef __EMSCRIPTEN__
    cairo_webgpu_device_private_t *device =
        (cairo_webgpu_device_private_t*) surface->device;

    /* For solid color sources, use optimized fill pipeline */
    if (source->type == CAIRO_PATTERN_TYPE_SOLID) {
        const cairo_solid_pattern_t *solid = (const cairo_solid_pattern_t *) source;

        /* TODO: Create and use fill_rect_pipeline for GPU acceleration */
        /* This will provide 10x+ speedup for rectangle fills */

        /* Placeholder - in production this dispatches compute shader */
        (void) solid;
        (void) op;
    }
#endif

    /* Fall back to default implementation for complex patterns */
    return CAIRO_INT_STATUS_UNSUPPORTED;
}

static cairo_int_status_t
_cairo_webgpu_surface_fill (void *abstract_surface,
                            cairo_operator_t op,
                            const cairo_pattern_t *source,
                            const cairo_path_fixed_t *path,
                            cairo_fill_rule_t fill_rule,
                            double tolerance,
                            cairo_antialias_t antialias,
                            const cairo_clip_t *clip)
{
    cairo_webgpu_surface_t *surface = abstract_surface;

#ifdef __EMSCRIPTEN__
    /* TODO: Implement GPU-accelerated path filling */
    /* For rectangle paths, use optimized pipeline */
    /* For complex paths, rasterize and use texture operations */
#endif

    /* Fall back to default implementation */
    return CAIRO_INT_STATUS_UNSUPPORTED;
}

/* Public API Implementation */

cairo_webgpu_device_t*
cairo_webgpu_device_create (void)
{
#ifdef __EMSCRIPTEN__
    cairo_webgpu_device_private_t *device;

    device = _cairo_malloc (sizeof (cairo_webgpu_device_private_t));
    if (unlikely (device == NULL))
        return NULL;

    /* Initialize WebGPU device */
    /* Note: Actual WebGPU initialization requires async adapter/device request */
    /* This is a simplified synchronous version for initial implementation */

    WGPUInstanceDescriptor instanceDesc = {
        .nextInChain = NULL,
    };
    WGPUInstance instance = wgpuCreateInstance (&instanceDesc);

    if (!instance) {
        free (device);
        return NULL;
    }

    /* In production, this needs async adapter request with callbacks */
    /* For now, storing NULL as placeholder */
    device->device = NULL;
    device->queue = NULL;

    return (cairo_webgpu_device_t*) device;
#else
    /* WebGPU not available in non-Emscripten builds */
    return NULL;
#endif
}

void
cairo_webgpu_device_destroy (cairo_webgpu_device_t *abstract_device)
{
    if (abstract_device == NULL)
        return;

#ifdef __EMSCRIPTEN__
    cairo_webgpu_device_private_t *device =
        (cairo_webgpu_device_private_t*) abstract_device;

    if (device->queue)
        wgpuQueueRelease (device->queue);

    if (device->device)
        wgpuDeviceRelease (device->device);
#endif

    free (abstract_device);
}

cairo_surface_t*
cairo_webgpu_surface_create (cairo_webgpu_device_t *abstract_device,
                             int width,
                             int height)
{
    cairo_webgpu_surface_t *surface;

    if (abstract_device == NULL)
        return _cairo_surface_create_in_error (CAIRO_STATUS_NULL_POINTER);

    if (width <= 0 || height <= 0)
        return _cairo_surface_create_in_error (CAIRO_STATUS_INVALID_SIZE);

    surface = _cairo_malloc (sizeof (cairo_webgpu_surface_t));
    if (unlikely (surface == NULL))
        return _cairo_surface_create_in_error (CAIRO_STATUS_NO_MEMORY);

#ifdef __EMSCRIPTEN__
    cairo_webgpu_device_private_t *device =
        (cairo_webgpu_device_private_t*) abstract_device;

    /* Create WebGPU texture */
    WGPUTextureDescriptor texDesc = {
        .nextInChain = NULL,
        .label = "Cairo WebGPU Surface Texture",
        .size = {width, height, 1},
        .format = WGPUTextureFormat_RGBA8Unorm,
        .usage = WGPUTextureUsage_RenderAttachment |
                 WGPUTextureUsage_CopySrc |
                 WGPUTextureUsage_StorageBinding,
        .dimension = 2, /* WGPUTextureDimension_2D */
        .mipLevelCount = 1,
        .sampleCount = 1,
    };

    if (device->device) {
        surface->texture = wgpuDeviceCreateTexture (device->device, &texDesc);

        WGPUTextureViewDescriptor viewDesc = {
            .nextInChain = NULL,
            .label = "Cairo WebGPU Surface Texture View",
            .format = WGPUTextureFormat_RGBA8Unorm,
            .dimension = 2, /* WGPUTextureViewDimension_2D */
            .baseMipLevel = 0,
            .mipLevelCount = 1,
            .baseArrayLayer = 0,
            .arrayLayerCount = 1,
            .aspect = 0, /* WGPUTextureAspect_All */
        };

        surface->texture_view = wgpuTextureCreateView (surface->texture, &viewDesc);
    } else {
        surface->texture = NULL;
        surface->texture_view = NULL;
    }
#else
    surface->texture = NULL;
    surface->texture_view = NULL;
#endif

    surface->device = abstract_device;
    surface->width = width;
    surface->height = height;
    surface->fill_rect_pipeline = NULL;
    surface->composite_pipeline = NULL;
    surface->gradient_pipeline = NULL;

    _cairo_surface_init (&surface->base,
                        &cairo_webgpu_surface_backend,
                        NULL, /* device */
                        CAIRO_CONTENT_COLOR_ALPHA,
                        FALSE); /* is_vector */

    return &surface->base;
}

void*
cairo_webgpu_surface_get_texture (cairo_surface_t *abstract_surface)
{
    cairo_webgpu_surface_t *surface;

    if (abstract_surface == NULL ||
        abstract_surface->backend->type != CAIRO_SURFACE_TYPE_WEBGPU)
        return NULL;

    surface = (cairo_webgpu_surface_t*) abstract_surface;
    return surface->texture;
}
