import { Tool } from './Tool.js';
import { eventBus } from '../core/EventBus.js';

export class EyedropperTool extends Tool {
  constructor() {
    super('Eyedropper', 'I', 'i');
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
