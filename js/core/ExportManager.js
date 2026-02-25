export class ExportManager {
  /**
   * Render pixel data to an offscreen canvas at given scale.
   * @param {Uint8ClampedArray} pixels - RGBA pixel data
   * @param {number} width - Sprite width
   * @param {number} height - Sprite height
   * @param {number} scale - Integer scale factor
   * @returns {HTMLCanvasElement}
   */
  static renderToCanvas(pixels, width, height, scale = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw 1:1 first, then scale up
    const tmp = document.createElement('canvas');
    tmp.width = width;
    tmp.height = height;
    const tmpCtx = tmp.getContext('2d');
    const imgData = tmpCtx.createImageData(width, height);
    imgData.data.set(pixels);
    tmpCtx.putImageData(imgData, 0, 0);

    ctx.drawImage(tmp, 0, 0, width * scale, height * scale);
    return canvas;
  }

  /**
   * Export flattened pixels as a PNG Blob.
   * @returns {Promise<Blob>}
   */
  static exportPNG(pixels, width, height, scale = 1) {
    const canvas = ExportManager.renderToCanvas(pixels, width, height, scale);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  /**
   * Export visible layers as a horizontal sprite sheet.
   * Each visible layer becomes one frame, laid out left to right.
   * @param {Layer[]} layers - All layers
   * @param {number} width - Sprite width
   * @param {number} height - Sprite height
   * @param {number} scale - Integer scale factor
   * @returns {Promise<Blob>}
   */
  static exportSpriteSheet(layers, width, height, scale = 1) {
    const visibleLayers = layers.filter(l => l.visible);
    if (visibleLayers.length === 0) {
      return ExportManager.exportPNG(new Uint8ClampedArray(width * height * 4), width, height, scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = visibleLayers.length * width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    visibleLayers.forEach((layer, i) => {
      const frame = ExportManager.renderToCanvas(layer.pixels, width, height, scale);
      ctx.drawImage(frame, i * width * scale, 0);
    });

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  /**
   * Export all frames as a horizontal animation sprite sheet PNG.
   * @param {Project} project
   * @param {number} scale
   * @returns {Promise<Blob>}
   */
  static exportAnimationSheet(project, scale = 1) {
    const { width, height, frameCount } = project;
    const canvas = document.createElement('canvas');
    canvas.width = frameCount * width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < frameCount; i++) {
      const pixels = project.flattenFrame(i);
      const frame = ExportManager.renderToCanvas(pixels, width, height, scale);
      ctx.drawImage(frame, i * width * scale, 0);
    }

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  /**
   * Export all frames as an animated GIF.
   * Uses a simple manual GIF encoder (no external library).
   * @param {Project} project
   * @param {number} scale
   * @param {number} fps - Frames per second for GIF timing
   * @returns {Promise<Blob>}
   */
  static async exportGIF(project, scale = 1, fps = 10) {
    const { width, height, frameCount } = project;
    const w = width * scale;
    const h = height * scale;
    const delay = Math.max(1, Math.round(100 / fps)); // GIF delay in centiseconds

    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const pixels = project.flattenFrame(i);
      const canvas = ExportManager.renderToCanvas(pixels, width, height, scale);
      frames.push({ canvas, delay });
    }

    return ExportManager._encodeGIF(frames, w, h);
  }

  /**
   * Encode frames into an animated GIF blob.
   * Minimal GIF89a encoder supporting transparency and animation.
   */
  static _encodeGIF(frames, width, height) {
    const buf = [];

    const writeByte = (b) => buf.push(b & 0xFF);
    const writeShort = (s) => { writeByte(s); writeByte(s >> 8); };
    const writeString = (s) => { for (let i = 0; i < s.length; i++) writeByte(s.charCodeAt(i)); };
    const writeBytes = (arr) => { for (let i = 0; i < arr.length; i++) buf.push(arr[i]); };

    // Header
    writeString('GIF89a');

    // Logical screen descriptor (no global color table)
    writeShort(width);
    writeShort(height);
    writeByte(0x70); // no GCT, 8-bit color resolution
    writeByte(0);    // bg color index
    writeByte(0);    // pixel aspect ratio

    // Netscape extension for looping
    writeByte(0x21); // extension introducer
    writeByte(0xFF); // application extension
    writeByte(11);   // block size
    writeString('NETSCAPE2.0');
    writeByte(3);    // sub-block size
    writeByte(1);    // loop sub-block id
    writeShort(0);   // loop count (0 = forever)
    writeByte(0);    // terminator

    for (const { canvas, delay } of frames) {
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, width, height);
      const rgba = imgData.data;

      // Quantize to <=256 colors using median-cut-like approach
      const { palette, indexed } = ExportManager._quantize(rgba, width * height);
      const hasTransparency = palette.transparent >= 0;
      const colorCount = palette.colors.length;
      // Color table size must be power of 2, min 2
      const tableSize = Math.max(2, 1 << Math.ceil(Math.log2(colorCount)));
      const tableBits = Math.ceil(Math.log2(tableSize));

      // Graphic control extension
      writeByte(0x21); // extension
      writeByte(0xF9); // graphic control
      writeByte(4);    // block size
      writeByte(hasTransparency ? 0x09 : 0x08); // dispose: restore to bg, transparency flag
      writeShort(delay);
      writeByte(hasTransparency ? palette.transparent : 0); // transparent color index
      writeByte(0); // terminator

      // Image descriptor
      writeByte(0x2C);   // image separator
      writeShort(0);     // left
      writeShort(0);     // top
      writeShort(width);
      writeShort(height);
      writeByte(0x80 | (tableBits - 1)); // local color table flag + size

      // Local color table
      for (let i = 0; i < tableSize; i++) {
        if (i < palette.colors.length) {
          writeBytes(palette.colors[i]);
        } else {
          writeByte(0); writeByte(0); writeByte(0);
        }
      }

      // LZW compressed image data
      const minCodeSize = Math.max(2, tableBits);
      const lzwData = ExportManager._lzwEncode(indexed, minCodeSize);
      writeByte(minCodeSize);
      // Write in sub-blocks of max 255 bytes
      for (let off = 0; off < lzwData.length; ) {
        const chunkSize = Math.min(255, lzwData.length - off);
        writeByte(chunkSize);
        for (let j = 0; j < chunkSize; j++) {
          buf.push(lzwData[off + j]);
        }
        off += chunkSize;
      }
      writeByte(0); // block terminator
    }

    // Trailer
    writeByte(0x3B);

    return new Blob([new Uint8Array(buf)], { type: 'image/gif' });
  }

  /**
   * Quantize RGBA data to a max 255-color palette + 1 transparent.
   * Simple popularity-based quantizer (sufficient for pixel art).
   */
  static _quantize(rgba, pixelCount) {
    const colorMap = new Map();
    let hasTransparent = false;

    // Count unique colors
    for (let i = 0; i < pixelCount; i++) {
      const off = i * 4;
      if (rgba[off + 3] < 128) {
        hasTransparent = true;
        continue;
      }
      const key = (rgba[off] << 16) | (rgba[off + 1] << 8) | rgba[off + 2];
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // Sort by frequency, take top 255 (reserve 1 for transparency)
    const maxColors = hasTransparent ? 255 : 256;
    let entries = [...colorMap.entries()];
    if (entries.length > maxColors) {
      entries.sort((a, b) => b[1] - a[1]);
      entries = entries.slice(0, maxColors);
    }

    const palette = { colors: [], transparent: -1 };
    const colorToIndex = new Map();

    // Add transparent slot first if needed
    if (hasTransparent) {
      palette.transparent = 0;
      palette.colors.push([0, 0, 0]);
      // Shift other indices by 1
    }

    for (const [key] of entries) {
      const idx = palette.colors.length;
      palette.colors.push([(key >> 16) & 0xFF, (key >> 8) & 0xFF, key & 0xFF]);
      colorToIndex.set(key, idx);
    }

    // Build indexed array
    const indexed = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      const off = i * 4;
      if (rgba[off + 3] < 128) {
        indexed[i] = palette.transparent >= 0 ? palette.transparent : 0;
        continue;
      }
      const key = (rgba[off] << 16) | (rgba[off + 1] << 8) | rgba[off + 2];
      if (colorToIndex.has(key)) {
        indexed[i] = colorToIndex.get(key);
      } else {
        // Find nearest color (for quantized colors)
        indexed[i] = ExportManager._findNearest(rgba[off], rgba[off + 1], rgba[off + 2], palette.colors, hasTransparent ? 1 : 0);
      }
    }

    return { palette, indexed };
  }

  static _findNearest(r, g, b, colors, startIdx) {
    let best = startIdx;
    let bestDist = Infinity;
    for (let i = startIdx; i < colors.length; i++) {
      const dr = r - colors[i][0];
      const dg = g - colors[i][1];
      const db = b - colors[i][2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  /**
   * LZW encode indexed data for GIF.
   */
  static _lzwEncode(indexed, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const maxCodeLimit = 4096;

    // Initialize code table
    let table = new Map();
    for (let i = 0; i < clearCode; i++) {
      table.set(String.fromCharCode(i), i);
    }

    const output = [];
    let bits = 0;
    let bitCount = 0;

    const emit = (code) => {
      bits |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        output.push(bits & 0xFF);
        bits >>= 8;
        bitCount -= 8;
      }
    };

    emit(clearCode);

    let current = String.fromCharCode(indexed[0]);
    for (let i = 1; i < indexed.length; i++) {
      const ch = String.fromCharCode(indexed[i]);
      const combined = current + ch;
      if (table.has(combined)) {
        current = combined;
      } else {
        emit(table.get(current));
        if (nextCode < maxCodeLimit) {
          table.set(combined, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          // Table full, reset
          emit(clearCode);
          table = new Map();
          for (let j = 0; j < clearCode; j++) {
            table.set(String.fromCharCode(j), j);
          }
          nextCode = eoiCode + 1;
          codeSize = minCodeSize + 1;
        }
        current = ch;
      }
    }

    emit(table.get(current));
    emit(eoiCode);

    // Flush remaining bits
    if (bitCount > 0) {
      output.push(bits & 0xFF);
    }

    return output;
  }

  /**
   * Copy flattened pixels to clipboard as PNG.
   * @returns {Promise<void>}
   */
  static async copyToClipboard(pixels, width, height) {
    const blob = await ExportManager.exportPNG(pixels, width, height, 1);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
  }

  /**
   * Trigger a file download for a Blob.
   * @param {Blob} blob
   * @param {string} filename
   */
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
