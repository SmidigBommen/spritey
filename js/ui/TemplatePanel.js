import { eventBus } from '../core/EventBus.js';
import { TEMPLATES } from '../../assets/templates/default-templates.js';
import { hexToRgb, rgbToHex } from '../core/ColorUtils.js';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'humanoid', label: 'Humanoid' },
  { value: 'creature', label: 'Creature' },
  { value: 'item', label: 'Item' },
  { value: 'custom', label: 'Custom' },
];

export class TemplatePanel {
  constructor(container) {
    this.container = container;
    this._selectedCategory = 'all';
    this._selectedTemplate = null;
    this._slotColors = [];
    this._customTemplates = [];
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

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

    // Action buttons (save/load)
    this._actionsWrap = document.createElement('div');
    this._actionsWrap.className = 'palette-actions';
    this.container.appendChild(this._actionsWrap);
    this._renderActions();

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

  _renderActions() {
    this._actionsWrap.innerHTML = '';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'palette-action-btn';
    saveBtn.textContent = 'Save';
    saveBtn.title = 'Save current sprite as template file';
    saveBtn.addEventListener('click', () => eventBus.emit('template:save'));
    this._actionsWrap.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.className = 'palette-action-btn';
    loadBtn.textContent = 'Load';
    loadBtn.title = 'Load a template file';
    loadBtn.addEventListener('click', () => this._loadTemplate());
    this._actionsWrap.appendChild(loadBtn);
  }

  _getAllTemplates() {
    return [...TEMPLATES, ...this._customTemplates];
  }

  _renderGrid() {
    this._gridWrap.innerHTML = '';
    const all = this._getAllTemplates();
    const filtered = this._selectedCategory === 'all'
      ? all
      : all.filter(t => t.category === this._selectedCategory);

    for (const template of filtered) {
      const isCustom = this._customTemplates.includes(template);
      const btn = document.createElement('button');
      btn.className = 'template-thumb-btn';
      btn.title = isCustom ? `${template.name} (right-click to remove)` : template.name;

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
      if (isCustom) {
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const idx = this._customTemplates.indexOf(template);
          if (idx >= 0) {
            this._customTemplates.splice(idx, 1);
            this._renderGrid();
          }
        });
      }
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
      if (!hex) continue;
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

    this._gridWrap.classList.add('hidden');
    this._categorySelect.classList.add('hidden');
    this._actionsWrap.classList.add('hidden');
    this._configWrap.classList.remove('hidden');
    this._renderConfig();
  }

  _renderConfig() {
    const template = this._selectedTemplate;
    this._configWrap.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.className = 'template-back-btn';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', () => this._backToGrid());
    this._configWrap.appendChild(backBtn);

    const nameEl = document.createElement('div');
    nameEl.className = 'template-config-name';
    nameEl.textContent = template.name;
    this._configWrap.appendChild(nameEl);

    const previewWrap = document.createElement('div');
    previewWrap.className = 'template-preview-wrap';
    this._previewCanvas = document.createElement('canvas');
    this._previewCanvas.width = template.size;
    this._previewCanvas.height = template.size;
    this._previewCanvas.className = 'template-preview-canvas';
    previewWrap.appendChild(this._previewCanvas);
    this._configWrap.appendChild(previewWrap);
    this._renderPreview();

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
    this._actionsWrap.classList.remove('hidden');
  }

  _onApply() {
    if (!this._selectedTemplate) return;
    eventBus.emit('template:apply', {
      template: this._selectedTemplate,
      colors: [...this._slotColors],
    });
  }

  /** Convert current canvas into a template and download as file */
  saveAsTemplate(project) {
    const name = prompt('Template name:', project.name || 'Template');
    if (name === null) return;

    const w = project.width;
    const h = project.height;
    const flat = project.flattenPixels();

    // Extract unique non-transparent colors
    const colorMap = new Map(); // hex → slot index (1-based)
    const pixels = new Array(w * h);

    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const a = flat[idx + 3];
      if (a === 0) {
        pixels[i] = 0;
        continue;
      }
      const hex = rgbToHex(flat[idx], flat[idx + 1], flat[idx + 2]);
      if (!colorMap.has(hex)) {
        colorMap.set(hex, colorMap.size + 1);
      }
      pixels[i] = colorMap.get(hex);
    }

    const colorSlots = [];
    for (const [hex, idx] of colorMap) {
      colorSlots[idx - 1] = { name: `Color ${idx}`, default: hex };
    }

    const template = {
      type: 'spritey-template',
      name: name.trim() || 'Template',
      category: 'custom',
      size: w,
      sizeH: h !== w ? h : undefined,
      colorSlots,
      pixels,
    };

    // Download as file
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Load a template file and add to custom templates */
  _loadTemplate() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data.type || data.type !== 'spritey-template') {
            alert('Invalid template file');
            return;
          }
          if (!data.pixels || !data.colorSlots) {
            alert('Invalid template file');
            return;
          }
          data.category = 'custom';
          this._customTemplates.push(data);
          this._selectedCategory = 'custom';
          this._categorySelect.value = 'custom';
          this._renderGrid();
        } catch {
          alert('Failed to load template file');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }
}
