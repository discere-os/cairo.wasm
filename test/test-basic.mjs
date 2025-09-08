/**
 * Cairo.wasm Basic Tests
 * Tests core 2D graphics operations for WebAssembly implementation
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1 (same as cairo)
 */

import CairoModule from '../dist/cairo.js';

// Test configuration
const EPSILON = 1e-6;
let Module;

function assertApproximatelyEqual(actual, expected, message) {
    if (Math.abs(actual - expected) > EPSILON) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(`${message}: value is null or undefined`);
    }
}

function assertStatus(status, message) {
    if (status !== 0) { // CAIRO_STATUS_SUCCESS = 0
        const statusStr = Module.ccall('cairo_status_to_string', 'string', ['number'], [status]);
        throw new Error(`${message}: Cairo status error: ${statusStr}`);
    }
}

async function initializeModule() {
    console.log('🎨 Initializing cairo.wasm module...');
    Module = await CairoModule();
    console.log('✅ Module initialized');
}

function testBasicSurfaceOperations() {
    console.log('🖼️  Testing basic surface operations...');
    
    // Create image surface
    const width = 256;
    const height = 256;
    const format = 0; // CAIRO_FORMAT_ARGB32
    
    const surface = Module.ccall('cairo_image_surface_create', 'number', 
        ['number', 'number', 'number'], [format, width, height]);
    
    assertNotNull(surface, 'Surface creation');
    
    const status = Module.ccall('cairo_surface_status', 'number', ['number'], [surface]);
    assertStatus(status, 'Surface status');
    
    // Verify surface properties
    const actualWidth = Module.ccall('cairo_image_surface_get_width', 'number', ['number'], [surface]);
    const actualHeight = Module.ccall('cairo_image_surface_get_height', 'number', ['number'], [surface]);
    const actualFormat = Module.ccall('cairo_image_surface_get_format', 'number', ['number'], [surface]);
    
    if (actualWidth !== width) throw new Error(`Width mismatch: expected ${width}, got ${actualWidth}`);
    if (actualHeight !== height) throw new Error(`Height mismatch: expected ${height}, got ${actualHeight}`);
    if (actualFormat !== format) throw new Error(`Format mismatch: expected ${format}, got ${actualFormat}`);
    
    // Cleanup
    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    
    console.log('✅ Surface operations test passed');
}

function testBasicContextOperations() {
    console.log('✏️  Testing basic context operations...');
    
    // Create surface and context
    const surface = Module.ccall('cairo_image_surface_create', 'number', 
        ['number', 'number', 'number'], [0, 100, 100]);
    
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    assertNotNull(ctx, 'Context creation');
    
    let status = Module.ccall('cairo_status', 'number', ['number'], [ctx]);
    assertStatus(status, 'Context status');
    
    // Test basic drawing operations
    Module.ccall('cairo_move_to', 'null', ['number', 'number', 'number'], [ctx, 10.0, 10.0]);
    Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, 90.0, 90.0]);
    Module.ccall('cairo_set_line_width', 'null', ['number', 'number'], [ctx, 2.0]);
    Module.ccall('cairo_stroke', 'null', ['number'], [ctx]);
    
    status = Module.ccall('cairo_status', 'number', ['number'], [ctx]);
    assertStatus(status, 'Drawing operations status');
    
    // Test save/restore
    Module.ccall('cairo_save', 'null', ['number'], [ctx]);
    Module.ccall('cairo_set_line_width', 'null', ['number', 'number'], [ctx, 5.0]);
    const newWidth = Module.ccall('cairo_get_line_width', 'number', ['number'], [ctx]);
    assertApproximatelyEqual(newWidth, 5.0, 'Line width after save');
    
    Module.ccall('cairo_restore', 'null', ['number'], [ctx]);
    const restoredWidth = Module.ccall('cairo_get_line_width', 'number', ['number'], [ctx]);
    assertApproximatelyEqual(restoredWidth, 2.0, 'Line width after restore');
    
    // Cleanup
    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    
    console.log('✅ Context operations test passed');
}

