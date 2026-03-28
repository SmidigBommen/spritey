import { Tool } from './Tool.js';
import { eventBus } from '../core/EventBus.js';

export class EyedropperTool extends Tool {
  constructor() {
    super('Eyedropper', '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.7 3.3a3.1 3.1 0 0 0-4.4 0l-2.1 2.1-1.4-1.4-1.4 1.4 1.4 1.4-8.4 8.4a1 1 0 0 0-.3.5l-1 4a1 1 0 0 0 1.2 1.2l4-1a1 1 0 0 0 .5-.3l8.4-8.4 1.4 1.4 1.4-1.4-1.4-1.4 2.1-2.1a3.1 3.1 0 0 0 0-4.4z"/></svg>', 'i');
  }

  onPointerDown(x, y, project) {
    this._pickColor(x, y, project);
  }

  onPointerMove(x, y, project) {
    this._pickColor(x, y, project);
  }

  _pickColor(x, y, project) {
    const color = project.getPixel(x, y);
    if (!color) return;
    eventBus.emit('color:picked', color);
  }

  getCursor() { return 'crosshair'; }
}
