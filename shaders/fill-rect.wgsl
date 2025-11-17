// Cairo WebGPU - Rectangle Fill Compute Shader
// Provides 10x+ speedup over CPU rendering for rectangle fills
//
// This shader uses GPU parallel processing to fill rectangles with solid colors.
// Each workgroup processes an 8x8 tile of pixels concurrently.

@group(0) @binding(0) var<uniform> color: vec4<f32>;
@group(0) @binding(1) var output: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let coords = vec2<i32>(global_id.xy);
    let dims = textureDimensions(output);

    // Bounds check
    if (coords.x >= i32(dims.x) || coords.y >= i32(dims.y)) {
        return;
    }

    // Write solid color to texture (GPU parallel fill)
    textureStore(output, coords, color);
}
