import { eventBus } from './EventBus.js';

export class AnimationPlayer {
  constructor(project) {
    this.project = project;
    this._playing = false;
    this._timerId = null;
    this._fps = 10;
  }

  get playing() { return this._playing; }

  get fps() { return this._fps; }
  set fps(val) { this._fps = Math.max(1, Math.min(60, val)); }

  play() {
    if (this._playing) {
      this.pause();
      return;
    }
    this._playing = true;
    eventBus.emit('playback:started');
    this._scheduleNext();
  }

  pause() {
    this._playing = false;
    clearTimeout(this._timerId);
    this._timerId = null;
    eventBus.emit('playback:paused');
  }

  stop() {
    this._playing = false;
    clearTimeout(this._timerId);
    this._timerId = null;
    this.project.setActiveFrame(0);
    eventBus.emit('playback:stopped');
  }

  _scheduleNext() {
    if (!this._playing) return;
    const duration = this.project.getFrameDuration(this.project.activeFrameIndex);
    // Use per-frame duration if set, otherwise derive from FPS
    const delay = duration > 0 ? duration : Math.round(1000 / this._fps);
    this._timerId = setTimeout(() => this._advance(), delay);
  }

  _advance() {
    if (!this._playing) return;
    const next = (this.project.activeFrameIndex + 1) % this.project.frameCount;
    this.project.setActiveFrame(next);
    this._scheduleNext();
  }
}
