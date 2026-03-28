import { Tool } from './Tool.js';

export class PencilTool extends Tool {
  constructor() {
    super('Pencil', 'B', 'b');
    this._lastX = null;
    this._lastY = null;
    this.pixelPerfect = false;
    // Pixel perfect buffer: last two drawn points + original pixel at B
    this._ppA = null; // { x, y }
    this._ppB = null; // { x, y }
    this._ppOrigB = null; // [r, g, b, a]
  }

  onPointerDown(x, y, project, ctx) {
    this._lastX = x;
    this._lastY = y;
    const [r, g, b, a] = ctx.color;
    if (this.pixelPerfect) {
      this._ppA = null;
      this._ppOrigB = project.activeLayer.getPixel(x, y) || [0, 0, 0, 0];
      this._ppB = { x, y };
    }
    project.setPixel(x, y, r, g, b, a);
  }

  onPointerMove(x, y, project, ctx) {
    if (this._lastX === null) return;
    const [r, g, b, a] = ctx.color;
    if (this.pixelPerfect) {
      // No Bresenham — one pixel per pointer event, with L-corner removal
      if (x === this._ppB.x && y === this._ppB.y) return;
      this._drawPixelPerfect(x, y, project, r, g, b, a);
    } else {
      const points = bresenham(this._lastX, this._lastY, x, y);
      for (const [px, py] of points) {
        project.setPixel(px, py, r, g, b, a);
      }
    }
    this._lastX = x;
    this._lastY = y;
  }

  onPointerUp() {
    this._lastX = null;
    this._lastY = null;
    this._ppA = null;
    this._ppB = null;
    this._ppOrigB = null;
  }

  _drawPixelPerfect(x, y, project, r, g, b, a) {
    if (this._ppA && this._ppB) {
      const { x: ax, y: ay } = this._ppA;
      const { x: bx, y: by } = this._ppB;
      // Aseprite-style L-corner: B shares one axis with A and the other with C
      if ((ax === bx && by === y) || (ay === by && bx === x)) {
        const [or, og, ob, oa] = this._ppOrigB;
        project.setPixel(bx, by, or, og, ob, oa);
        // A stays, B becomes current point
      } else {
        this._ppA = this._ppB;
      }
    } else {
      this._ppA = this._ppB;
    }
    this._ppOrigB = project.activeLayer.getPixel(x, y) || [0, 0, 0, 0];
    this._ppB = { x, y };
    project.setPixel(x, y, r, g, b, a);
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
