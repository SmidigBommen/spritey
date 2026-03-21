/**
 * Pure pixel buffer transform functions.
 * Each takes (pixels, w, h) and returns { pixels, width, height }.
 * pixels is a Uint8ClampedArray in row-major RGBA layout.
 */

export function rotateCW(pixels, w, h) {
  const dst = new Uint8ClampedArray(w * h * 4);
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const srcIdx = (sy * w + sx) * 4;
      const dstIdx = (sx * h + (h - 1 - sy)) * 4;
      dst[dstIdx]     = pixels[srcIdx];
      dst[dstIdx + 1] = pixels[srcIdx + 1];
      dst[dstIdx + 2] = pixels[srcIdx + 2];
      dst[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return { pixels: dst, width: h, height: w };
}

export function rotateCCW(pixels, w, h) {
  const dst = new Uint8ClampedArray(w * h * 4);
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const srcIdx = (sy * w + sx) * 4;
      const dstIdx = ((w - 1 - sx) * h + sy) * 4;
      dst[dstIdx]     = pixels[srcIdx];
      dst[dstIdx + 1] = pixels[srcIdx + 1];
      dst[dstIdx + 2] = pixels[srcIdx + 2];
      dst[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return { pixels: dst, width: h, height: w };
}

export function flipH(pixels, w, h) {
  const dst = new Uint8ClampedArray(w * h * 4);
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const srcIdx = (sy * w + sx) * 4;
      const dstIdx = (sy * w + (w - 1 - sx)) * 4;
      dst[dstIdx]     = pixels[srcIdx];
      dst[dstIdx + 1] = pixels[srcIdx + 1];
      dst[dstIdx + 2] = pixels[srcIdx + 2];
      dst[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return { pixels: dst, width: w, height: h };
}

export function flipV(pixels, w, h) {
  const dst = new Uint8ClampedArray(w * h * 4);
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const srcIdx = (sy * w + sx) * 4;
      const dstIdx = ((h - 1 - sy) * w + sx) * 4;
      dst[dstIdx]     = pixels[srcIdx];
      dst[dstIdx + 1] = pixels[srcIdx + 1];
      dst[dstIdx + 2] = pixels[srcIdx + 2];
      dst[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return { pixels: dst, width: w, height: h };
}
