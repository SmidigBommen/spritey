import { Tool } from './Tool.js';

export class PencilTool extends Tool {
  constructor() {
    super('Pencil', 'B', 'b');
    this._lastX = null;
    this._lastY = null;
  }

  onPointerDown(x, y, project, ctx) {
    this._lastX = x;
    this._lastY = y;
    const [r, g, b, a] = ctx.color;
    project.setPixel(x, y, r, g, b, a);
  }

  onPointerMove(x, y, project, ctx) {
    if (this._lastX === null) return;
    const [r, g, b, a] = ctx.color;
    // Bresenham interpolation to avoid gaps
    const points = bresenham(this._lastX, this._lastY, x, y);
    for (const [px, py] of points) {
      project.setPixel(px, py, r, g, b, a);
    }
    this._lastX = x;
    this._lastY = y;
  }

  onPointerUp() {
    this._lastX = null;
    this._lastY = null;
  }
}

/** Bresenham line algorithm - returns array of [x, y] points */
export function bresenham(x0, y0, x1, y1) {
  const points = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return points;
}
