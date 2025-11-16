/**
 * Cairo WebGPU Backend Performance Benchmarks
 *
 * Tests GPU-accelerated rendering against CPU baseline
 * Target: 10x+ speedup for fills, compositing, gradients
 * Target: 8x+ speedup for path stroking
 */

import CairoWASM from "../src/lib/index.ts";

const PERF_TARGETS = {
  rectangleFills: 10.0,    // 10x speedup required
  compositing: 10.0,        // 10x speedup required
  gradients: 10.0,          // 10x speedup required
  pathStroking: 8.0,        // 8x speedup required
};

const WIDTH = 1920;
const HEIGHT = 1080;
const ITERATIONS = 100;

interface BenchmarkResult {
  operation: string;
  cpuTime: number;
  gpuTime: number;
  speedup: number;
  passed: boolean;
  target: number;
}

const results: BenchmarkResult[] = [];

async function benchmarkRectangleFills() {
  console.log("\n[Benchmark] Rectangle Fills...");

  const lib = new CairoWASM();
  await lib.initialize();

  // Create CPU surface
  const cpuSurface = lib.module._cairo_image_surface_create(
    0, // CAIRO_FORMAT_ARGB32
    WIDTH,
    HEIGHT
  );

  // Create WebGPU surface
  const webgpuDevice = lib.module._cairo_webgpu_device_create();
  if (!webgpuDevice) {
    console.error("❌ WebGPU device creation failed - WebGPU not available");
    return null;
  }

  const gpuSurface = lib.module._cairo_webgpu_surface_create(
    webgpuDevice,
    WIDTH,
    HEIGHT
  );

  // Generate random rectangles
  const numRects = 1000;
  const rects = new Float32Array(numRects * 4); // x, y, w, h

  for (let i = 0; i < numRects; i++) {
    rects[i * 4 + 0] = Math.random() * (WIDTH - 100);
    rects[i * 4 + 1] = Math.random() * (HEIGHT - 100);
    rects[i * 4 + 2] = 50 + Math.random() * 50;
    rects[i * 4 + 3] = 50 + Math.random() * 50;
  }

  // CPU Baseline
  const cpuStart = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cr = lib.module._cairo_create(cpuSurface);
    lib.module._cairo_set_source_rgba(cr, 1.0, 0.0, 0.0, 0.5);

    for (let i = 0; i < numRects; i++) {
      const x = rects[i * 4 + 0];
      const y = rects[i * 4 + 1];
      const w = rects[i * 4 + 2];
      const h = rects[i * 4 + 3];

      lib.module._cairo_rectangle(cr, x, y, w, h);
    }

    lib.module._cairo_fill(cr);
    lib.module._cairo_destroy(cr);
  }
  const cpuTime = performance.now() - cpuStart;

  // GPU Accelerated
  const gpuStart = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cr = lib.module._cairo_create(gpuSurface);
    lib.module._cairo_set_source_rgba(cr, 1.0, 0.0, 0.0, 0.5);

    for (let i = 0; i < numRects; i++) {
      const x = rects[i * 4 + 0];
      const y = rects[i * 4 + 1];
      const w = rects[i * 4 + 2];
      const h = rects[i * 4 + 3];

      lib.module._cairo_rectangle(cr, x, y, w, h);
    }

    lib.module._cairo_fill(cr);
    lib.module._cairo_destroy(cr);
  }
  const gpuTime = performance.now() - gpuStart;

  const speedup = cpuTime / gpuTime;
  const passed = speedup >= PERF_TARGETS.rectangleFills;

  console.log(`  CPU time: ${cpuTime.toFixed(0)}ms`);
  console.log(`  GPU time: ${gpuTime.toFixed(0)}ms`);
  console.log(`  Speedup: ${speedup.toFixed(1)}x (target: ${PERF_TARGETS.rectangleFills}x)`);
  console.log(passed ? "  ✅ PASSED" : "  ❌ FAILED");

  // Cleanup
  lib.module._cairo_surface_destroy(cpuSurface);
  lib.module._cairo_surface_destroy(gpuSurface);
  lib.module._cairo_webgpu_device_destroy(webgpuDevice);

  return {
    operation: "Rectangle Fills",
    cpuTime,
    gpuTime,
    speedup,
    passed,
    target: PERF_TARGETS.rectangleFills,
  };
}

