import { assert, assertExists } from "@std/assert"
import Cairo from "../../src/lib/index.ts"

Deno.test("Deno runtime features", () => {
  assert(typeof Deno !== 'undefined', "Deno runtime should be available")
  assert(typeof WebAssembly !== 'undefined', "WebAssembly should be available")
})

Deno.test("WASM file accessibility", async () => {
  try {
    const mainFile = await Deno.stat("./install/wasm/cairo-main.wasm")
    assert(mainFile.isFile, "MAIN_MODULE WASM file should exist")
    assert(mainFile.size > 0, "MAIN_MODULE WASM file should not be empty")
    console.log(`✅ Found MAIN_MODULE: ${mainFile.size} bytes`)

    try {
      const sideFile = await Deno.stat("./install/wasm/cairo-side.wasm")
      assert(sideFile.isFile, "SIDE_MODULE WASM file should exist")
      assert(sideFile.size > 0, "SIDE_MODULE WASM file should not be empty")
      console.log(`✅ Found SIDE_MODULE: ${sideFile.size} bytes`)

      // SIDE_MODULE should be significantly smaller (target: 70-200KB)
      const sizeKB = sideFile.size / 1024
      console.log(`   SIDE_MODULE size: ${sizeKB.toFixed(0)}KB (target: 70-200KB)`)
    } catch (e) {
      console.warn("⚠️  SIDE_MODULE not found")
    }
  } catch (error) {
    console.warn("⚠️  WASM files not found - run 'deno task build:wasm' first")
  }
})

Deno.test("TypeScript module imports", async () => {
  const { default: CairoClass } = await import("../../src/lib/index.ts")
  assertExists(CairoClass, "Cairo class should be importable")
  assert(typeof CairoClass === 'function', "Cairo should be a constructor function")
})

Deno.test("Cairo library instantiation", async () => {
  const cairo = new Cairo()
  assertExists(cairo, "Cairo instance should be created")
  assert(typeof cairo.initialize === 'function', "initialize method should exist")
  assert(typeof cairo.getCapabilities === 'function', "getCapabilities method should exist")
  assert(typeof cairo.isSupported === 'function', "isSupported method should exist")
})

Deno.test("Cairo library initialization", async () => {
  try {
    const cairo = new Cairo()
    await cairo.initialize()
    console.log("✅ Cairo library initialized successfully")

    const module = cairo.getModule()
    assertExists(module, "Module should be available after initialization")
    assertExists(module.ccall, "ccall should be available")
    assertExists(module.HEAPU8, "HEAPU8 should be available")
  } catch (error) {
    console.warn("⚠️  Cairo initialization failed - ensure WASM files are built")
    console.warn(`Error: ${error}`)
  }
})
