import { eventBus } from './EventBus.js';
import { Layer } from './Layer.js';

export class Project {
  constructor(width = 16, height = 16, name = 'Untitled') {
    this.name = name;
    this._width = width;
    this._height = height;
    this.frames = [{ layers: [new Layer(width, height, 'Layer 1')], duration: 100 }];
    this.activeFrameIndex = 0;
    this.activeLayerIndex = 0;
  }

  get width() { return this._width; }
  get height() { return this._height; }

  get layers() { return this.frames[this.activeFrameIndex].layers; }
  set layers(val) { this.frames[this.activeFrameIndex].layers = val; }

  get activeLayer() {
    return this.layers[this.activeLayerIndex];
  }

  get pixels() {
    return this.activeLayer.pixels;
  }

  get frameCount() { return this.frames.length; }

  getPixel(x, y) {
    return this.activeLayer.getPixel(x, y);
  }

  setPixel(x, y, r, g, b, a = 255) {
    this.activeLayer.setPixel(x, y, r, g, b, a);
  }

  /** Composite all visible layers of a specific frame into a flat Uint8ClampedArray. */
  flattenFrame(frameIndex) {
    if (frameIndex < 0 || frameIndex >= this.frames.length) return null;
    const layers = this.frames[frameIndex].layers;
    const total = this._width * this._height * 4;
    const result = new Uint8ClampedArray(total);

    for (const layer of layers) {
      if (!layer.visible) continue;
      const src = layer.pixels;
      const alpha = layer.opacity;
      for (let i = 0; i < total; i += 4) {
        const sa = (src[i + 3] / 255) * alpha;
        if (sa === 0) continue;
        const da = result[i + 3] / 255;
        const outA = sa + da * (1 - sa);
        if (outA === 0) continue;
        result[i]     = (src[i]     * sa + result[i]     * da * (1 - sa)) / outA;
        result[i + 1] = (src[i + 1] * sa + result[i + 1] * da * (1 - sa)) / outA;
        result[i + 2] = (src[i + 2] * sa + result[i + 2] * da * (1 - sa)) / outA;
        result[i + 3] = outA * 255;
      }
    }
    return result;
  }

  /** Composite all visible layers of the active frame. */
  flattenPixels() {
    return this.flattenFrame(this.activeFrameIndex);
  }

  // ── Frame methods ──

