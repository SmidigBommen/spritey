import { Tool } from './Tool.js';
import { colorsMatch } from '../core/ColorUtils.js';

export class FillTool extends Tool {
  constructor() {
    super('Fill', 'G', 'g');
  }

  onPointerDown(x, y, project, ctx) {
    const w = project.width;
    const h = project.height;
    if (x < 0 || x >= w || y < 0 || y >= h) return;

    const targetColor = project.getPixel(x, y);
    const fillColor = ctx.color;

    if (colorsMatch(targetColor, fillColor)) return;

    // BFS flood fill
    const queue = [[x, y]];
    const visited = new Uint8Array(w * h);
    visited[y * w + x] = 1;

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      project.setPixel(cx, cy, fillColor[0], fillColor[1], fillColor[2], fillColor[3]);

      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const key = ny * w + nx;
        if (visited[key]) continue;
        visited[key] = 1;
        const nc = project.getPixel(nx, ny);
        if (colorsMatch(nc, targetColor)) {
          queue.push([nx, ny]);
        }
      }
    }
  }
}
