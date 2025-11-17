/**
 * Type definitions for Cairo WASM
 */

export interface CairoModule {
  ccall: (funcName: string, returnType: string, argTypes: string[], args: any[]) => any
  cwrap: (funcName: string, returnType: string, argTypes: string[]) => Function
  FS: any
  HEAPU8: Uint8Array
  _malloc: (size: number) => number
  _free: (ptr: number) => void
  setValue: (ptr: number, value: number, type: string) => void
  getValue: (ptr: number, type: string) => number
}

export interface WebCapabilities {
  has_wasm_simd: boolean
  has_webgpu: boolean
  has_shared_array_buffer: boolean
  has_web_crypto: boolean
  has_opfs: boolean
  has_workers: boolean
  chrome_version: number
}

export interface CairoConfig {
  /** Enable SIMD optimizations (3-5x speedup) */
  enableSIMD?: boolean
  /** Enable WebGPU acceleration (10x+ speedup) */
  enableWebGPU?: boolean
  /** Initial memory size in bytes */
  initialMemory?: number
  /** Maximum memory size in bytes */
  maximumMemory?: number
}

export interface PerformanceMetrics {
  /** SIMD speedup multiplier (target: 3-5x) */
  simdSpeedup: number
  /** WebGPU speedup multiplier (target: 10x+) */
  webgpuSpeedup: number
  /** Workers speedup multiplier (target: 10x) */
  workersSpeedup: number
  /** Crypto speedup multiplier (target: 5-15x) */
  cryptoSpeedup: number
}

export class CairoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CairoError'
  }
}
