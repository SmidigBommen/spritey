import { eventBus } from './EventBus.js';

export class HistoryManager {
  constructor(project, maxSteps = 100) {
    this.project = project;
    this.maxSteps = maxSteps;
    this._undoStack = [];
    this._redoStack = [];

    // Save initial state
    this._undoStack.push(project.snapshotLayers());
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
    if (this._undoStack.length <= 1) return;
    const current = this._undoStack.pop();
    this._redoStack.push(current);
    const prev = this._undoStack[this._undoStack.length - 1];
    this.project.restoreSnapshot(prev);
    this._emitState();
  }

  redo() {
    if (this._redoStack.length === 0) return;
    const state = this._redoStack.pop();
    this._undoStack.push(state);
    this.project.restoreSnapshot(state);
    this._emitState();
  }

  get canUndo() { return this._undoStack.length > 1; }
  get canRedo() { return this._redoStack.length > 0; }

  reset() {
    this._undoStack = [this.project.snapshotLayers()];
    this._redoStack = [];
    this._emitState();
  }

  _emitState() {
    eventBus.emit('history:changed', { canUndo: this.canUndo, canRedo: this.canRedo });
  }
}
