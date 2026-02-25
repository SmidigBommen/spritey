import { eventBus } from './EventBus.js';

export class HistoryManager {
  constructor(project, maxSteps = 100) {
    this.project = project;
    this.maxSteps = maxSteps;
    this._undoStack = [];
    this._redoStack = [];
  }

  /** Call before making changes to push current state */
  pushState() {
    this._undoStack.push(this.project.snapshotLayers());
    if (this._undoStack.length > this.maxSteps) {
      this._undoStack.shift();
    }
    this._redoStack = [];
    this._emitState();
  }

  undo() {
    if (this._undoStack.length === 0) return;
    const prev = this._undoStack.pop();
    // Save matching snapshot type so redo restores correctly
    const current = prev.type === 'full'
      ? this.project.snapshotAllFrames()
      : this.project.snapshotLayers();
    this._redoStack.push(current);
    this.project.restoreSnapshot(prev);
    this._emitState();
  }

  redo() {
    if (this._redoStack.length === 0) return;
    const next = this._redoStack.pop();
    const current = next.type === 'full'
      ? this.project.snapshotAllFrames()
      : this.project.snapshotLayers();
    this._undoStack.push(current);
    this.project.restoreSnapshot(next);
    this._emitState();
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  reset() {
    this._undoStack = [];
    this._redoStack = [];
    this._emitState();
  }

  _emitState() {
    eventBus.emit('history:changed', { canUndo: this.canUndo, canRedo: this.canRedo });
  }
}
