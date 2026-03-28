import { eventBus } from '../core/EventBus.js';
import { PALETTES } from '../../assets/palettes/default-palettes.js';
import { hexToRgb, rgbToHex } from '../core/ColorUtils.js';

export class PalettePanel {
  constructor(container) {
    this.container = container;
    this._currentPalette = 0;
    this._customPalettes = []; // { name, colors[] }
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'Palette';
    this.container.appendChild(title);

    // Palette selector
    this._select = document.createElement('select');
    this._select.className = 'palette-select';
    this._rebuildSelect();
    this._select.addEventListener('change', () => {
      this._currentPalette = parseInt(this._select.value);
      this._renderSwatches();
      this._renderActions();
    });
    this.container.appendChild(this._select);

    // Action buttons row
    this._actionsRow = document.createElement('div');
    this._actionsRow.className = 'palette-actions';
    this.container.appendChild(this._actionsRow);

    // Swatch grid
    this._swatchGrid = document.createElement('div');
    this._swatchGrid.className = 'palette-grid';
    this.container.appendChild(this._swatchGrid);

    this._renderSwatches();
    this._renderActions();

    const updateColor = (color) => { this._currentColor = color; };
    eventBus.on('color:changed', updateColor);
    eventBus.on('color:picked', updateColor);
    this._currentColor = [0, 0, 0, 255];
  }

  _getAllPalettes() {
    return [...PALETTES, ...this._customPalettes];
  }

  _rebuildSelect() {
    this._select.innerHTML = '';
    const all = this._getAllPalettes();
    for (let i = 0; i < all.length; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = all[i].name;
      if (i === this._currentPalette) opt.selected = true;
      this._select.appendChild(opt);
    }
  }

  _isCustom() {
    return this._currentPalette >= PALETTES.length;
  }

  _getCustomPalette() {
    return this._customPalettes[this._currentPalette - PALETTES.length];
  }

  _renderActions() {
    this._actionsRow.innerHTML = '';

    if (this._isCustom()) {
      const delBtn = document.createElement('button');
      delBtn.className = 'palette-action-btn palette-action-danger';
      delBtn.textContent = 'Delete';
      delBtn.title = 'Delete this custom palette';
      delBtn.addEventListener('click', () => this._deleteCustomPalette());
      this._actionsRow.appendChild(delBtn);
    }

    // "New Custom" — create empty custom palette
    const newBtn = document.createElement('button');
    newBtn.className = 'palette-action-btn';
    newBtn.textContent = this._isCustom() ? 'New' : 'New Custom';
    newBtn.title = 'Create a new custom palette';
    newBtn.addEventListener('click', () => this._createCustom());
    this._actionsRow.appendChild(newBtn);

    // "Copy" — duplicate current preset into a new custom palette
    if (!this._isCustom()) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'palette-action-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.title = 'Copy this palette as a custom palette';
      copyBtn.addEventListener('click', () => this._copyToCustom());
      this._actionsRow.appendChild(copyBtn);
    }
  }

  _renderSwatches() {
    this._swatchGrid.innerHTML = '';
    const all = this._getAllPalettes();
    const palette = all[this._currentPalette];
    if (!palette) return;
    const isCustom = this._isCustom();

    for (let i = 0; i < palette.colors.length; i++) {
      const hex = palette.colors[i];
      const swatch = document.createElement('button');
      swatch.className = 'palette-swatch';
      swatch.style.background = hex;
      swatch.title = isCustom ? `${hex} (right-click to remove)` : hex;
      swatch.addEventListener('click', () => {
        const [r, g, b] = hexToRgb(hex);
        eventBus.emit('color:changed', [r, g, b, 255]);
        eventBus.emit('color:picked', [r, g, b, 255]);
      });
      if (isCustom) {
        swatch.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          palette.colors.splice(i, 1);
          this._renderSwatches();
        });
      }
      this._swatchGrid.appendChild(swatch);
    }

    if (isCustom) {
      const addSwatch = document.createElement('button');
      addSwatch.className = 'palette-swatch palette-swatch-add';
      addSwatch.textContent = '+';
      addSwatch.title = 'Add current color';
      addSwatch.addEventListener('click', () => this._addCurrentColor());
      this._swatchGrid.appendChild(addSwatch);
    }
  }

  _addCurrentColor() {
    if (!this._isCustom()) return;
    const [r, g, b] = this._currentColor;
    const hex = rgbToHex(r, g, b);
    const palette = this._getCustomPalette();
    if (palette.colors.includes(hex)) return; // no duplicates
    palette.colors.push(hex);
    this._renderSwatches();
  }

  _createCustom() {
    const name = prompt('Palette name:', 'Custom');
    if (name === null) return;
    this._customPalettes.push({ name: name.trim() || 'Custom', colors: [] });
    this._currentPalette = this._getAllPalettes().length - 1;
    this._rebuildSelect();
    this._select.value = this._currentPalette;
    this._renderSwatches();
    this._renderActions();
  }

  _copyToCustom() {
    const all = this._getAllPalettes();
    const source = all[this._currentPalette];
    const name = prompt('Palette name:', `${source.name} (Custom)`);
    if (name === null) return;
    this._customPalettes.push({ name: name.trim() || 'Custom', colors: [...source.colors] });
    this._currentPalette = this._getAllPalettes().length - 1;
    this._rebuildSelect();
    this._select.value = this._currentPalette;
    this._renderSwatches();
    this._renderActions();
  }

  _deleteCustomPalette() {
    if (!this._isCustom()) return;
    const idx = this._currentPalette - PALETTES.length;
    this._customPalettes.splice(idx, 1);
    this._currentPalette = 0;
    this._rebuildSelect();
    this._select.value = 0;
    this._renderSwatches();
    this._renderActions();
  }
}
