/**
 * Cairo WASM Benchmarks
 */

import CairoWASM from "../src/lib/index.ts"

Deno.bench("cairo initialization", {
  baseline: true
}, async () => {
  const lib = new CairoWASM()
  await lib.initialize()
})
