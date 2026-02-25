import { eventBus } from '../core/EventBus.js';

const THUMB_SIZE = 56;

export class TimelinePanel {
  constructor(container, project) {
    this.container = container;
    this.project = project;
    this._playing = false;
    this._dragFrom = -1;
    this._thumbCanvases = [];
    this._build();
    this._listen();
    this.render();
  }

  _build() {
    this.container.innerHTML = '';

    // Frame strip (scrollable)
    this._strip = document.createElement('div');
    this._strip.className = 'timeline-strip';
    this.container.appendChild(this._strip);

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'timeline-controls';

    // Left: frame manipulation
    const left = document.createElement('div');
    left.className = 'timeline-controls-left';

    this._addBtn = this._makeBtn('+', 'New frame (N)', () => eventBus.emit('frame:add'));
    this._dupBtn = this._makeBtn('Dup', 'Duplicate frame', () => eventBus.emit('frame:duplicate', { index: this.project.activeFrameIndex }));
    this._delBtn = this._makeBtn('Del', 'Delete frame', () => eventBus.emit('frame:delete', { index: this.project.activeFrameIndex }));

    left.append(this._addBtn, this._dupBtn, this._delBtn);

    // Center: playback
    const center = document.createElement('div');
    center.className = 'timeline-controls-center';

    this._playBtn = this._makeBtn('\u25B6', 'Play (Space)', () => eventBus.emit('playback:play'));
    this._stopBtn = this._makeBtn('\u25A0', 'Stop', () => eventBus.emit('playback:stop'));

    center.append(this._playBtn, this._stopBtn);

    // Right: FPS + onion skin
    const right = document.createElement('div');
    right.className = 'timeline-controls-right';

    const fpsLabel = document.createElement('span');
    fpsLabel.className = 'timeline-fps-label';
    fpsLabel.textContent = 'FPS';

    const fpsMinus = this._makeBtn('\u2212', 'Decrease FPS', () => this._adjustFps(-1));
    this._fpsDisplay = document.createElement('span');
    this._fpsDisplay.className = 'timeline-fps-value';
    this._fpsDisplay.textContent = '10';
    const fpsPlus = this._makeBtn('+', 'Increase FPS', () => this._adjustFps(1));
    this._fps = 10;

    this._onionBtn = this._makeBtn('O', 'Toggle onion skin (O)', () => eventBus.emit('onion:toggle'));
    this._onionBtn.classList.add('timeline-onion-btn');

    right.append(fpsLabel, fpsMinus, this._fpsDisplay, fpsPlus, this._onionBtn);

    controls.append(left, center, right);
    this.container.appendChild(controls);
  }

  _makeBtn(text, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'timeline-btn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  _adjustFps(delta) {
    this._fps = Math.max(1, Math.min(60, this._fps + delta));
    this._fpsDisplay.textContent = this._fps;
    eventBus.emit('playback:fps', this._fps);
  }

  _listen() {
    eventBus.on('frames:changed', () => this.render());
    eventBus.on('frame:switched', () => this.render());
    eventBus.on('canvas:dirty', () => this._updateActiveThumb());
    eventBus.on('playback:started', () => {
      this._playing = true;
      this._playBtn.textContent = '\u275A\u275A';
      this._playBtn.title = 'Pause (Space)';
    });
    eventBus.on('playback:stopped', () => {
      this._playing = false;
      this._playBtn.textContent = '\u25B6';
      this._playBtn.title = 'Play (Space)';
    });
    eventBus.on('playback:paused', () => {
      this._playing = false;
      this._playBtn.textContent = '\u25B6';
      this._playBtn.title = 'Play (Space)';
    });
    eventBus.on('onion:changed', (enabled) => {
      this._onionBtn.classList.toggle('active', enabled);
    });
  }

  render() {
    this._strip.innerHTML = '';
    this._thumbCanvases = [];

    for (let i = 0; i < this.project.frameCount; i++) {
      const thumb = this._createThumb(i);
      this._strip.appendChild(thumb);
    }
    this._delBtn.disabled = this.project.frameCount <= 1;
    this._scrollActiveIntoView();
  }

  _createThumb(index) {
    const wrap = document.createElement('div');
    wrap.className = 'timeline-thumb';
    if (index === this.project.activeFrameIndex) wrap.classList.add('active');
    wrap.draggable = true;
    wrap.dataset.index = index;

    const canvas = document.createElement('canvas');
    canvas.width = this.project.width;
    canvas.height = this.project.height;
    canvas.style.width = THUMB_SIZE + 'px';
    canvas.style.height = THUMB_SIZE + 'px';
    canvas.style.imageRendering = 'pixelated';
    this._drawThumb(canvas, index);
    this._thumbCanvases[index] = canvas;

    const label = document.createElement('span');
    label.className = 'timeline-thumb-label';
    label.textContent = index + 1;

    wrap.append(canvas, label);

    // Click to select
    wrap.addEventListener('click', () => {
      eventBus.emit('frame:select', { index });
    });

    // Drag to reorder
    wrap.addEventListener('dragstart', (e) => {
      this._dragFrom = index;
      wrap.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    wrap.addEventListener('dragend', () => {
      wrap.classList.remove('dragging');
      this._dragFrom = -1;
    });
    wrap.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      wrap.classList.add('drag-over');
    });
    wrap.addEventListener('dragleave', () => {
      wrap.classList.remove('drag-over');
    });
    wrap.addEventListener('drop', (e) => {
      e.preventDefault();
      wrap.classList.remove('drag-over');
      if (this._dragFrom >= 0 && this._dragFrom !== index) {
        eventBus.emit('frame:reorder', { from: this._dragFrom, to: index });
      }
      this._dragFrom = -1;
    });

    return wrap;
  }

  _drawThumb(canvas, index) {
    const pixels = this.project.flattenFrame(index);
    if (!pixels) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(this.project.width, this.project.height);
    imgData.data.set(pixels);
    ctx.putImageData(imgData, 0, 0);
  }

  _updateActiveThumb() {
    const canvas = this._thumbCanvases[this.project.activeFrameIndex];
    if (canvas) this._drawThumb(canvas, this.project.activeFrameIndex);
  }

  _scrollActiveIntoView() {
    const active = this._strip.querySelector('.timeline-thumb.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
