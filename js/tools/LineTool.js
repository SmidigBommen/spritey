import { Tool } from './Tool.js';
import { bresenham } from './PencilTool.js';
import { brushFootprint } from './BrushUtils.js';

export class LineTool extends Tool {
  constructor() {
    super('Line', '╲', 'l');
    this._startX = null;
    this._startY = null;
    this._drawing = false;
    this.supportsBrushSize = true;
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
      for (const [bx, by] of brushFootprint(px, py, ctx.brushSize)) {
        project.setPixel(bx, by, r, g, b, a);
      }
    }
  }

  _updatePreview(x, y, ctx) {
    const [r, g, b, a] = ctx.color;
    const linePoints = bresenham(this._startX, this._startY, x, y);
    const preview = [];
    for (const [px, py] of linePoints) {
      for (const [bx, by] of brushFootprint(px, py, ctx.brushSize)) {
        preview.push({ x: bx, y: by, r, g, b, a });
      }
    }
    ctx.renderer.previewPixels = preview;
    ctx.renderer.markDirty();
  }
}
