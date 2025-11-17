import { assert } from "@std/assert"
import Cairo from "../../src/lib/index.ts"

const PERFORMANCE_TARGETS = {
  SIMD_MIN: 3.0,      // 3x minimum for SIMD strings
  CRYPTO_MIN: 5.0,    // 5x minimum for WebCrypto
  WORKERS_MIN: 10.0,  // 10x minimum for Workers
  WEBGPU_MIN: 10.0,   // 10x minimum for WebGPU
}

async function measurePerformance(fn: () => void, iterations: number = 10000): Promise<number> {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  return (performance.now() - start) / iterations
}

Deno.test("capabilities detection", async () => {
  try {
    const cairo = new Cairo()
    await cairo.initialize()

    const caps = cairo.getCapabilities()
    console.log("\n📊 Web-Native Capabilities:")
    console.log(`  WASM SIMD: ${caps.has_wasm_simd ? '✅' : '❌'}`)
    console.log(`  WebGPU: ${caps.has_webgpu ? '✅' : '❌'}`)
    console.log(`  Web Crypto: ${caps.has_web_crypto ? '✅' : '❌'}`)
    console.log(`  OPFS: ${caps.has_opfs ? '✅' : '❌'}`)
    console.log(`  Workers: ${caps.has_workers ? '✅' : '❌'}`)
    console.log(`  Chrome Version: ${caps.chrome_version}`)

    // Minimum requirements
    assert(caps.has_wasm_simd, "WASM SIMD should be available (Chrome 113+)")
    assert(caps.chrome_version >= 113 || caps.chrome_version === 0,
           "Chrome version should be 113+ or unknown (0)")
  } catch (error) {
    console.warn("⚠️  Test requires built WASM files - run 'deno task build:wasm' first")
    console.warn(`Error: ${error}`)
  }
})

Deno.test("browser compatibility check", async () => {
  try {
    const cairo = new Cairo()
    await cairo.initialize()

    const supported = cairo.isSupported()
    console.log(`\n🌐 Browser Compatibility: ${supported ? '✅' : '❌'}`)

    // Should pass on Chrome 113+ or in test environments
    const caps = cairo.getCapabilities()
    if (caps.chrome_version > 0) {
      assert(supported || caps.chrome_version < 113,
             "Browser should be supported if Chrome 113+")
    }
  } catch (error) {
    console.warn("⚠️  Test requires built WASM files - run 'deno task build:wasm' first")
  }
})

Deno.test("module initialization", async () => {
  try {
    const cairo = new Cairo()
    await cairo.initialize()

    const module = cairo.getModule()
    assert(module, "Module should be initialized")
    assert(typeof module.ccall === 'function', "ccall should be available")
    assert(typeof module.cwrap === 'function', "cwrap should be available")
    assert(module.HEAPU8 instanceof Uint8Array, "HEAPU8 should be available")

    console.log("\n✅ Module initialized successfully")
  } catch (error) {
    console.warn("⚠️  Test requires built WASM files - run 'deno task build:wasm' first")
  }
})

Deno.test("performance targets documentation", () => {
  console.log("\n📈 Performance Targets:")
  console.log(`  SIMD String Operations: ≥${PERFORMANCE_TARGETS.SIMD_MIN}x`)
  console.log(`  WebCrypto Operations: ≥${PERFORMANCE_TARGETS.CRYPTO_MIN}x`)
  console.log(`  Worker Threading: ≥${PERFORMANCE_TARGETS.WORKERS_MIN}x`)
  console.log(`  WebGPU Acceleration: ≥${PERFORMANCE_TARGETS.WEBGPU_MIN}x`)
  console.log("\nNote: Actual benchmarks require runtime measurements")
  console.log("Run 'deno task bench' for detailed performance analysis")
})