function testTransformationOperations() {
    console.log('🔄 Testing transformation operations...');
    
    const surface = Module.ccall('cairo_image_surface_create', 'number', 
        ['number', 'number', 'number'], [0, 100, 100]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    // Test translation
    Module.ccall('cairo_translate', 'null', ['number', 'number', 'number'], [ctx, 10.0, 20.0]);
    
    // Test scaling
    Module.ccall('cairo_scale', 'null', ['number', 'number', 'number'], [ctx, 2.0, 0.5]);
    
    // Test rotation
    const angle = Math.PI / 4; // 45 degrees
    Module.ccall('cairo_rotate', 'null', ['number', 'number'], [ctx, angle]);
    
    // Get current transformation matrix
    const matrixPtr = Module._malloc(6 * 8); // 6 doubles
    Module.ccall('cairo_get_matrix', 'null', ['number', 'number'], [ctx, matrixPtr]);
    
    // Verify matrix is not identity
    const xx = Module.getValue(matrixPtr, 'double');
    const yy = Module.getValue(matrixPtr + 8, 'double');
    
    if (Math.abs(xx - 1.0) < EPSILON && Math.abs(yy - 1.0) < EPSILON) {
        throw new Error('Transformation matrix appears to be identity (transformations not applied)');
    }
    
    // Test identity reset
    Module.ccall('cairo_identity_matrix', 'null', ['number'], [ctx]);
    Module.ccall('cairo_get_matrix', 'null', ['number', 'number'], [ctx, matrixPtr]);
    
    const newXx = Module.getValue(matrixPtr, 'double');
    const newYy = Module.getValue(matrixPtr + 8, 'double');
    
    assertApproximatelyEqual(newXx, 1.0, 'Matrix XX after identity');
    assertApproximatelyEqual(newYy, 1.0, 'Matrix YY after identity');
    
    Module._free(matrixPtr);
    
    // Cleanup
    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    
    console.log('✅ Transformation operations test passed');
}

function testPathOperations() {
    console.log('🛤️  Testing path operations...');
    
    const surface = Module.ccall('cairo_image_surface_create', 'number', 
        ['number', 'number', 'number'], [0, 100, 100]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    // Create a complex path
    Module.ccall('cairo_new_path', 'null', ['number'], [ctx]);
    Module.ccall('cairo_move_to', 'null', ['number', 'number', 'number'], [ctx, 25.0, 25.0]);
    Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, 75.0, 25.0]);
    Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, 75.0, 75.0]);
    Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, 25.0, 75.0]);
    Module.ccall('cairo_close_path', 'null', ['number'], [ctx]);
    
    // Get path extents
    const x1Ptr = Module._malloc(8);
    const y1Ptr = Module._malloc(8);
    const x2Ptr = Module._malloc(8);
    const y2Ptr = Module._malloc(8);
    
    Module.ccall('cairo_path_extents', 'null', 
        ['number', 'number', 'number', 'number', 'number'], 
        [ctx, x1Ptr, y1Ptr, x2Ptr, y2Ptr]);
    
    const x1 = Module.getValue(x1Ptr, 'double');
    const y1 = Module.getValue(y1Ptr, 'double');
    const x2 = Module.getValue(x2Ptr, 'double');
    const y2 = Module.getValue(y2Ptr, 'double');
    
    assertApproximatelyEqual(x1, 25.0, 'Path extent X1');
    assertApproximatelyEqual(y1, 25.0, 'Path extent Y1');
    assertApproximatelyEqual(x2, 75.0, 'Path extent X2');
    assertApproximatelyEqual(y2, 75.0, 'Path extent Y2');
    
    // Test current point
    const hasCurrentPoint = Module.ccall('cairo_has_current_point', 'number', ['number'], [ctx]);
    if (!hasCurrentPoint) {
        throw new Error('Should have current point after path operations');
    }
    
    const currentXPtr = Module._malloc(8);
    const currentYPtr = Module._malloc(8);
    Module.ccall('cairo_get_current_point', 'null', ['number', 'number', 'number'], [ctx, currentXPtr, currentYPtr]);
    
    const currentX = Module.getValue(currentXPtr, 'double');
    const currentY = Module.getValue(currentYPtr, 'double');
    
    assertApproximatelyEqual(currentX, 25.0, 'Current point X');
    assertApproximatelyEqual(currentY, 25.0, 'Current point Y');
    
    // Cleanup memory
    Module._free(x1Ptr);
    Module._free(y1Ptr);
    Module._free(x2Ptr);
    Module._free(y2Ptr);
    Module._free(currentXPtr);
    Module._free(currentYPtr);
    
    // Cleanup
    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    
    console.log('✅ Path operations test passed');
}

