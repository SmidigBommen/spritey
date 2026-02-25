import { eventBus } from '../core/EventBus.js';

export class BottomBar {
  constructor(container) {
    this.container = container;
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

    // Left section: size selector
    const left = document.createElement('div');
    left.className = 'bottom-left';

    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Canvas: ';
    left.appendChild(sizeLabel);

    this._sizeSelect = document.createElement('select');
    this._sizeSelect.className = 'size-select';
    for (const size of [16, 32]) {
      const opt = document.createElement('option');
      opt.value = size;
      opt.textContent = `${size}x${size}`;
      this._sizeSelect.appendChild(opt);
    }
    this._sizeSelect.addEventListener('change', () => {
      const size = parseInt(this._sizeSelect.value);
      eventBus.emit('canvas:resize', size);
    });
    left.appendChild(this._sizeSelect);
    this.container.appendChild(left);

    // Center section: cursor position
    const center = document.createElement('div');
    center.className = 'bottom-center';
    this._posLabel = document.createElement('span');
    this._posLabel.textContent = 'X: — Y: —';
    center.appendChild(this._posLabel);
    this.container.appendChild(center);

    // Right section: zoom
    const right = document.createElement('div');
    right.className = 'bottom-right';

    const zoomOut = document.createElement('button');
    zoomOut.className = 'zoom-btn';
    zoomOut.textContent = '−';
    zoomOut.addEventListener('click', () => eventBus.emit('zoom:out'));
    right.appendChild(zoomOut);

    this._zoomLabel = document.createElement('span');
    this._zoomLabel.className = 'zoom-label';
    right.appendChild(this._zoomLabel);

    const zoomIn = document.createElement('button');
    zoomIn.className = 'zoom-btn';
    zoomIn.textContent = '+';
    zoomIn.addEventListener('click', () => eventBus.emit('zoom:in'));
    right.appendChild(zoomIn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'zoom-btn';
    resetBtn.textContent = 'Fit';
    resetBtn.addEventListener('click', () => eventBus.emit('zoom:reset'));
    right.appendChild(resetBtn);

    this.container.appendChild(right);

    // Listen for updates
    eventBus.on('cursor:move', ({ x, y }) => {
      this._posLabel.textContent = `X: ${x}  Y: ${y}`;
    });
    eventBus.on('cursor:leave', () => {
      this._posLabel.textContent = 'X: —  Y: —';
    });
    eventBus.on('zoom:changed', (zoom) => {
      this._zoomLabel.textContent = `${zoom}x`;
    });
  }

  setSize(size) {
    this._sizeSelect.value = size;
  }

  setZoom(zoom) {
    this._zoomLabel.textContent = `${zoom}x`;
  }
}
