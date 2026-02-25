import { eventBus } from '../core/EventBus.js';
import { PALETTES } from '../../assets/palettes/default-palettes.js';
import { hexToRgb } from '../core/ColorUtils.js';

export class PalettePanel {
  constructor(container) {
    this.container = container;
    this._currentPalette = 0;
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'Palette';
    this.container.appendChild(title);

    // Palette selector
    const select = document.createElement('select');
    select.className = 'palette-select';
    for (let i = 0; i < PALETTES.length; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = PALETTES[i].name;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      this._currentPalette = parseInt(select.value);
      this._renderSwatches();
    });
    this.container.appendChild(select);

    // Swatch grid
    this._swatchGrid = document.createElement('div');
    this._swatchGrid.className = 'palette-grid';
    this.container.appendChild(this._swatchGrid);

    this._renderSwatches();
  }

  _renderSwatches() {
    this._swatchGrid.innerHTML = '';
    const palette = PALETTES[this._currentPalette];
    for (const hex of palette.colors) {
      const swatch = document.createElement('button');
      swatch.className = 'palette-swatch';
      swatch.style.background = hex;
      swatch.title = hex;
      swatch.addEventListener('click', () => {
        const [r, g, b] = hexToRgb(hex);
        eventBus.emit('color:changed', [r, g, b, 255]);
        eventBus.emit('color:picked', [r, g, b, 255]);
      });
      this._swatchGrid.appendChild(swatch);
    }
  }
}