  addFrame() {
    const frame = { layers: [new Layer(this._width, this._height, 'Layer 1')], duration: 100 };
    this.frames.splice(this.activeFrameIndex + 1, 0, frame);
    this.activeFrameIndex++;
    this.activeLayerIndex = 0;
    eventBus.emit('frame:switched', this.activeFrameIndex);
    eventBus.emit('frames:changed');
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  duplicateFrame(index) {
    if (index < 0 || index >= this.frames.length) return;
    const src = this.frames[index];
    const frame = {
      layers: src.layers.map(l => l.clone()),
      duration: src.duration,
    };
    this.frames.splice(index + 1, 0, frame);
    this.activeFrameIndex = index + 1;
    this.activeLayerIndex = Math.min(this.activeLayerIndex, frame.layers.length - 1);
    eventBus.emit('frame:switched', this.activeFrameIndex);
    eventBus.emit('frames:changed');
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  deleteFrame(index) {
    if (this.frames.length <= 1) return;
    if (index < 0 || index >= this.frames.length) return;
    this.frames.splice(index, 1);
    this.activeFrameIndex = Math.min(this.activeFrameIndex, this.frames.length - 1);
    this.activeLayerIndex = Math.min(this.activeLayerIndex, this.layers.length - 1);
    eventBus.emit('frame:switched', this.activeFrameIndex);
    eventBus.emit('frames:changed');
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  reorderFrame(from, to) {
    if (from === to) return;
    if (from < 0 || from >= this.frames.length) return;
    if (to < 0 || to >= this.frames.length) return;
    const [frame] = this.frames.splice(from, 1);
    this.frames.splice(to, 0, frame);
    if (this.activeFrameIndex === from) {
      this.activeFrameIndex = to;
    } else if (from < to && this.activeFrameIndex > from && this.activeFrameIndex <= to) {
      this.activeFrameIndex--;
    } else if (from > to && this.activeFrameIndex >= to && this.activeFrameIndex < from) {
      this.activeFrameIndex++;
    }
    eventBus.emit('frames:changed');
    eventBus.emit('canvas:dirty');
  }

  setActiveFrame(index) {
    if (index < 0 || index >= this.frames.length) return;
    if (index === this.activeFrameIndex) return;
    this.activeFrameIndex = index;
    this.activeLayerIndex = Math.min(this.activeLayerIndex, this.layers.length - 1);
    eventBus.emit('frame:switched', this.activeFrameIndex);
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  getFrameDuration(index) {
    if (index < 0 || index >= this.frames.length) return 100;
    return this.frames[index].duration;
  }

  setFrameDuration(index, ms) {
    if (index < 0 || index >= this.frames.length) return;
    this.frames[index].duration = Math.max(10, Math.min(10000, ms));
    eventBus.emit('frames:changed');
  }

  // ── Layer methods ──

  addLayer() {
    const layer = new Layer(this._width, this._height, `Layer ${this.layers.length + 1}`);
    this.layers.push(layer);
    this.activeLayerIndex = this.layers.length - 1;
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  deleteLayer(index) {
    if (this.layers.length <= 1) return;
    this.layers.splice(index, 1);
    this.activeLayerIndex = Math.min(this.activeLayerIndex, this.layers.length - 1);
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  reorderLayer(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [layer] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, layer);
    if (this.activeLayerIndex === fromIndex) {
      this.activeLayerIndex = toIndex;
    } else if (fromIndex < toIndex && this.activeLayerIndex > fromIndex && this.activeLayerIndex <= toIndex) {
      this.activeLayerIndex--;
    } else if (fromIndex > toIndex && this.activeLayerIndex >= toIndex && this.activeLayerIndex < fromIndex) {
      this.activeLayerIndex++;
    }
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  setActiveLayer(index) {
    if (index < 0 || index >= this.layers.length) return;
    this.activeLayerIndex = index;
    eventBus.emit('layers:changed');
  }

  setLayerVisibility(index, visible) {
    if (!this.layers[index]) return;
    this.layers[index].visible = visible;
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  setLayerOpacity(index, opacity) {
    if (!this.layers[index]) return;
    this.layers[index].opacity = Math.max(0, Math.min(1, opacity));
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  resize(width, height) {
    const oldW = this._width;
    const oldH = this._height;
    this._width = width;
    this._height = height;

    for (const frame of this.frames) {
      for (const layer of frame.layers) {
        const oldPixels = layer.pixels;
        layer.pixels = new Uint8ClampedArray(width * height * 4);
        layer.width = width;
        layer.height = height;

        const copyW = Math.min(oldW, width);
        const copyH = Math.min(oldH, height);
        for (let y = 0; y < copyH; y++) {
          for (let x = 0; x < copyW; x++) {
            const oldIdx = (y * oldW + x) * 4;
            const newIdx = (y * width + x) * 4;
            layer.pixels[newIdx]     = oldPixels[oldIdx];
            layer.pixels[newIdx + 1] = oldPixels[oldIdx + 1];
            layer.pixels[newIdx + 2] = oldPixels[oldIdx + 2];
            layer.pixels[newIdx + 3] = oldPixels[oldIdx + 3];
          }
        }
      }
    }

    eventBus.emit('project:resized', { width, height });
    eventBus.emit('canvas:dirty');
  }

  clear() {
    this.activeLayer.pixels.fill(0);
    eventBus.emit('canvas:dirty');
  }

  /** Snapshot active frame's layers (for drawing operations). */
  snapshotLayers() {
    return {
      type: 'frame',
      activeFrameIndex: this.activeFrameIndex,
      layers: this.layers.map(l => l.clone()),
      activeLayerIndex: this.activeLayerIndex,
    };
  }

  /** Snapshot all frames (for frame-level operations like add/delete/reorder). */
  snapshotAllFrames() {
    return {
      type: 'full',
      activeFrameIndex: this.activeFrameIndex,
      activeLayerIndex: this.activeLayerIndex,
      frames: this.frames.map(f => ({
        duration: f.duration,
        layers: f.layers.map(l => l.clone()),
      })),
    };
  }

  /** Restore from a history snapshot. */
  restoreSnapshot(snapshot) {
    if (snapshot.type === 'full') {
      this.frames = snapshot.frames.map(f => ({
        duration: f.duration,
        layers: f.layers.map(l => l.clone()),
      }));
      this.activeFrameIndex = Math.min(snapshot.activeFrameIndex, this.frames.length - 1);
      this.activeLayerIndex = Math.min(snapshot.activeLayerIndex, this.layers.length - 1);
      eventBus.emit('frames:changed');
    } else {
      // 'frame' snapshot — restore single frame's layers
      const fi = snapshot.activeFrameIndex;
      if (fi >= 0 && fi < this.frames.length) {
        this.frames[fi].layers = snapshot.layers.map(l => l.clone());
      }
      this.activeFrameIndex = Math.min(fi, this.frames.length - 1);
      this.activeLayerIndex = Math.min(snapshot.activeLayerIndex, this.layers.length - 1);
    }
    eventBus.emit('frame:switched', this.activeFrameIndex);
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  clonePixels() {
    return new Uint8ClampedArray(this.activeLayer.pixels);
  }

  restorePixels(data) {
    this.activeLayer.pixels.set(data);
    eventBus.emit('canvas:dirty');
  }
}
