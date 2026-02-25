/** Base class for all drawing tools */
export class Tool {
  constructor(name, icon, shortcut) {
    this.name = name;
    this.icon = icon;
    this.shortcut = shortcut;
  }

  /** @param {number} x - pixel x coord
   *  @param {number} y - pixel y coord
   *  @param {import('../core/Project.js').Project} project
   *  @param {object} ctx - { color: [r,g,b,a], renderer }
   */
  onPointerDown(x, y, project, ctx) {}
  onPointerMove(x, y, project, ctx) {}
  onPointerUp(x, y, project, ctx) {}

  /** Return cursor CSS class name */
  getCursor() { return 'crosshair'; }
}
