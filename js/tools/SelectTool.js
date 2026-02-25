import { Tool } from './Tool.js';

export class SelectTool extends Tool {
  constructor() {
    super('Select', '▧', 's');
    this._selection = null;     // { x, y, w, h } clamped pixel coords
    this._mode = 'idle';        // 'defining' | 'moving' | 'idle'
    this._startX = 0;
    this._startY = 0;
    this._floatingPixels = null; // Uint8ClampedArray lifted from layer
    this._floatX = 0;
    this._floatY = 0;
    this._moveStartX = 0;
    this._moveStartY = 0;
  }

  getCursor() { return 'crosshair'; }

  onPointerDown(x, y, project, ctx) {
    if (this._selection && this._isInsideSelection(x, y)) {
      // Enter move mode: lift pixels from layer
      this._mode = 'moving';
      this._moveStartX = x;
      this._moveStartY = y;
      this._liftPixels(project);
    } else {
      // Commit any floating selection first
      this._commitFloating(project, ctx);
      // Start defining a new selection
      this._mode = 'defining';
      this._startX = x;
      this._startY = y;
      this._selection = { x, y, w: 1, h: 1 };
      ctx.renderer.selectionRect = this._clampSelection(this._selection, project);
    }
    ctx.renderer.markDirty();
  }

  onPointerMove(x, y, project, ctx) {
    if (this._mode === 'defining') {
      const rawX = Math.min(this._startX, x);
      const rawY = Math.min(this._startY, y);
      const rawW = Math.abs(x - this._startX) + 1;
      const rawH = Math.abs(y - this._startY) + 1;
      this._selection = { x: rawX, y: rawY, w: rawW, h: rawH };
      ctx.renderer.selectionRect = this._clampSelection(this._selection, project);
      ctx.renderer.markDirty();
    } else if (this._mode === 'moving') {
      const dx = x - this._moveStartX;
      const dy = y - this._moveStartY;
      this._floatX += dx;
      this._floatY += dy;
      this._moveStartX = x;
      this._moveStartY = y;
      // Update selection position
      this._selection.x += dx;
      this._selection.y += dy;
      ctx.renderer.selectionRect = this._clampSelection(this._selection, project);
      // Show floating pixels as preview
      ctx.renderer.previewPixels = this._buildFloatPreview(project);
      ctx.renderer.markDirty();
    }
  }

  onPointerUp(x, y, project, ctx) {
    if (this._mode === 'defining') {
      // Finalize selection
      const s = this._selection;
      if (s.w <= 0 || s.h <= 0) {
        this.clearSelection(project, ctx);
      } else {
        ctx.renderer.selectionRect = this._clampSelection(s, project);
      }
      this._mode = 'idle';
    } else if (this._mode === 'moving') {
      // Stamp floating pixels onto layer
      this._commitFloating(project, ctx);
      this._mode = 'idle';
    }
    ctx.renderer.markDirty();
  }

  /** Delete the selected region from the active layer */
  deleteSelection(project, ctx) {
    if (!this._selection) return;
    const s = this._clampSelection(this._selection, project);
    if (!s) return;
    for (let py = s.y; py < s.y + s.h; py++) {
      for (let px = s.x; px < s.x + s.w; px++) {
        project.setPixel(px, py, 0, 0, 0, 0);
      }
    }
    this.clearSelection(project, ctx);
  }

  clearSelection(project, ctx) {
    this._commitFloating(project, ctx);
    this._selection = null;
    this._mode = 'idle';
    if (ctx && ctx.renderer) {
      ctx.renderer.selectionRect = null;
      ctx.renderer.previewPixels = null;
      ctx.renderer.markDirty();
    }
  }

  hasSelection() {
    return this._selection !== null;
  }

  // ── Private ──────────────────────────────────────────

  _isInsideSelection(x, y) {
    if (!this._selection) return false;
    const s = this._selection;
    return x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
  }

  _clampSelection(s, project) {
    if (!s) return null;
    const x = Math.max(0, s.x);
    const y = Math.max(0, s.y);
    const x2 = Math.min(project.width, s.x + s.w);
    const y2 = Math.min(project.height, s.y + s.h);
    const w = x2 - x;
    const h = y2 - y;
    if (w <= 0 || h <= 0) return null;
    return { x, y, w, h };
  }

  /** Copy pixels from active layer within selection, then clear them */
  _liftPixels(project) {
    const s = this._selection;
    const clamped = this._clampSelection(s, project);
    if (!clamped) return;

    this._floatX = clamped.x;
    this._floatY = clamped.y;
    // Store clamped dimensions in float buffer
    this._floatW = clamped.w;
    this._floatH = clamped.h;
    this._floatingPixels = new Uint8ClampedArray(clamped.w * clamped.h * 4);

    for (let py = 0; py < clamped.h; py++) {
      for (let px = 0; px < clamped.w; px++) {
        const pixel = project.activeLayer.getPixel(clamped.x + px, clamped.y + py);
        if (pixel) {
          const i = (py * clamped.w + px) * 4;
          this._floatingPixels[i]     = pixel[0];
          this._floatingPixels[i + 1] = pixel[1];
          this._floatingPixels[i + 2] = pixel[2];
          this._floatingPixels[i + 3] = pixel[3];
          // Clear from layer
          project.setPixel(clamped.x + px, clamped.y + py, 0, 0, 0, 0);
        }
      }
    }
  }

  /** Build preview pixel list for floating selection at current position */
  _buildFloatPreview(project) {
    if (!this._floatingPixels) return null;
    const preview = [];
    for (let py = 0; py < this._floatH; py++) {
      for (let px = 0; px < this._floatW; px++) {
        const i = (py * this._floatW + px) * 4;
        const a = this._floatingPixels[i + 3];
        if (a === 0) continue;
        preview.push({
          x: this._floatX + px,
          y: this._floatY + py,
          r: this._floatingPixels[i],
          g: this._floatingPixels[i + 1],
          b: this._floatingPixels[i + 2],
          a,
        });
      }
    }
    return preview;
  }

  /** Stamp floating pixels onto the active layer */
  _commitFloating(project, ctx) {
    if (!this._floatingPixels) return;
    for (let py = 0; py < this._floatH; py++) {
      for (let px = 0; px < this._floatW; px++) {
        const i = (py * this._floatW + px) * 4;
        const a = this._floatingPixels[i + 3];
        if (a === 0) continue;
        project.setPixel(
          this._floatX + px,
          this._floatY + py,
          this._floatingPixels[i],
          this._floatingPixels[i + 1],
          this._floatingPixels[i + 2],
          a,
        );
      }
    }
    this._floatingPixels = null;
    if (ctx && ctx.renderer) {
      ctx.renderer.previewPixels = null;
    }
  }
}
