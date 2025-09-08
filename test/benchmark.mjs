/**
 * Cairo.wasm Performance Benchmarks
 * Comprehensive performance testing for 2D graphics operations
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1 (same as cairo)
 */

import CairoModule from '../dist/cairo.js';

let Module;
const ITERATIONS = {
    surface_ops: 10000,
    drawing_ops: 50000,  
    paint_ops: 20000,
    transformation_ops: 100000,
    path_ops: 30000
};

class BenchmarkSuite {
    constructor(module) {
        this.module = module;
        this.results = [];
    }
    
    async benchmark(name, operation, iterations, targetOpsPerSec = null) {
        console.log(`⚡ Benchmarking ${name}...`);
        
        // Warmup
        for (let i = 0; i < Math.min(1000, iterations / 10); i++) {
            await operation();
        }
        
        // Actual benchmark
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            await operation();
        }
        const end = performance.now();
        
        const duration = end - start;
        const opsPerSecond = iterations / (duration / 1000);
        
        const result = {
            name,
            duration: duration.toFixed(2),
            iterations,
            opsPerSecond: Math.round(opsPerSecond),
            opsPerSecondFormatted: (opsPerSecond / 1000).toFixed(1) + 'K',
            target: targetOpsPerSec,
            passed: targetOpsPerSec ? opsPerSecond >= targetOpsPerSec : true
        };
        
