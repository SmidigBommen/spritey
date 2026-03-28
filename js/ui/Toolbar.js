import { eventBus } from '../core/EventBus.js';

export class Toolbar {
  constructor(container, tools, optionsBar) {
    this.container = container;
    this.tools = tools;
    this._optionsBar = optionsBar;
    this._buttons = new Map();
    this._brushSize = 1;
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'toolbar-title';
    title.textContent = 'Tools';
    this.container.appendChild(title);

    for (const tool of this.tools) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.title = `${tool.name} (${tool.shortcut.toUpperCase()})`;
      const labelHtml = tool.name.replace(
        new RegExp(tool.shortcut, 'i'),
        m => `<strong class="tool-hotkey">${m}</strong>`
      );
      btn.innerHTML = `<span class="tool-icon">${tool.icon}</span><span class="tool-label">${labelHtml}</span>`;
      btn.addEventListener('click', () => {
        eventBus.emit('tool:select', tool);
      });
      this._buttons.set(tool, btn);
      this.container.appendChild(btn);
    }

    // Undo / Redo buttons
    const divider = document.createElement('div');
    divider.className = 'toolbar-divider';
    this.container.appendChild(divider);

    this._undoBtn = this._createActionBtn('Undo', 'Ctrl+Z', () => eventBus.emit('history:undo'));
    this._redoBtn = this._createActionBtn('Redo', 'Ctrl+Shift+Z', () => eventBus.emit('history:redo'));
    this.container.appendChild(this._undoBtn);
    this.container.appendChild(this._redoBtn);

    const divider2 = document.createElement('div');
    divider2.className = 'toolbar-divider';
    this.container.appendChild(divider2);

    this._createActionBtn('Clear', '', () => eventBus.emit('canvas:clear'));

    const divider3 = document.createElement('div');
    divider3.className = 'toolbar-divider';
    this.container.appendChild(divider3);

    this._createActionBtn('⟳ CW', 'Rotate 90° clockwise', () => eventBus.emit('transform:rotate-cw'));
    this._createActionBtn('⟲ CCW', 'Rotate 90° counter-clockwise', () => eventBus.emit('transform:rotate-ccw'));
    this._createActionBtn('⇔ H', 'Flip horizontal', () => eventBus.emit('transform:flip-h'));
    this._createActionBtn('⇕ V', 'Flip vertical', () => eventBus.emit('transform:flip-v'));

    eventBus.on('history:changed', ({ canUndo, canRedo }) => {
      this._undoBtn.disabled = !canUndo;
      this._redoBtn.disabled = !canRedo;
    });
  }

  _createActionBtn(label, shortcut, onClick) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn action-btn';
    btn.title = shortcut ? `${label} (${shortcut})` : label;
    btn.innerHTML = `<span class="tool-label">${label}</span>`;
    btn.addEventListener('click', onClick);
    this.container.appendChild(btn);
    return btn;
  }

  setActive(tool) {
    for (const [t, btn] of this._buttons) {
      btn.classList.toggle('active', t === tool);
    }
    this._renderOptions(tool);
  }

  _renderOptions(tool) {
    this._optionsBar.innerHTML = '';

    // Tool name
    const nameEl = document.createElement('span');
    nameEl.className = 'optbar-tool-name';
    nameEl.textContent = tool.name;
    this._optionsBar.appendChild(nameEl);

    const hasOptions = tool.supportsBrushSize ||
      typeof tool.pixelPerfect !== 'undefined' ||
      typeof tool.axis !== 'undefined';
    if (!hasOptions) return;

    this._optionsBar.appendChild(this._makeDivider());

    if (tool.supportsBrushSize) {
      const group = this._makeGroup('Size');
      for (let s = 1; s <= 4; s++) {
        const btn = document.createElement('button');
        btn.className = 'optbar-btn' + (s === this._brushSize ? ' active' : '');
        btn.textContent = `${s}`;
        btn.title = `Brush size ${s}x${s}`;
        btn.addEventListener('click', () => {
          this._brushSize = s;
          eventBus.emit('tool:option', { brushSize: s });
          group.querySelectorAll('.optbar-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        group.appendChild(btn);
      }
      this._optionsBar.appendChild(group);
    }

    if (typeof tool.pixelPerfect !== 'undefined') {
      this._optionsBar.appendChild(this._makeDivider());
      const btn = document.createElement('button');
      btn.className = 'optbar-btn' + (tool.pixelPerfect ? ' active' : '');
      btn.textContent = 'Pixel Perfect';
      btn.title = this._brushSize > 1 ? 'Requires brush size 1' : 'Remove L-shaped corner pixels';
      btn.disabled = this._brushSize > 1;
      btn.addEventListener('click', () => {
        const enabled = !tool.pixelPerfect;
        eventBus.emit('tool:option', { pixelPerfect: enabled });
        btn.classList.toggle('active', enabled);
      });
      this._optionsBar.appendChild(btn);
    }

    if (typeof tool.axis !== 'undefined') {
      this._optionsBar.appendChild(this._makeDivider());
      const group = this._makeGroup('Axis');
      for (const axis of ['x', 'y', 'xy']) {
        const btn = document.createElement('button');
        btn.className = 'optbar-btn' + (tool.axis === axis ? ' active' : '');
        btn.textContent = axis.toUpperCase();
        btn.title = `Mirror axis: ${axis.toUpperCase()}`;
        btn.addEventListener('click', () => {
          eventBus.emit('tool:option', { axis });
          group.querySelectorAll('.optbar-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        group.appendChild(btn);
      }
      this._optionsBar.appendChild(group);
    }
  }

  _makeGroup(label) {
    const group = document.createElement('div');
    group.className = 'optbar-group';
    const lbl = document.createElement('span');
    lbl.className = 'optbar-label';
    lbl.textContent = label;
    group.appendChild(lbl);
    return group;
  }

  _makeDivider() {
    const div = document.createElement('div');
    div.className = 'optbar-divider';
    return div;
  }
}
