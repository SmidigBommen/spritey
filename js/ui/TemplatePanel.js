import { eventBus } from '../core/EventBus.js';
import { TEMPLATES } from '../../assets/templates/default-templates.js';
import { hexToRgb } from '../core/ColorUtils.js';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'humanoid', label: 'Humanoid' },
  { value: 'creature', label: 'Creature' },
  { value: 'item', label: 'Item' },
];

export class TemplatePanel {
  constructor(container) {
    this.container = container;
    this._selectedCategory = 'all';
    this._selectedTemplate = null;
    this._slotColors = [];
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

    // Category selector
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'Sprites';
    this.container.appendChild(title);

    this._categorySelect = document.createElement('select');
    this._categorySelect.className = 'palette-select';
    for (const cat of CATEGORIES) {
      const opt = document.createElement('option');
      opt.value = cat.value;
      opt.textContent = cat.label;
      this._categorySelect.appendChild(opt);
    }
    this._categorySelect.addEventListener('change', () => {
      this._selectedCategory = this._categorySelect.value;
      this._renderGrid();
    });
    this.container.appendChild(this._categorySelect);

    // Thumbnail grid (browse view)
    this._gridWrap = document.createElement('div');
    this._gridWrap.className = 'template-grid';
    this.container.appendChild(this._gridWrap);

    // Config section (detail view, hidden initially)
    this._configWrap = document.createElement('div');
    this._configWrap.className = 'template-config hidden';
    this.container.appendChild(this._configWrap);

    this._renderGrid();
  }

  _renderGrid() {
    this._gridWrap.innerHTML = '';
    const filtered = this._selectedCategory === 'all'
      ? TEMPLATES
      : TEMPLATES.filter(t => t.category === this._selectedCategory);

    for (const template of filtered) {
      const btn = document.createElement('button');
      btn.className = 'template-thumb-btn';
      btn.title = template.name;

      const canvas = document.createElement('canvas');
      canvas.width = template.size;
      canvas.height = template.size;
      canvas.className = 'template-thumb-canvas';
      this._renderThumbnail(canvas, template, template.colorSlots.map(s => s.default));

      const label = document.createElement('span');
      label.className = 'template-thumb-label';
      label.textContent = template.name;

      btn.appendChild(canvas);
      btn.appendChild(label);
      btn.addEventListener('click', () => this._selectTemplate(template));
      this._gridWrap.appendChild(btn);
    }
  }

  _renderThumbnail(canvas, template, colors) {
    const ctx = canvas.getContext('2d');
    const size = template.size;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < template.pixels.length; i++) {
      const slot = template.pixels[i];
      if (slot === 0) continue;
      const hex = colors[slot - 1];
      const [r, g, b] = hexToRgb(hex);
      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }

  _selectTemplate(template) {
    this._selectedTemplate = template;
    this._slotColors = template.colorSlots.map(s => s.default);

    // Hide grid, show config
    this._gridWrap.classList.add('hidden');
    this._categorySelect.classList.add('hidden');
    this._configWrap.classList.remove('hidden');
    this._renderConfig();
  }

  _renderConfig() {
    const template = this._selectedTemplate;
    this._configWrap.innerHTML = '';

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'template-back-btn';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', () => this._backToGrid());
    this._configWrap.appendChild(backBtn);

    // Template name
    const nameEl = document.createElement('div');
    nameEl.className = 'template-config-name';
    nameEl.textContent = template.name;
    this._configWrap.appendChild(nameEl);

    // Preview canvas
    const previewWrap = document.createElement('div');
    previewWrap.className = 'template-preview-wrap';
    this._previewCanvas = document.createElement('canvas');
    this._previewCanvas.width = template.size;
    this._previewCanvas.height = template.size;
    this._previewCanvas.className = 'template-preview-canvas';
    previewWrap.appendChild(this._previewCanvas);
    this._configWrap.appendChild(previewWrap);
    this._renderPreview();

    // Color slot editors
    const slotsWrap = document.createElement('div');
    slotsWrap.className = 'template-slots';
    for (let i = 0; i < template.colorSlots.length; i++) {
      const slot = template.colorSlots[i];
      const row = document.createElement('div');
      row.className = 'template-slot-row';

      const label = document.createElement('label');
      label.className = 'template-slot-label';
      label.textContent = slot.name;

      const input = document.createElement('input');
      input.type = 'color';
      input.className = 'template-slot-input';
      input.value = this._slotColors[i];
      input.addEventListener('input', () => {
        this._slotColors[i] = input.value;
        this._renderPreview();
      });

      row.appendChild(label);
      row.appendChild(input);
      slotsWrap.appendChild(row);
    }
    this._configWrap.appendChild(slotsWrap);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'template-apply-btn';
    applyBtn.textContent = 'Apply to Layer';
    applyBtn.addEventListener('click', () => this._onApply());
    this._configWrap.appendChild(applyBtn);
  }

  _renderPreview() {
    if (!this._previewCanvas || !this._selectedTemplate) return;
    this._renderThumbnail(this._previewCanvas, this._selectedTemplate, this._slotColors);
  }

  _backToGrid() {
    this._selectedTemplate = null;
    this._configWrap.classList.add('hidden');
    this._gridWrap.classList.remove('hidden');
    this._categorySelect.classList.remove('hidden');
  }

  _onApply() {
    if (!this._selectedTemplate) return;
    eventBus.emit('template:apply', {
      template: this._selectedTemplate,
      colors: [...this._slotColors],
    });
  }
}
