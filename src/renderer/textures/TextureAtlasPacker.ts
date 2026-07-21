/**
 * TextureAtlasPacker — Skyline-based bin packing algorithm for texture atlases.
 *
 * Packs rectangles (images) into a larger rectangle (atlas texture) using
 * a skyline heuristic. Each packed rectangle gets UV coordinates that map
 * from the atlas texture to the original image region.
 *
 * The algorithm maintains a "skyline" — the top edge of occupied space at
 * each x-position. New rectangles are placed at the lowest possible position
 * where they fit without overlapping existing rectangles.
 */

export interface PackedRect {
  /** Original asset ID */
  assetId: string;
  /** Position in the atlas (pixels from top-left) */
  x: number;
  y: number;
  /** Size of the packed rectangle (may be padded) */
  width: number;
  height: number;
  /** Original image dimensions (before padding) */
  originalWidth: number;
  originalHeight: number;
  /** UV coordinates for sampling this rect from the atlas */
  uv: { u0: number; v0: number; u1: number; v1: number };
}

interface SkylineNode {
  x: number;
  width: number;
  y: number;
}

interface PackRequest {
  assetId: string;
  width: number;
  height: number;
}

export interface PackResult {
  /** Packed rectangles with positions and UVs */
  rects: PackedRect[];
  /** Atlas dimensions */
  atlasWidth: number;
  atlasHeight: number;
}

/** Padding between packed rectangles to prevent texture bleeding */
const PADDING = 2;

/** Maximum atlas dimension (power of two) */
const MAX_ATLAS_SIZE = 4096;

/** Minimum images required to trigger atlas packing */
export const ATLAS_MIN_IMAGES = 3;

/** Maximum individual image dimension to consider for atlas packing */
export const ATLAS_MAX_IMAGE_SIZE = 1024;

export class TextureAtlasPacker {
  private skyline: SkylineNode[] = [];
  private packedRects: PackedRect[] = [];
  private atlasWidth = 0;
  private atlasHeight = 0;

  /**
   * Pack a list of image requests into an atlas.
   * Returns packed rectangles with UV coordinates, or null if packing fails.
   */
  pack(requests: PackRequest[]): PackResult | null {
    if (requests.length === 0) return null;

    // Filter to only images that fit within atlas constraints
    const eligible = requests.filter(
      r => r.width <= ATLAS_MAX_IMAGE_SIZE && r.height <= ATLAS_MAX_IMAGE_SIZE
    );

    if (eligible.length < ATLAS_MIN_IMAGES) return null;

    // Sort by height descending (better packing with tallest-first)
    eligible.sort((a, b) => b.height - a.height || b.width - a.width);

    // Estimate initial atlas size based on total area
    const totalArea = eligible.reduce((sum, r) => sum + r.width * r.height, 0);
    const maxDim = Math.max(...eligible.map(r => Math.max(r.width, r.height)));

    // Start with a square that's at least as big as the largest image
    let startSize = Math.ceil(Math.sqrt(totalArea * 1.2)); // 20% padding for waste
    startSize = Math.max(startSize, maxDim + PADDING * 2);
    startSize = Math.min(startSize, MAX_ATLAS_SIZE);

    // Try progressively larger atlas sizes
    const sizes = [startSize];
    if (startSize < 2048) sizes.push(2048);
    if (startSize < 4096) sizes.push(4096);

    for (const size of sizes) {
      const result = this._tryPack(eligible, size, size);
      if (result) return result;
    }

    return null;
  }

  /**
   * Attempt to pack all requests into an atlas of the given dimensions.
   * Returns null if any request fails to fit.
   */
  private _tryPack(requests: PackRequest[], width: number, height: number): PackResult | null {
    this.atlasWidth = width;
    this.atlasHeight = height;
    this.skyline = [{ x: 0, width: width, y: 0 }];
    this.packedRects = [];

    for (const req of requests) {
      const rect = this._placeRect(req);
      if (!rect) return null; // Failed to place
      this.packedRects.push(rect);
    }

    return {
      rects: this.packedRects,
      atlasWidth: this.atlasWidth,
      atlasHeight: this.atlasHeight,
    };
  }