function testPatternOperations() {
    console.log('🎨 Testing pattern operations...');
    
    const surface = Module.ccall('cairo_image_surface_create', 'number', 
        ['number', 'number', 'number'], [0, 100, 100]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    // Test solid color pattern
    const solidPattern = Module.ccall('cairo_pattern_create_rgba', 'number', 
        ['number', 'number', 'number', 'number'], [0.8, 0.2, 0.4, 1.0]);
    
    assertNotNull(solidPattern, 'Solid pattern creation');
    
    let status = Module.ccall('cairo_pattern_status', 'number', ['number'], [solidPattern]);
    assertStatus(status, 'Solid pattern status');
    
    Module.ccall('cairo_set_source', 'null', ['number', 'number'], [ctx, solidPattern]);
    
    // Test linear gradient pattern
    const linearPattern = Module.ccall('cairo_pattern_create_linear', 'number', 
        ['number', 'number', 'number', 'number'], [0.0, 0.0, 100.0, 100.0]);
    
    assertNotNull(linearPattern, 'Linear pattern creation');
    
    status = Module.ccall('cairo_pattern_status', 'number', ['number'], [linearPattern]);
    assertStatus(status, 'Linear pattern status');
    
    Module.ccall('cairo_pattern_add_color_stop_rgba', 'null', 
        ['number', 'number', 'number', 'number', 'number', 'number'], 
        [linearPattern, 0.0, 1.0, 0.0, 0.0, 1.0]);
    Module.ccall('cairo_pattern_add_color_stop_rgba', 'null', 
        ['number', 'number', 'number', 'number', 'number', 'number'], 
        [linearPattern, 1.0, 0.0, 0.0, 1.0, 1.0]);
    
    Module.ccall('cairo_set_source', 'null', ['number', 'number'], [ctx, linearPattern]);
    
    // Test radial gradient pattern
    const radialPattern = Module.ccall('cairo_pattern_create_radial', 'number', 
        ['number', 'number', 'number', 'number', 'number', 'number'], 
        [50.0, 50.0, 0.0, 50.0, 50.0, 25.0]);
    
    assertNotNull(radialPattern, 'Radial pattern creation');
    
    status = Module.ccall('cairo_pattern_status', 'number', ['number'], [radialPattern]);
    assertStatus(status, 'Radial pattern status');
    
    // Cleanup patterns
    Module.ccall('cairo_pattern_destroy', 'null', ['number'], [solidPattern]);
    Module.ccall('cairo_pattern_destroy', 'null', ['number'], [linearPattern]);
    Module.ccall('cairo_pattern_destroy', 'null', ['number'], [radialPattern]);
    
    // Cleanup
    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    
    console.log('✅ Pattern operations test passed');
}

function testPaintOperations() {
    console.log('🖌️  Testing paint operations...');
    
    const surface = Module.ccall('cairo_image_surface_create', 'number', 
        ['number', 'number', 'number'], [0, 100, 100]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    // Set up a simple drawing
    Module.ccall('cairo_set_source_rgba', 'null', 
        ['number', 'number', 'number', 'number', 'number'], 
        [ctx, 0.5, 0.7, 0.2, 1.0]);
    
    // Test paint (fill entire surface)
    Module.ccall('cairo_paint', 'null', ['number'], [ctx]);
    
    let status = Module.ccall('cairo_status', 'number', ['number'], [ctx]);
    assertStatus(status, 'Paint operation status');
    
    // Test paint with alpha
    Module.ccall('cairo_set_source_rgba', 'null', 
        ['number', 'number', 'number', 'number', 'number'], 
        [ctx, 1.0, 0.0, 0.0, 1.0]);
    Module.ccall('cairo_paint_with_alpha', 'null', ['number', 'number'], [ctx, 0.5]);
    
    status = Module.ccall('cairo_status', 'number', ['number'], [ctx]);
    assertStatus(status, 'Paint with alpha status');
    
    // Test rectangle and fill
    Module.ccall('cairo_rectangle', 'null', 
        ['number', 'number', 'number', 'number', 'number'], 
        [ctx, 10.0, 10.0, 30.0, 20.0]);
    Module.ccall('cairo_fill', 'null', ['number'], [ctx]);
    
    status = Module.ccall('cairo_status', 'number', ['number'], [ctx]);
    assertStatus(status, 'Fill operation status');
    
    // Test stroke
    Module.ccall('cairo_rectangle', 'null', 
        ['number', 'number', 'number', 'number', 'number'], 
        [ctx, 60.0, 60.0, 30.0, 20.0]);
    Module.ccall('cairo_set_line_width', 'null', ['number', 'number'], [ctx, 3.0]);
    Module.ccall('cairo_stroke', 'null', ['number'], [ctx]);
    
    status = Module.ccall('cairo_status', 'number', ['number'], [ctx]);
    assertStatus(status, 'Stroke operation status');
    
    // Cleanup
    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    
    console.log('✅ Paint operations test passed');
}

function performanceTest() {
    console.log('⚡ Running performance tests...');
    
    const iterations = 1000;
    
    // Surface creation performance
    console.log(`🔢 Testing ${iterations} surface creations...`);
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const surface = Module.ccall('cairo_image_surface_create', 'number', 
            ['number', 'number', 'number'], [0, 256, 256]);
        Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    }
    const end = performance.now();
    
    const duration = end - start;
    const ops_per_second = iterations / (duration / 1000);
    
    console.log(`⏱️  Duration: ${duration.toFixed(2)}ms`);
    console.log(`🚀 Performance: ${(ops_per_second / 1000).toFixed(1)}K surface operations/second`);
    
    // Drawing operations performance
    console.log(`🖌️  Testing ${iterations} drawing operations...`);
    
    const surface = Module.ccall('cairo_image_surface_create', 'number', 
        ['number', 'number', 'number'], [0, 512, 512]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    const drawStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        Module.ccall('cairo_move_to', 'null', ['number', 'number', 'number'], [ctx, i % 512, (i * 2) % 512]);
        Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, (i + 100) % 512, (i * 3) % 512]);
        Module.ccall('cairo_stroke', 'null', ['number'], [ctx]);
    }
    const drawEnd = performance.now();
    
    const drawDuration = drawEnd - drawStart;
    const draw_ops_per_second = iterations / (drawDuration / 1000);
    
    console.log(`⏱️  Drawing duration: ${drawDuration.toFixed(2)}ms`);
    console.log(`🚀 Drawing performance: ${(draw_ops_per_second / 1000).toFixed(1)}K draw operations/second`);
    
    // Cleanup
    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    
    // Performance should be reasonable
    if (ops_per_second < 1000) {
        console.warn('⚠️  Surface performance may be below expected levels');
    } else {
        console.log('✅ Performance test passed');
    }
}

