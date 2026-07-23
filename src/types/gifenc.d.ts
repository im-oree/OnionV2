declare module 'gifenc' {
  interface GIFEncoderOptions {
    palette?: Uint8Array;
    delay?: number;
    repeat?: number;
    transparent?: boolean;
  }

  interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: GIFEncoderOptions,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  interface QuantizeOptions {
    format?: 'rgb565' | 'rgb888';
  }

  export function GIFEncoder(): GIFEncoderInstance;
  export function quantize(
    data: Uint8Array,
    colors: number,
    options?: QuantizeOptions,
  ): Uint8Array;
  export function applyPalette(
    data: Uint8Array,
    palette: Uint8Array,
    format?: 'rgb565' | 'rgb888',
  ): Uint8Array;
}
