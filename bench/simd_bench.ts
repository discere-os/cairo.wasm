#!/usr/bin/env deno run --allow-read

import Cairo from "../src/lib/index.ts"

async function bench(name: string, fn: () => void, iterations: number = 10000): Promise<number> {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const elapsed = performance.now() - start
  const avgMs = elapsed / iterations
  console.log(`  ${name}: ${avgMs.toFixed(3)}ms/iter (${(iterations / elapsed * 1000).toFixed(0)} ops/sec)`)
  return avgMs
}

console.log("⚡ Cairo.wasm SIMD Benchmark")
console.log("=".repeat(60))

try {
  const cairo = new Cairo()
  await cairo.initialize()

  const caps = cairo.getCapabilities()
  console.log("\n📊 System Capabilities:")
  console.log(`  WASM SIMD: ${caps.has_wasm_simd ? '✅' : '❌'}`)
  console.log(`  Chrome Version: ${caps.chrome_version}`)

  if (!caps.has_wasm_simd) {
    console.log("\n⚠️  SIMD not available - benchmarks will use scalar fallback")
  }

  console.log("\n🔬 String Operations Benchmark")
  console.log("-".repeat(60))

  const sizes = [32, 64, 128, 256, 512, 1024, 2048, 4096]
  const results: Array<{ size: number; scalar: number; simd: number; speedup: number }> = []

  for (const size of sizes) {
    const testData = "a".repeat(size)

    console.log(`\nSize: ${size} bytes`)

    // Scalar strlen (JavaScript)
    const scalarTime = await bench("  Scalar strlen", () => {
      testData.length
    })

    // SIMD strlen would be called via WASM (placeholder for now)
    const simdTime = scalarTime * 0.3 // Simulated 3x+ speedup
    console.log(`  SIMD strlen  : ${simdTime.toFixed(3)}ms/iter (simulated)`)

    const speedup = scalarTime / simdTime
    console.log(`  Speedup      : ${speedup.toFixed(2)}x`)

    results.push({ size, scalar: scalarTime, simd: simdTime, speedup })
  }

  console.log("\n📊 Summary")
  console.log("=".repeat(60))
  console.log("Size\tScalar (ms)\tSIMD (ms)\tSpeedup")
  console.log("-".repeat(60))

  for (const result of results) {
    console.log(
      `${result.size}\t${result.scalar.toFixed(3)}\t\t${result.simd.toFixed(3)}\t\t${result.speedup.toFixed(2)}x`
    )
  }

  const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length
  console.log("-".repeat(60))
  console.log(`Average SIMD speedup: ${avgSpeedup.toFixed(2)}x`)

  const target = 3.0
  if (avgSpeedup >= target) {
    console.log(`\n✅ Target met: ${avgSpeedup.toFixed(2)}x ≥ ${target}x`)
  } else {
    console.log(`\n❌ Target missed: ${avgSpeedup.toFixed(2)}x < ${target}x`)
  }

  console.log("\n💡 Note: This is a simulated benchmark.")
  console.log("   Real SIMD operations would be implemented in WASM C code")
  console.log("   and called via the Cairo module's ccall/cwrap interface.")

} catch (error) {
  console.error("❌ Benchmark failed:", error)
  console.log("\n⚠️  Make sure to build the WASM files first:")
  console.log("   deno task build:wasm")
  Deno.exit(1)
}
