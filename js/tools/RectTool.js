import { Tool } from './Tool.js';

export class RectTool extends Tool {
  constructor() {
    super('Rect', 'R', 'r');
    this._startX = null;
    this._startY = null;
    this._drawing = false;
    this.filled = false;
  }

  onPointerDown(x, y, project, ctx) {
    this._startX = x;
    this._startY = y;
    this._drawing = true;
    this._updatePreview(x, y, ctx);
  }

  onPointerMove(x, y, project, ctx) {
    if (!this._drawing) return;
    this._updatePreview(x, y, ctx);
  }

  onPointerUp(x, y, project, ctx) {
    if (!this._drawing) return;
    this._drawing = false;
    ctx.renderer.previewPixels = null;

    const [r, g, b, a] = ctx.color;
    const points = this._getRectPoints(this._startX, this._startY, x, y);
    for (const [px, py] of points) {
      project.setPixel(px, py, r, g, b, a);
    }
  }

  _updatePreview(x, y, ctx) {
    const [r, g, b, a] = ctx.color;
    const points = this._getRectPoints(this._startX, this._startY, x, y);
    ctx.renderer.previewPixels = points.map(([px, py]) => ({ x: px, y: py, r, g, b, a }));
    ctx.renderer.markDirty();
  }

  _getRectPoints(x0, y0, x1, y1) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const points = [];

    if (this.filled) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          points.push([x, y]);
        }
      }
    } else {
      for (let x = minX; x <= maxX; x++) {
        points.push([x, minY]);
        points.push([x, maxY]);
      }
      for (let y = minY + 1; y < maxY; y++) {
        points.push([minX, y]);
        points.push([maxX, y]);
      }
    }
    return points;
  }
}
