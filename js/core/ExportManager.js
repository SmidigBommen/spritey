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
