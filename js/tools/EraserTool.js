import { Tool } from './Tool.js';
import { bresenham } from './PencilTool.js';

export class EraserTool extends Tool {
  constructor() {
    super('Eraser', 'E', 'e');
    this._lastX = null;
    this._lastY = null;
  }

  onPointerDown(x, y, project) {
    this._lastX = x;
    this._lastY = y;
    project.setPixel(x, y, 0, 0, 0, 0);
  }

  onPointerMove(x, y, project) {
    if (this._lastX === null) return;
    const points = bresenham(this._lastX, this._lastY, x, y);
    for (const [px, py] of points) {
      project.setPixel(px, py, 0, 0, 0, 0);
    }
    this._lastX = x;
    this._lastY = y;
  }

  onPointerUp() {
    this._lastX = null;
    this._lastY = null;
  }
}
