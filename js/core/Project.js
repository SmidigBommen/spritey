import { eventBus } from './EventBus.js';
import { Layer } from './Layer.js';

export class Project {
  constructor(width = 16, height = 16, name = 'Untitled') {
    this.name = name;
    this._width = width;
    this._height = height;
    this.layers = [new Layer(width, height, 'Layer 1')];
    this.activeLayerIndex = 0;
  }

  get width() { return this._width; }
  get height() { return this._height; }

  get activeLayer() {
    return this.layers[this.activeLayerIndex];
  }

  /** Backward-compat: direct pixel access points to active layer */
  get pixels() {
    return this.activeLayer.pixels;
  }

  getPixel(x, y) {
    return this.activeLayer.getPixel(x, y);
  }

  setPixel(x, y, r, g, b, a = 255) {
    this.activeLayer.setPixel(x, y, r, g, b, a);
  }

  /** Composite all visible layers (bottom to top) into a flat Uint8ClampedArray. */
  flattenPixels() {
    const total = this._width * this._height * 4;
    const result = new Uint8ClampedArray(total);

    for (const layer of this.layers) {
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

    for (const layer of this.layers) {
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

    eventBus.emit('project:resized', { width, height });
    eventBus.emit('canvas:dirty');
  }

  clear() {
    this.activeLayer.pixels.fill(0);
    eventBus.emit('canvas:dirty');
  }

  /** Snapshot all layers for history */
  snapshotLayers() {
    return {
      layers: this.layers.map(l => l.clone()),
      activeLayerIndex: this.activeLayerIndex,
    };
  }

  /** Restore from a history snapshot */
  restoreSnapshot(snapshot) {
    this.layers = snapshot.layers.map(l => l.clone());
    this.activeLayerIndex = snapshot.activeLayerIndex;
    eventBus.emit('layers:changed');
    eventBus.emit('canvas:dirty');
  }

  /** Legacy helpers */
  clonePixels() {
    return new Uint8ClampedArray(this.activeLayer.pixels);
  }

  restorePixels(data) {
    this.activeLayer.pixels.set(data);
    eventBus.emit('canvas:dirty');
  }
}
