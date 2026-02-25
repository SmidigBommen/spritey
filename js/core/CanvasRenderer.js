import { eventBus } from './EventBus.js';

const CHECKERBOARD_LIGHT = '#3a3a3a';
const CHECKERBOARD_DARK = '#2a2a2a';
const GRID_COLOR = 'rgba(255,255,255,0.08)';
const GRID_COLOR_STRONG = 'rgba(255,255,255,0.2)';

// Onion skin tint: blue for previous frames, red for next
const ONION_PREV_TINT = [80, 120, 255];
const ONION_NEXT_TINT = [255, 100, 80];

export class CanvasRenderer {
  constructor(canvas, project) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.project = project;
    this._zoom = 24;
    this._panX = 0;
    this._panY = 0;
    this._dirty = true;
    this._showGrid = true;
    this._isPanning = false;
    this._panStart = null;

    // Preview overlay for tools (line, rect, floating selection)
    this.previewPixels = null;

    // Selection rectangle in pixel coords { x, y, w, h }
    this.selectionRect = null;

    // Onion skinning
    this.onionSkin = { enabled: false, before: 1, after: 1, opacity: 0.25 };

    this._resizeCanvas();
    this._setupEvents();
    this._startRenderLoop();
  }

  get zoom() { return this._zoom; }
  set zoom(val) {
    this._zoom = Math.max(1, Math.min(64, val));
    this._dirty = true;
    eventBus.emit('zoom:changed', this._zoom);
  }

  get showGrid() { return this._showGrid; }
  set showGrid(val) {
    this._showGrid = val;
    this._dirty = true;
  }

  markDirty() {
    this._dirty = true;
  }

  screenToPixel(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasCenterX = rect.width / 2;
    const canvasCenterY = rect.height / 2;
    const spriteW = this.project.width * this._zoom;
    const spriteH = this.project.height * this._zoom;
    const originX = canvasCenterX - spriteW / 2 + this._panX;
    const originY = canvasCenterY - spriteH / 2 + this._panY;

    const px = Math.floor((screenX - rect.left - originX) / this._zoom);
    const py = Math.floor((screenY - rect.top - originY) / this._zoom);
    return { x: px, y: py };
  }

  _resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._dirty = true;
  }

  _setupEvents() {
    eventBus.on('canvas:dirty', () => { this._dirty = true; });
    eventBus.on('project:resized', () => { this._dirty = true; });

    const ro = new ResizeObserver(() => this._resizeCanvas());
    ro.observe(this.canvas.parentElement);

    // Middle-click pan
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this._isPanning = true;
        this._panStart = { x: e.clientX - this._panX, y: e.clientY - this._panY };
        this.canvas.setPointerCapture(e.pointerId);
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this._isPanning && this._panStart) {
        this._panX = e.clientX - this._panStart.x;
        this._panY = e.clientY - this._panStart.y;
        this._dirty = true;
      }
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (e.button === 1) {
        this._isPanning = false;
        this._panStart = null;
      }
    });

    // Scroll to zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      const oldZoom = this._zoom;
      this.zoom = this._zoom + delta * Math.max(1, Math.floor(this._zoom / 4));
      // Adjust pan to zoom toward cursor
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const ratio = this._zoom / oldZoom;
      this._panX = cx - ratio * (cx - this._panX);
      this._panY = cy - ratio * (cy - this._panY);
      this._dirty = true;
    }, { passive: false });
  }

  _startRenderLoop() {
    const loop = () => {
      // Always dirty if selection active (marching ants animation)
      if (this.selectionRect) this._dirty = true;

      if (this._dirty) {
        this._dirty = false;
        this._render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _render() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const pw = this.project.width;
    const ph = this.project.height;
    const z = this._zoom;

    ctx.clearRect(0, 0, w, h);

    // Fill background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    const spriteW = pw * z;
    const spriteH = ph * z;
    const originX = Math.floor(w / 2 - spriteW / 2 + this._panX);
    const originY = Math.floor(h / 2 - spriteH / 2 + this._panY);

    // Draw checkerboard
    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        ctx.fillStyle = (px + py) % 2 === 0 ? CHECKERBOARD_LIGHT : CHECKERBOARD_DARK;
        ctx.fillRect(originX + px * z, originY + py * z, z, z);
      }
    }

    // Draw onion skin (before current pixels)
    if (this.onionSkin.enabled && this.project.frameCount > 1) {
      this._drawOnionFrames(ctx, originX, originY, pw, ph, z);
    }

    // Draw composited pixels (all layers)
    const pixels = this.project.flattenPixels();
    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const i = (py * pw + px) * 4;
        const a = pixels[i + 3];
        if (a === 0) continue;
        ctx.fillStyle = `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${a / 255})`;
        ctx.fillRect(originX + px * z, originY + py * z, z, z);
      }
    }

    // Draw preview overlay (for line/rect tool and floating selection)
    if (this.previewPixels) {
      for (const { x, y, r, g, b, a } of this.previewPixels) {
        if (x < 0 || x >= pw || y < 0 || y >= ph) continue;
        ctx.fillStyle = `rgba(${r},${g},${b},${(a ?? 255) / 255})`;
        ctx.fillRect(originX + x * z, originY + y * z, z, z);
      }
    }

    // Draw selection rect (marching ants)
    if (this.selectionRect) {
      const { x, y, w: sw, h: sh } = this.selectionRect;
      const sx = originX + x * z;
      const sy = originY + y * z;
      const sW = sw * z;
      const sH = sh * z;

      const phase = Math.floor(Date.now() / 100) % 8;
      ctx.save();
      ctx.lineWidth = 1;

      // White dashes
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -phase;
      ctx.strokeRect(sx + 0.5, sy + 0.5, sW, sH);

      // Black dashes (offset)
      ctx.strokeStyle = '#000000';
      ctx.lineDashOffset = 4 - phase;
      ctx.strokeRect(sx + 0.5, sy + 0.5, sW, sH);

      ctx.restore();
    }

    // Draw grid
    if (this._showGrid && z >= 4) {
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= pw; x++) {
        const sx = originX + x * z + 0.5;
        ctx.moveTo(sx, originY);
        ctx.lineTo(sx, originY + spriteH);
      }
      for (let y = 0; y <= ph; y++) {
        const sy = originY + y * z + 0.5;
        ctx.moveTo(originX, sy);
        ctx.lineTo(originX + spriteW, sy);
      }
      ctx.stroke();

      // Strong grid lines every 8 pixels
      if (z >= 6) {
        ctx.strokeStyle = GRID_COLOR_STRONG;
        ctx.beginPath();
        for (let x = 0; x <= pw; x += 8) {
          const sx = originX + x * z + 0.5;
          ctx.moveTo(sx, originY);
          ctx.lineTo(sx, originY + spriteH);
        }
        for (let y = 0; y <= ph; y += 8) {
          const sy = originY + y * z + 0.5;
          ctx.moveTo(originX, sy);
          ctx.lineTo(originX + spriteW, sy);
        }
        ctx.stroke();
      }
    }

    // Border around canvas
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX + 0.5, originY + 0.5, spriteW, spriteH);
  }

  _drawOnionFrames(ctx, originX, originY, pw, ph, z) {
    const { before, after, opacity } = this.onionSkin;
    const current = this.project.activeFrameIndex;
    const count = this.project.frameCount;

    // Previous frames (blue tint)
    for (let d = 1; d <= before; d++) {
      const idx = current - d;
      if (idx < 0) break;
      const fadeOpacity = opacity * (1 - (d - 1) / before);
      this._drawOnionFrame(ctx, originX, originY, pw, ph, z, idx, ONION_PREV_TINT, fadeOpacity);
    }

    // Next frames (red tint)
    for (let d = 1; d <= after; d++) {
      const idx = current + d;
      if (idx >= count) break;
      const fadeOpacity = opacity * (1 - (d - 1) / after);
      this._drawOnionFrame(ctx, originX, originY, pw, ph, z, idx, ONION_NEXT_TINT, fadeOpacity);
    }
  }

  _drawOnionFrame(ctx, originX, originY, pw, ph, z, frameIndex, tint, alpha) {
    const pixels = this.project.flattenFrame(frameIndex);
    if (!pixels) return;
    const [tr, tg, tb] = tint;

    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const i = (py * pw + px) * 4;
        const a = pixels[i + 3];
        if (a === 0) continue;
        // Blend pixel color with tint (50/50 mix)
        const r = (pixels[i] + tr) >> 1;
        const g = (pixels[i + 1] + tg) >> 1;
        const b = (pixels[i + 2] + tb) >> 1;
        ctx.fillStyle = `rgba(${r},${g},${b},${(a / 255) * alpha})`;
        ctx.fillRect(originX + px * z, originY + py * z, z, z);
      }
    }
  }

  resetView() {
    this._panX = 0;
    this._panY = 0;
    this._dirty = true;
  }
}