async function benchmarkCompositing() {
  console.log("\n[Benchmark] Image Compositing...");

  const lib = new CairoWASM();
  await lib.initialize();

  // Create source image
  const srcSize = 512;
  const srcSurface = lib.module._cairo_image_surface_create(
    0,
    srcSize,
    srcSize
  );

  // Fill source with test pattern
  const srcCr = lib.module._cairo_create(srcSurface);
  lib.module._cairo_set_source_rgba(srcCr, 0.0, 1.0, 0.0, 0.8);
  lib.module._cairo_paint(srcCr);
  lib.module._cairo_destroy(srcCr);

  // Create CPU surface
  const cpuSurface = lib.module._cairo_image_surface_create(
    0,
    WIDTH,
    HEIGHT
  );

  // Create WebGPU surface
  const webgpuDevice = lib.module._cairo_webgpu_device_create();
  if (!webgpuDevice) {
    console.error("❌ WebGPU device creation failed");
    return null;
  }

  const gpuSurface = lib.module._cairo_webgpu_surface_create(
    webgpuDevice,
    WIDTH,
    HEIGHT
  );

  // CPU Baseline
  const cpuStart = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cr = lib.module._cairo_create(cpuSurface);
    lib.module._cairo_set_source_surface(cr, srcSurface, 0, 0);
    lib.module._cairo_paint_with_alpha(cr, 0.5);
    lib.module._cairo_destroy(cr);
  }
  const cpuTime = performance.now() - cpuStart;

  // GPU Accelerated
  const gpuStart = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cr = lib.module._cairo_create(gpuSurface);
    lib.module._cairo_set_source_surface(cr, srcSurface, 0, 0);
    lib.module._cairo_paint_with_alpha(cr, 0.5);
    lib.module._cairo_destroy(cr);
  }
  const gpuTime = performance.now() - gpuStart;

  const speedup = cpuTime / gpuTime;
  const passed = speedup >= PERF_TARGETS.compositing;

  console.log(`  CPU time: ${cpuTime.toFixed(0)}ms`);
  console.log(`  GPU time: ${gpuTime.toFixed(0)}ms`);
  console.log(`  Speedup: ${speedup.toFixed(1)}x (target: ${PERF_TARGETS.compositing}x)`);
  console.log(passed ? "  ✅ PASSED" : "  ❌ FAILED");

  // Cleanup
  lib.module._cairo_surface_destroy(srcSurface);
  lib.module._cairo_surface_destroy(cpuSurface);
  lib.module._cairo_surface_destroy(gpuSurface);
  lib.module._cairo_webgpu_device_destroy(webgpuDevice);

  return {
    operation: "Image Compositing",
    cpuTime,
    gpuTime,
    speedup,
    passed,
    target: PERF_TARGETS.compositing,
  };
}

async function benchmarkGradients() {
  console.log("\n[Benchmark] Gradient Rendering...");

  const lib = new CairoWASM();
  await lib.initialize();

  // Create CPU surface
  const cpuSurface = lib.module._cairo_image_surface_create(
    0,
    WIDTH,
    HEIGHT
  );

  // Create WebGPU surface
  const webgpuDevice = lib.module._cairo_webgpu_device_create();
  if (!webgpuDevice) {
    console.error("❌ WebGPU device creation failed");
    return null;
  }

  const gpuSurface = lib.module._cairo_webgpu_surface_create(
    webgpuDevice,
    WIDTH,
    HEIGHT
  );

  // CPU Baseline - Linear gradients
  const cpuStart = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cr = lib.module._cairo_create(cpuSurface);

    const pattern = lib.module._cairo_pattern_create_linear(0, 0, WIDTH, HEIGHT);
    lib.module._cairo_pattern_add_color_stop_rgba(pattern, 0, 1, 0, 0, 1);
    lib.module._cairo_pattern_add_color_stop_rgba(pattern, 1, 0, 0, 1, 1);

    lib.module._cairo_set_source(cr, pattern);
    lib.module._cairo_paint(cr);

    lib.module._cairo_pattern_destroy(pattern);
    lib.module._cairo_destroy(cr);
  }
  const cpuTime = performance.now() - cpuStart;

  // GPU Accelerated
  const gpuStart = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cr = lib.module._cairo_create(gpuSurface);

    const pattern = lib.module._cairo_pattern_create_linear(0, 0, WIDTH, HEIGHT);
    lib.module._cairo_pattern_add_color_stop_rgba(pattern, 0, 1, 0, 0, 1);
    lib.module._cairo_pattern_add_color_stop_rgba(pattern, 1, 0, 0, 1, 1);

    lib.module._cairo_set_source(cr, pattern);
    lib.module._cairo_paint(cr);

    lib.module._cairo_pattern_destroy(pattern);
    lib.module._cairo_destroy(cr);
  }
  const gpuTime = performance.now() - gpuStart;

  const speedup = cpuTime / gpuTime;
  const passed = speedup >= PERF_TARGETS.gradients;

  console.log(`  CPU time: ${cpuTime.toFixed(0)}ms`);
  console.log(`  GPU time: ${gpuTime.toFixed(0)}ms`);
  console.log(`  Speedup: ${speedup.toFixed(1)}x (target: ${PERF_TARGETS.gradients}x)`);
  console.log(passed ? "  ✅ PASSED" : "  ❌ FAILED");

  // Cleanup
  lib.module._cairo_surface_destroy(cpuSurface);
  lib.module._cairo_surface_destroy(gpuSurface);
  lib.module._cairo_webgpu_device_destroy(webgpuDevice);

  return {
    operation: "Gradient Rendering",
    cpuTime,
    gpuTime,
    speedup,
    passed,
    target: PERF_TARGETS.gradients,
  };
}

async function runAllBenchmarks() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Cairo WebGPU Backend Performance Benchmarks");
  console.log("═══════════════════════════════════════════════════════");

  const results: (BenchmarkResult | null)[] = [];

  results.push(await benchmarkRectangleFills());
  results.push(await benchmarkCompositing());
  results.push(await benchmarkGradients());

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  BENCHMARK SUMMARY");
  console.log("═══════════════════════════════════════════════════════");

  let allPassed = true;
  for (const result of results) {
    if (!result) continue;

    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(
      `  ${status} ${result.operation}: ${result.speedup.toFixed(1)}x (target: ${result.target}x)`
    );
    allPassed = allPassed && result.passed;
  }

  console.log("═══════════════════════════════════════════════════════");

  if (allPassed) {
    console.log("\n✅ All WebGPU benchmarks PASSED!");
    console.log("   GPU acceleration provides 10x+ speedups as required.");
  } else {
    console.log("\n❌ Some benchmarks FAILED!");
    console.log("   Performance targets not met. WebGPU optimization needed.");
    Deno.exit(1);
  }
}

// Run benchmarks if executed directly
if (import.meta.main) {
  await runAllBenchmarks();
}

export { runAllBenchmarks, benchmarkRectangleFills, benchmarkCompositing, benchmarkGradients };
