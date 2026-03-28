import { Tool } from './Tool.js';
import { brushFootprint } from './BrushUtils.js';

export class EllipseTool extends Tool {
  constructor() {
    super('Ellipse', '◯', 'c');
    this._startX = null;
    this._startY = null;
    this._drawing = false;
    this.supportsBrushSize = true;
  }

  onPointerDown(x, y, _project, ctx) {
    this._startX = x;
    this._startY = y;
    this._drawing = true;
    this._updatePreview(x, y, ctx);
  }

  onPointerMove(x, y, _project, ctx) {
    if (!this._drawing) return;
    this._updatePreview(x, y, ctx);
  }

  onPointerUp(x, y, project, ctx) {
    if (!this._drawing) return;
    this._drawing = false;
    ctx.renderer.previewPixels = null;

    const [r, g, b, a] = ctx.color;
    const points = _getEllipsePoints(this._startX, this._startY, x, y);
    for (const [px, py] of points) {
      for (const [bx, by] of brushFootprint(px, py, ctx.brushSize)) {
        project.setPixel(bx, by, r, g, b, a);
      }
    }
  }

  _updatePreview(x, y, ctx) {
    const [r, g, b, a] = ctx.color;
    const ellipsePoints = _getEllipsePoints(this._startX, this._startY, x, y);
    const preview = [];
    for (const [px, py] of ellipsePoints) {
      for (const [bx, by] of brushFootprint(px, py, ctx.brushSize)) {
        preview.push({ x: bx, y: by, r, g, b, a });
      }
    }
    ctx.renderer.previewPixels = preview;
    ctx.renderer.markDirty();
  }
}

/** Midpoint ellipse algorithm — returns array of [x, y] outline pixels */
function _getEllipsePoints(x0, y0, x1, y1) {
  const cx = Math.round((x0 + x1) / 2);
  const cy = Math.round((y0 + y1) / 2);
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;

  if (rx < 0.5 && ry < 0.5) return [[cx, cy]];
  if (rx < 0.5) {
    const points = [];
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) points.push([cx, y]);
    return points;
  }
  if (ry < 0.5) {
    const points = [];
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) points.push([x, cy]);
    return points;
  }

  const points = [];
  const seen = new Set();
  const add = (x, y) => {
    const key = x * 100000 + y;
    if (!seen.has(key)) { seen.add(key); points.push([x, y]); }
  };

  // Region 1: dy/dx < 1
  let x = 0, y = ry;
  const rx2 = rx * rx, ry2 = ry * ry;
  let d1 = ry2 - rx2 * ry + 0.25 * rx2;

  while (ry2 * x <= rx2 * y) {
    add(cx + x, cy + y); add(cx - x, cy + y);
    add(cx + x, cy - y); add(cx - x, cy - y);
    x++;
    if (d1 < 0) {
      d1 += 2 * ry2 * x + ry2;
    } else {
      y--;
      d1 += 2 * ry2 * x - 2 * rx2 * y + ry2;
    }
  }

  // Region 2: dy/dx >= 1
  let d2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
  while (y >= 0) {
    add(cx + x, cy + y); add(cx - x, cy + y);
    add(cx + x, cy - y); add(cx - x, cy - y);
    y--;
    if (d2 > 0) {
      d2 += rx2 - 2 * rx2 * y;
    } else {
      x++;
      d2 += 2 * ry2 * x - 2 * rx2 * y + rx2;
    }
  }

  return points;
}
