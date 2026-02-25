import { Tool } from './Tool.js';
import { bresenham } from './PencilTool.js';

export class LineTool extends Tool {
  constructor() {
    super('Line', 'L', 'l');
    this._startX = null;
    this._startY = null;
    this._drawing = false;
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
    const points = bresenham(this._startX, this._startY, x, y);
    for (const [px, py] of points) {
      project.setPixel(px, py, r, g, b, a);
    }
  }

  _updatePreview(x, y, ctx) {
    const [r, g, b, a] = ctx.color;
    const points = bresenham(this._startX, this._startY, x, y);
    ctx.renderer.previewPixels = points.map(([px, py]) => ({ x: px, y: py, r, g, b, a }));
    ctx.renderer.markDirty();
  }
}