  /**
   * Place a rectangle using the skyline algorithm.
   * Finds the best position (lowest y, then leftmost x) where the rect fits.
   */
  private _placeRect(req: PackRequest): PackedRect | null {
    const w = req.width + PADDING;
    const h = req.height + PADDING;

    let bestIdx = -1;
    let bestY = Infinity;
    let bestX = 0;

    // Find the skyline position with the lowest y where the rect fits
    for (let i = 0; i < this.skyline.length; i++) {
      const y = this._fitRect(i, w, h);
      if (y !== -1 && y < bestY) {
        bestY = y;
        bestIdx = i;
        bestX = this.skyline[i].x;
      }
    }

    if (bestIdx === -1) return null; // No fit found

    // Place the rectangle
    const packedX = bestX;
    const packedY = bestY;

    // Update the skyline
    this._updateSkyline(bestIdx, packedX, packedY, w, h);

    // Compute UV coordinates (normalized 0-1)
    const uv = {
      u0: packedX / this.atlasWidth,
      v0: packedY / this.atlasHeight,
      u1: (packedX + req.width) / this.atlasWidth,
      v1: (packedY + req.height) / this.atlasHeight,
    };

    return {
      assetId: req.assetId,
      x: packedX,
      y: packedY,
      width: req.width,
      height: req.height,
      originalWidth: req.width,
      originalHeight: req.height,
      uv,
    };
  }

  /**
   * Check if a rectangle of width w, height h fits at skyline index i.
   * Returns the y-position where it would be placed, or -1 if it doesn't fit.
   */
  private _fitRect(index: number, w: number, h: number): number {
    const node = this.skyline[index];
    const x = node.x;

    // Check if the rect fits within atlas bounds
    if (x + w > this.atlasWidth) return -1;

    // Check if the rect fits under the skyline at this position
    let y = node.y;
    let widthLeft = w;

    for (let i = index; widthLeft > 0 && i < this.skyline.length; i++) {
      const curr = this.skyline[i];
      if (curr.y > y) {
        y = curr.y;
      }
      if (y + h > this.atlasHeight) return -1; // Exceeds atlas height
      widthLeft -= curr.width;
    }

    return y;
  }

  /**
   * Update the skyline after placing a rectangle at (x, y) with size (w, h).
   */
  private _updateSkyline(index: number, x: number, y: number, w: number, h: number): void {
    const newRight = x + w;
    const newY = y + h;

    // Find the first skyline node that overlaps with the placed rectangle
    let i = index;
    while (i < this.skyline.length && this.skyline[i].x < newRight) {
      i++;
    }

    // Remove overlapping nodes and insert new ones
    const newNode: SkylineNode = { x, width: 0, y: newY };

    // Calculate width for the new node
    if (i > 0 && this.skyline[i - 1].x + this.skyline[i - 1].width >= newRight) {
      // The previous node extends past the right edge
      newNode.width = w;
    } else {
      newNode.width = newRight - this.skyline[i - 1].x;
    }

    // Replace overlapping nodes
    const insertIdx = index;
    const removeEnd = i;

    // Calculate width of the node before the insert point
    if (insertIdx > 0) {
      const prevNode = this.skyline[insertIdx - 1];
      const prevEnd = prevNode.x + prevNode.width;
      if (prevEnd < x) {
        // There's a gap before the insert point
        this.skyline.splice(insertIdx, removeEnd - insertIdx, {
          x: prevEnd,
          width: x - prevEnd,
          y: prevNode.y,
        }, newNode);
      } else {
        this.skyline.splice(insertIdx, removeEnd - insertIdx, newNode);
      }
    } else {
      if (this.skyline[0].x < x) {
        this.skyline.splice(0, removeEnd, {
          x: 0,
          width: x,
          y: this.skyline[0].y,
        }, newNode);
      } else {
        this.skyline.splice(0, removeEnd, newNode);
      }
    }

    // Merge adjacent nodes with same y
    this._mergeSkyline();
  }

  /**
   * Merge adjacent skyline nodes that have the same y value.
   */
  private _mergeSkyline(): void {
    for (let i = this.skyline.length - 2; i >= 0; i--) {
      const curr = this.skyline[i];
      const next = this.skyline[i + 1];
      if (curr.y === next.y && curr.x + curr.width === next.x) {
        curr.width += next.width;
        this.skyline.splice(i + 1, 1);
      }
    }
  }
}

/** Singleton instance */
export const textureAtlasPacker = new TextureAtlasPacker();
