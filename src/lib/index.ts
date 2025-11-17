/**
 * @module @discere-os/cairo.wasm
 *
 * WASM library with web-native optimizations for Discere OS.
 *
 * Features:
 * - 3-10x Performance: Mandatory web-native optimizations
 * - Dual build: SIDE_MODULE (production) + MAIN_MODULE (testing)
 * - Deno-first with NPM compatibility
 * - Browser target: Chrome/Edge 113+ (WebGPU+SIMD mandatory)
 */

import type { CairoModule, WebCapabilities, CairoConfig, PerformanceMetrics } from './types.ts'

export type { CairoModule, WebCapabilities, CairoConfig, PerformanceMetrics }
export { CairoError } from './types.ts'

export default class Cairo {
  private module: CairoModule | null = null
  private initialized = false

  /**
   * Initialize the WASM library
   */
  async initialize(config?: CairoConfig): Promise<void> {
    if (this.initialized) return

    try {
      const factory = await this.loadModuleFactory()
      const wasm = await this.loadWasmBinary()
      this.module = await factory({ wasmBinary: wasm })
      this.initialized = true
    } catch (error) {
      throw new Error(`Failed to initialize cairo.wasm: ${error}`)
    }
  }

  /**
   * Get web-native capabilities
   */
  getCapabilities(): WebCapabilities {
    this.ensureInitialized()
    const ptr = this.module!.ccall('web_get_capabilities', 'number', [], [])

    // Read capabilities struct from WASM memory (struct is 28 bytes)
    const view = new DataView(this.module!.HEAPU8.buffer, ptr, 28)

    return {
      has_wasm_simd: view.getUint8(0) === 1,
      has_webgpu: view.getUint8(1) === 1,
      has_shared_array_buffer: view.getUint8(2) === 1,
      has_web_crypto: view.getUint8(3) === 1,
      has_opfs: view.getUint8(4) === 1,
      has_workers: view.getUint8(5) === 1,
      chrome_version: view.getInt32(8, true), // Skip padding byte at offset 6-7
    }
  }

  /**
   * Check browser compatibility
   */
  isSupported(): boolean {
    const caps = this.getCapabilities()
    return caps.has_wasm_simd && caps.chrome_version >= 113
  }

  /**
   * Get the underlying WASM module
   */
  getModule(): CairoModule {
    this.ensureInitialized()
    return this.module!
  }

  private async loadModuleFactory() {
    const modulePath = new URL('./../../install/wasm/cairo-main.js', import.meta.url)
    const module = await import(modulePath.href)
    return module.default || module
  }

  private async loadWasmBinary(): Promise<ArrayBuffer> {
    if (typeof Deno !== 'undefined') {
      const wasmPath = './install/wasm/cairo-main.wasm'
      const buffer = await Deno.readFile(wasmPath)
      return buffer.buffer
    }
    throw new Error('WASM loading only supported in Deno environment')
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.module) {
      throw new Error('Cairo not initialized. Call initialize() first.')
    }
  }
}
