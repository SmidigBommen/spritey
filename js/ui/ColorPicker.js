import { eventBus } from '../core/EventBus.js';
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb } from '../core/ColorUtils.js';

export class ColorPicker {
  constructor(container) {
    this.container = container;
    this._hue = 0;
    this._sat = 1;
    this._val = 1;
    this._build();
    this._updateFromHsv();

    eventBus.on('color:picked', ([r, g, b, a]) => {
      if (a === 0) return;
      const [h, s, v] = rgbToHsv(r, g, b);
      this._hue = h;
      this._sat = s;
      this._val = v;
      this._updateFromHsv();
    });
  }

  _build() {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'Color';
    this.container.appendChild(title);

    // Primary/Secondary color display
    const colorSwatches = document.createElement('div');
    colorSwatches.className = 'color-swatches';
    this._primarySwatch = document.createElement('div');
    this._primarySwatch.className = 'color-swatch primary';
    this._secondarySwatch = document.createElement('div');
    this._secondarySwatch.className = 'color-swatch secondary';
    this._secondarySwatch.style.background = '#ffffff';
    colorSwatches.appendChild(this._secondarySwatch);
    colorSwatches.appendChild(this._primarySwatch);

    const swapBtn = document.createElement('button');
    swapBtn.className = 'swap-btn';
    swapBtn.textContent = '⇄';
    swapBtn.title = 'Swap colors (X)';
    swapBtn.addEventListener('click', () => eventBus.emit('color:swap'));
    colorSwatches.appendChild(swapBtn);
    this.container.appendChild(colorSwatches);

    // SV square
    this._svCanvas = document.createElement('canvas');
    this._svCanvas.className = 'sv-canvas';
    this._svCanvas.width = 160;
    this._svCanvas.height = 160;
    this.container.appendChild(this._svCanvas);
    this._svCtx = this._svCanvas.getContext('2d');

    // Hue slider
    this._hueCanvas = document.createElement('canvas');
    this._hueCanvas.className = 'hue-canvas';
    this._hueCanvas.width = 160;
    this._hueCanvas.height = 16;
    this.container.appendChild(this._hueCanvas);
    this._hueCtx = this._hueCanvas.getContext('2d');

    // Hex input
    const hexRow = document.createElement('div');
    hexRow.className = 'hex-row';
    const hexLabel = document.createElement('label');
    hexLabel.textContent = '#';
    this._hexInput = document.createElement('input');
    this._hexInput.className = 'hex-input';
    this._hexInput.type = 'text';
    this._hexInput.maxLength = 6;
    hexRow.appendChild(hexLabel);
    hexRow.appendChild(this._hexInput);
    this.container.appendChild(hexRow);

    this._setupInteractions();
    this._drawHueBar();
  }

  _setupInteractions() {
    // SV canvas interaction
    let svDragging = false;
    const handleSV = (e) => {
      const rect = this._svCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      this._sat = x;
      this._val = 1 - y;
      this._updateFromHsv();
      this._emitColor();
    };
    this._svCanvas.addEventListener('pointerdown', (e) => {
      svDragging = true;
      this._svCanvas.setPointerCapture(e.pointerId);
      handleSV(e);
    });
    this._svCanvas.addEventListener('pointermove', (e) => { if (svDragging) handleSV(e); });
    this._svCanvas.addEventListener('pointerup', () => { svDragging = false; });

    // Hue bar interaction
    let hueDragging = false;
    const handleHue = (e) => {
      const rect = this._hueCanvas.getBoundingClientRect();
      this._hue = Math.max(0, Math.min(359, (e.clientX - rect.left) / rect.width * 360));
      this._updateFromHsv();
      this._emitColor();
    };
    this._hueCanvas.addEventListener('pointerdown', (e) => {
      hueDragging = true;
      this._hueCanvas.setPointerCapture(e.pointerId);
      handleHue(e);
    });
    this._hueCanvas.addEventListener('pointermove', (e) => { if (hueDragging) handleHue(e); });
    this._hueCanvas.addEventListener('pointerup', () => { hueDragging = false; });

    // Hex input
    this._hexInput.addEventListener('change', () => {
      const val = this._hexInput.value.replace('#', '');
      if (/^[0-9a-fA-F]{6}$/.test(val)) {
        const [r, g, b] = hexToRgb(val);
        const [h, s, v] = rgbToHsv(r, g, b);
        this._hue = h;
        this._sat = s;
        this._val = v;
        this._updateFromHsv();
        this._emitColor();
      }
    });
  }

  _drawSvSquare() {
    const w = this._svCanvas.width;
    const h = this._svCanvas.height;
    const ctx = this._svCtx;
    const imgData = ctx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = x / w;
        const v = 1 - y / h;
        const [r, g, b] = hsvToRgb(this._hue, s, v);
        const i = (y * w + x) * 4;
        imgData.data[i] = r;
        imgData.data[i + 1] = g;
        imgData.data[i + 2] = b;
        imgData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw cursor
    const cx = this._sat * w;
    const cy = (1 - this._val) * h;
    ctx.strokeStyle = this._val > 0.5 ? '#000' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawHueBar() {
    const w = this._hueCanvas.width;
    const h = this._hueCanvas.height;
    const ctx = this._hueCtx;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) {
      const [r, g, b] = hsvToRgb(i * 60, 1, 1);
      grad.addColorStop(i / 6, `rgb(${r},${g},${b})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw indicator
    const x = (this._hue / 360) * w;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, 0, 4, h);
  }

  _updateFromHsv() {
    const [r, g, b] = hsvToRgb(this._hue, this._sat, this._val);
    const hex = rgbToHex(r, g, b);
    this._primarySwatch.style.background = hex;
    this._hexInput.value = hex.replace('#', '');
    this._drawSvSquare();
    this._drawHueBar();
  }

  _emitColor() {
    const [r, g, b] = hsvToRgb(this._hue, this._sat, this._val);
    eventBus.emit('color:changed', [r, g, b, 255]);
  }

  getColor() {
    return [...hsvToRgb(this._hue, this._sat, this._val), 255];
  }

  setSecondaryColor(hex) {
    this._secondarySwatch.style.background = hex;
  }
}
