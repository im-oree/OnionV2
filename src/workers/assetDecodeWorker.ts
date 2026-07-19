/**
 * assetDecodeWorker — decodes image/video frames off the main thread.
 * Uses OffscreenCanvas + createImageBitmap for efficient decoding.
 *
 * Message format:
 *   { id, type: 'asset-decode', payload: { buffer, mimeType } }
 *
 * Response:
 *   { id, type: 'asset-decode', success: true, payload: { bitmap } }
 */

interface DecodeRequest {
  id: string;
  type: 'asset-decode';
  payload: {
    buffer: ArrayBuffer;
    mimeType: string;
  };
}

self.onmessage = async (e: MessageEvent<DecodeRequest>) => {
  const { id, payload } = e.data;
  const { buffer, mimeType } = payload;

  try {
    // Try creating ImageBitmap directly from the buffer
    // If transferables are supported, the buffer won't be copied
    const blob = new Blob([buffer], { type: mimeType });

    // Use createImageBitmap for efficient decoding
    const bitmap = await createImageBitmap(blob, {
      resizeWidth: undefined, // Keep original dimensions
      resizeHeight: undefined,
      resizeQuality: 'high',
    });

    // Transfer the bitmap back (auto-transferred via structured clone)
    self.postMessage(
      {
        id,
        type: 'asset-decode',
        success: true,
        payload: { bitmap },
      },
      // Transfer the buffer back to the main thread to avoid copying
      { transfer: [buffer] } as unknown as StructuredSerializeOptions,
    );
  } catch (err) {
    self.postMessage({
      id,
      type: 'asset-decode',
      success: false,
      error: (err as Error).message,
    });
  }
};