function memoryTest() {
    console.log('💾 Testing memory management...');
    
    const initialMemory = Module.HEAPU8.length;
    const allocations = [];
    
    // Allocate many surfaces and contexts
    for (let i = 0; i < 100; i++) {
        const surface = Module.ccall('cairo_image_surface_create', 'number', 
            ['number', 'number', 'number'], [0, 128, 128]);
        const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
        allocations.push({ surface, ctx });
    }
    
    // Free all allocations
    for (const { surface, ctx } of allocations) {
        Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
        Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
    }
    
    const finalMemory = Module.HEAPU8.length;
    const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;
    
    console.log(`📊 Memory growth: ${memoryGrowth.toFixed(2)}%`);
    
    if (memoryGrowth > 50) {
        console.warn('⚠️  Significant memory growth detected');
    } else {
        console.log('✅ Memory management test passed');
    }
}

async function runAllTests() {
    try {
        await initializeModule();
        
        console.log('\n🎨 === Cairo.wasm Test Suite ===\n');
        
        testBasicSurfaceOperations();
        testBasicContextOperations();
        testTransformationOperations();
        testPathOperations();
        testPatternOperations();
        testPaintOperations();
        performanceTest();
        memoryTest();
        
        console.log('\n🎉 === All tests passed! ===');
        console.log('📦 cairo.wasm is working correctly');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run tests
runAllTests();