import { Tool } from './Tool.js';
import { bresenham } from './PencilTool.js';

export class SymmetryTool extends Tool {
  constructor() {
    super('Symmetry', '⊞', 'm');
    this.axis = 'x'; // 'x' | 'y' | 'xy'
    this._lastX = null;
    this._lastY = null;
  }

  getCursor() { return 'crosshair'; }

  onPointerDown(x, y, project, ctx) {
    this._lastX = x;
    this._lastY = y;
    const [r, g, b, a] = ctx.color;
    this._drawMirrored(x, y, project, r, g, b, a);
  }

  onPointerMove(x, y, project, ctx) {
    if (this._lastX === null) return;
    const [r, g, b, a] = ctx.color;
    const points = bresenham(this._lastX, this._lastY, x, y);
    for (const [px, py] of points) {
      this._drawMirrored(px, py, project, r, g, b, a);
    }
    this._lastX = x;
    this._lastY = y;
  }

  onPointerUp() {
    this._lastX = null;
    this._lastY = null;
  }

  _drawMirrored(px, py, project, r, g, b, a) {
    const W = project.width;
    const H = project.height;
    project.setPixel(px, py, r, g, b, a);
    if (this.axis === 'x' || this.axis === 'xy') {
      project.setPixel(W - 1 - px, py, r, g, b, a);
    }
    if (this.axis === 'y' || this.axis === 'xy') {
      project.setPixel(px, H - 1 - py, r, g, b, a);
    }
    if (this.axis === 'xy') {
      project.setPixel(W - 1 - px, H - 1 - py, r, g, b, a);
    }
  }
}
