import { Tool } from './Tool.js';
import { bresenham } from './PencilTool.js';
import { brushFootprint } from './BrushUtils.js';

export class EraserTool extends Tool {
  constructor() {
    super('Eraser', '◻', 'e');
    this._lastX = null;
    this._lastY = null;
    this.supportsBrushSize = true;
  }

  onPointerDown(x, y, project, ctx) {
    this._lastX = x;
    this._lastY = y;
    this._stamp(x, y, project, ctx.brushSize);
  }

  onPointerMove(x, y, project, ctx) {
    if (this._lastX === null) return;
    const points = bresenham(this._lastX, this._lastY, x, y);
    for (const [px, py] of points) {
      this._stamp(px, py, project, ctx.brushSize);
    }
    this._lastX = x;
    this._lastY = y;
  }

  onPointerUp() {
    this._lastX = null;
    this._lastY = null;
  }

  _stamp(x, y, project, size) {
    for (const [px, py] of brushFootprint(x, y, size)) {
      project.setPixel(px, py, 0, 0, 0, 0);
    }
  }
}