        this.results.push(result);
        
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Performance: ${result.opsPerSecondFormatted} ops/second`);
        
        if (targetOpsPerSec) {
            const status = result.passed ? '✅' : '❌';
            console.log(`   Target: ${(targetOpsPerSec / 1000).toFixed(1)}K ops/second ${status}`);
        }
        
        return result;
    }
    
    printSummary() {
        console.log('\n📊 === Performance Summary ===');
        console.log('| Operation | Duration | Ops/Second | Target | Status |');
        console.log('|-----------|----------|------------|--------|--------|');
        
        for (const result of this.results) {
            const status = result.passed ? '✅' : '❌';
            const target = result.target ? (result.target / 1000).toFixed(1) + 'K' : 'N/A';
            console.log(`| ${result.name.padEnd(12)} | ${result.duration.padEnd(8)}ms | ${result.opsPerSecondFormatted.padEnd(10)} | ${target.padEnd(6)} | ${status.padEnd(6)} |`);
        }
        
        const passedTests = this.results.filter(r => r.passed).length;
        const totalTests = this.results.length;
        
        console.log(`\n🎯 Performance Tests: ${passedTests}/${totalTests} passed`);
        
        if (passedTests === totalTests) {
            console.log('🏆 All performance targets met!');
        } else {
            console.log('⚠️  Some performance targets not met - optimization needed');
        }
    }
}

// Surface operation benchmarks
function benchmarkSurfaceOperations(benchmark) {
    return {
        async surfaceCreate() {
            return benchmark.benchmark(
                'Surface Create',
                () => {
                    const surface = Module.ccall('cairo_image_surface_create', 'number',
                        ['number', 'number', 'number'], [0, 256, 256]);
                    Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
                },
                ITERATIONS.surface_ops,
                5000 // Target: 5K ops/second
            );
        },
        
        async contextCreate() {
            const surface = Module.ccall('cairo_image_surface_create', 'number',
                ['number', 'number', 'number'], [0, 256, 256]);
            
            const result = await benchmark.benchmark(
                'Context Create',
                () => {
                    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
                    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
                },
                ITERATIONS.surface_ops,
                8000 // Target: 8K ops/second
            );
            
            Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
            return result;
        },
        
        async surfaceReference() {
            const surface = Module.ccall('cairo_image_surface_create', 'number',
                ['number', 'number', 'number'], [0, 256, 256]);
            
            const result = await benchmark.benchmark(
                'Surface Ref',
                () => {
                    const ref = Module.ccall('cairo_surface_reference', 'number', ['number'], [surface]);
                    Module.ccall('cairo_surface_destroy', 'null', ['number'], [ref]);
                },
                ITERATIONS.surface_ops * 5,
                50000 // Target: 50K ops/second
            );
            
            Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
            return result;
        }
    };
}

// Drawing operation benchmarks
function benchmarkDrawingOperations(benchmark) {
    const surface = Module.ccall('cairo_image_surface_create', 'number',
        ['number', 'number', 'number'], [0, 512, 512]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    return {
        async lineDraw() {
            return benchmark.benchmark(
                'Line Draw',
                () => {
                    const x = Math.random() * 512;
                    const y = Math.random() * 512;
                    Module.ccall('cairo_move_to', 'null', ['number', 'number', 'number'], [ctx, x, y]);
                    Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, x + 50, y + 50]);
                    Module.ccall('cairo_stroke', 'null', ['number'], [ctx]);
                },
                ITERATIONS.drawing_ops,
                15000 // Target: 15K ops/second
            );
        },
        
        async rectangleDraw() {
            return benchmark.benchmark(
                'Rectangle Draw',
                () => {
                    const x = Math.random() * 400;
                    const y = Math.random() * 400;
                    Module.ccall('cairo_rectangle', 'null', 
                        ['number', 'number', 'number', 'number', 'number'],
                        [ctx, x, y, 50, 50]);
                    Module.ccall('cairo_fill', 'null', ['number'], [ctx]);
                },
                ITERATIONS.drawing_ops,
                12000 // Target: 12K ops/second
            );
        },
        
        async arcDraw() {
            return benchmark.benchmark(
                'Arc Draw',
                () => {
                    const x = Math.random() * 512;
                    const y = Math.random() * 512;
                    Module.ccall('cairo_new_sub_path', 'null', ['number'], [ctx]);
                    Module.ccall('cairo_arc', 'null',
                        ['number', 'number', 'number', 'number', 'number', 'number'],
                        [ctx, x, y, 25, 0, 2 * Math.PI]);
                    Module.ccall('cairo_fill', 'null', ['number'], [ctx]);
                },
                ITERATIONS.drawing_ops / 2,
                8000 // Target: 8K ops/second (more expensive)
            );
        },
        
        async curveDraw() {
            return benchmark.benchmark(
                'Curve Draw',
                () => {
                    const x = Math.random() * 400;
                    const y = Math.random() * 400;
                    Module.ccall('cairo_move_to', 'null', ['number', 'number', 'number'], [ctx, x, y]);
                    Module.ccall('cairo_curve_to', 'null',
                        ['number', 'number', 'number', 'number', 'number', 'number', 'number'],
                        [ctx, x + 50, y - 50, x + 100, y + 50, x + 150, y]);
                    Module.ccall('cairo_stroke', 'null', ['number'], [ctx]);
                },
                ITERATIONS.drawing_ops / 2,
                10000 // Target: 10K ops/second
            );
        },
        
        cleanup() {
            Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
            Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
        }
    };
}

// Paint operation benchmarks
function benchmarkPaintOperations(benchmark) {
    const surface = Module.ccall('cairo_image_surface_create', 'number',
        ['number', 'number', 'number'], [0, 256, 256]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    return {
        async paintSolid() {
            return benchmark.benchmark(
                'Paint Solid',
                () => {
                    Module.ccall('cairo_set_source_rgba', 'null',
                        ['number', 'number', 'number', 'number', 'number'],
                        [ctx, Math.random(), Math.random(), Math.random(), 1.0]);
                    Module.ccall('cairo_paint', 'null', ['number'], [ctx]);
                },
                ITERATIONS.paint_ops,
                3000 // Target: 3K ops/second
            );
        },
        
        async paintAlpha() {
            return benchmark.benchmark(
                'Paint Alpha',
                () => {
                    Module.ccall('cairo_set_source_rgba', 'null',
                        ['number', 'number', 'number', 'number', 'number'],
                        [ctx, Math.random(), Math.random(), Math.random(), 1.0]);
                    Module.ccall('cairo_paint_with_alpha', 'null', ['number', 'number'], [ctx, 0.5]);
                },
                ITERATIONS.paint_ops,
                2500 // Target: 2.5K ops/second
            );
        },
        
        async gradientPaint() {
            const pattern = Module.ccall('cairo_pattern_create_linear', 'number',
                ['number', 'number', 'number', 'number'], [0, 0, 256, 256]);
            Module.ccall('cairo_pattern_add_color_stop_rgba', 'null',
                ['number', 'number', 'number', 'number', 'number', 'number'],
                [pattern, 0.0, 1.0, 0.0, 0.0, 1.0]);
            Module.ccall('cairo_pattern_add_color_stop_rgba', 'null',
                ['number', 'number', 'number', 'number', 'number', 'number'],
                [pattern, 1.0, 0.0, 0.0, 1.0, 1.0]);
            
            const result = await benchmark.benchmark(
                'Gradient Paint',
                () => {
                    Module.ccall('cairo_set_source', 'null', ['number', 'number'], [ctx, pattern]);
                    Module.ccall('cairo_paint', 'null', ['number'], [ctx]);
                },
                ITERATIONS.paint_ops / 4,
                1000 // Target: 1K ops/second (expensive)
            );
            
            Module.ccall('cairo_pattern_destroy', 'null', ['number'], [pattern]);
            return result;
        },
        
        cleanup() {
            Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
            Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
        }
    };
}

// Transformation operation benchmarks
function benchmarkTransformationOperations(benchmark) {
    const surface = Module.ccall('cairo_image_surface_create', 'number',
        ['number', 'number', 'number'], [0, 256, 256]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    return {
        async translate() {
            return benchmark.benchmark(
                'Translate',
                () => {
                    Module.ccall('cairo_translate', 'null', ['number', 'number', 'number'], 
                        [ctx, Math.random() * 10 - 5, Math.random() * 10 - 5]);
                },
                ITERATIONS.transformation_ops,
                80000 // Target: 80K ops/second
            );
        },
        
        async scale() {
            return benchmark.benchmark(
                'Scale',
                () => {
                    const scale = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
                    Module.ccall('cairo_scale', 'null', ['number', 'number', 'number'], 
                        [ctx, scale, scale]);
                },
                ITERATIONS.transformation_ops,
                75000 // Target: 75K ops/second
            );
        },
        
        async rotate() {
            return benchmark.benchmark(
                'Rotate',
                () => {
                    const angle = Math.random() * 0.1 - 0.05; // Small rotation
                    Module.ccall('cairo_rotate', 'null', ['number', 'number'], [ctx, angle]);
                },
                ITERATIONS.transformation_ops,
                70000 // Target: 70K ops/second
            );
        },
        
        async saveRestore() {
            return benchmark.benchmark(
                'Save/Restore',
                () => {
                    Module.ccall('cairo_save', 'null', ['number'], [ctx]);
                    Module.ccall('cairo_restore', 'null', ['number'], [ctx]);
                },
                ITERATIONS.transformation_ops,
                60000 // Target: 60K ops/second
            );
        },
        
        cleanup() {
            Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
            Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
        }
    };
}

// Path operation benchmarks
function benchmarkPathOperations(benchmark) {
    const surface = Module.ccall('cairo_image_surface_create', 'number',
        ['number', 'number', 'number'], [0, 512, 512]);
    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
    
    return {
        async pathCreate() {
            return benchmark.benchmark(
                'Path Create',
                () => {
                    Module.ccall('cairo_new_path', 'null', ['number'], [ctx]);
                    Module.ccall('cairo_move_to', 'null', ['number', 'number', 'number'], [ctx, 10, 10]);
                    Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, 100, 10]);
                    Module.ccall('cairo_line_to', 'null', ['number', 'number', 'number'], [ctx, 100, 100]);
                    Module.ccall('cairo_close_path', 'null', ['number'], [ctx]);
                },
                ITERATIONS.path_ops,
                25000 // Target: 25K ops/second
            );
        },
        
        async pathExtents() {
            // Set up a path
            Module.ccall('cairo_new_path', 'null', ['number'], [ctx]);
            Module.ccall('cairo_rectangle', 'null', ['number', 'number', 'number', 'number', 'number'],
                [ctx, 50, 50, 200, 100]);
            
            const x1Ptr = Module._malloc(8);
            const y1Ptr = Module._malloc(8);
            const x2Ptr = Module._malloc(8);
            const y2Ptr = Module._malloc(8);
            
            const result = await benchmark.benchmark(
                'Path Extents',
                () => {
                    Module.ccall('cairo_path_extents', 'null',
                        ['number', 'number', 'number', 'number', 'number'],
                        [ctx, x1Ptr, y1Ptr, x2Ptr, y2Ptr]);
                },
                ITERATIONS.path_ops,
                40000 // Target: 40K ops/second
            );
            
            Module._free(x1Ptr);
            Module._free(y1Ptr);
            Module._free(x2Ptr);
            Module._free(y2Ptr);
            
            return result;
        },
        
        async pathCopy() {
            // Set up a path
            Module.ccall('cairo_new_path', 'null', ['number'], [ctx]);
            Module.ccall('cairo_rectangle', 'null', ['number', 'number', 'number', 'number', 'number'],
                [ctx, 20, 20, 150, 100]);
            
            return benchmark.benchmark(
                'Path Copy',
                () => {
                    const path = Module.ccall('cairo_copy_path', 'number', ['number'], [ctx]);
                    Module.ccall('cairo_path_destroy', 'null', ['number'], [path]);
                },
                ITERATIONS.path_ops / 10,
                2000 // Target: 2K ops/second (expensive)
            );
        },
        
        cleanup() {
            Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
            Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
        }
    };
}

// Memory allocation/deallocation benchmark
function benchmarkMemoryOperations(benchmark) {
    return {
        async memoryAllocationSurface() {
            return benchmark.benchmark(
                'Alloc Surface',
                () => {
                    const s = Module.ccall('cairo_image_surface_create', 'number',
                        ['number', 'number', 'number'], [0, 128, 128]);
                    Module.ccall('cairo_surface_destroy', 'null', ['number'], [s]);
                },
                10000, // Less iterations for allocation tests
                4000 // Target: 4K alloc/free cycles per second
            );
        },
        
        async memoryAllocationContext() {
            const surface = Module.ccall('cairo_image_surface_create', 'number',
                ['number', 'number', 'number'], [0, 128, 128]);
            
            const result = await benchmark.benchmark(
                'Alloc Context',
                () => {
                    const ctx = Module.ccall('cairo_create', 'number', ['number'], [surface]);
                    Module.ccall('cairo_destroy', 'null', ['number'], [ctx]);
                },
                10000,
                6000 // Target: 6K alloc/free cycles per second
            );
            
            Module.ccall('cairo_surface_destroy', 'null', ['number'], [surface]);
            return result;
        },
        
        async memoryAllocationPattern() {
            return benchmark.benchmark(
                'Alloc Pattern',
                () => {
                    const p = Module.ccall('cairo_pattern_create_rgba', 'number',
                        ['number', 'number', 'number', 'number'], [0.5, 0.5, 0.5, 1.0]);
                    Module.ccall('cairo_pattern_destroy', 'null', ['number'], [p]);
                },
                10000,
                8000 // Target: 8K alloc/free cycles per second
            );
        }
    };
}

async function runBenchmarks() {
    console.log('🔧 Initializing cairo.wasm module...');
    Module = await CairoModule();
    console.log('✅ Module initialized\n');
    
    const benchmark = new BenchmarkSuite(Module);
    
    console.log('🏁 === Cairo.wasm Performance Benchmarks ===\n');
    
    // Surface operations
    console.log('📊 Surface Operations:');
    const surfaceOps = benchmarkSurfaceOperations(benchmark);
    await surfaceOps.surfaceCreate();
    await surfaceOps.contextCreate();
    await surfaceOps.surfaceReference();
    
    console.log('\n📊 Drawing Operations:');
    const drawingOps = benchmarkDrawingOperations(benchmark);
    await drawingOps.lineDraw();
    await drawingOps.rectangleDraw();
    await drawingOps.arcDraw();
    await drawingOps.curveDraw();
    drawingOps.cleanup();
    
    console.log('\n📊 Paint Operations:');
    const paintOps = benchmarkPaintOperations(benchmark);
    await paintOps.paintSolid();
    await paintOps.paintAlpha();
    await paintOps.gradientPaint();
    paintOps.cleanup();
    
    console.log('\n📊 Transformation Operations:');
    const transformOps = benchmarkTransformationOperations(benchmark);
    await transformOps.translate();
    await transformOps.scale();
    await transformOps.rotate();
    await transformOps.saveRestore();
    transformOps.cleanup();
    
    console.log('\n📊 Path Operations:');
    const pathOps = benchmarkPathOperations(benchmark);
    await pathOps.pathCreate();
    await pathOps.pathExtents();
    await pathOps.pathCopy();
    pathOps.cleanup();
    
    console.log('\n📊 Memory Operations:');
    const memoryOps = benchmarkMemoryOperations(benchmark);
    await memoryOps.memoryAllocationSurface();
    await memoryOps.memoryAllocationContext();
    await memoryOps.memoryAllocationPattern();
    
    // Print final summary
    benchmark.printSummary();
    
    // Check for SIMD support
    const simdSupported = typeof WebAssembly.SIMD !== 'undefined';
    console.log(`\n🔧 WebAssembly SIMD Support: ${simdSupported ? '✅ Enabled' : '❌ Not Available'}`);
    
    if (!simdSupported) {
        console.log('💡 Performance could be improved with WebAssembly SIMD support');
    }
    
    console.log('\n🏁 Benchmark complete!');
}

runBenchmarks().catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
});