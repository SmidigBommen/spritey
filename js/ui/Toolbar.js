import { eventBus } from '../core/EventBus.js';

export class Toolbar {
  constructor(container, tools) {
    this.container = container;
    this.tools = tools;
    this._buttons = new Map();
    this._optionsContainer = null;
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
      btn.innerHTML = `<span class="tool-icon">${tool.icon}</span><span class="tool-label">${tool.name}</span>`;
      btn.addEventListener('click', () => {
        eventBus.emit('tool:select', tool);
      });
      this._buttons.set(tool, btn);
      this.container.appendChild(btn);
    }

    // Tool options area (e.g. symmetry axis)
    this._optionsContainer = document.createElement('div');
    this._optionsContainer.className = 'toolbar-options';
    this.container.appendChild(this._optionsContainer);

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
    this.container.appendChild(this.container.lastChild);

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
    this._optionsContainer.innerHTML = '';

    if (typeof tool.axis !== 'undefined') {
      // Symmetry axis toggle buttons
      const label = document.createElement('div');
      label.className = 'toolbar-option-label';
      label.textContent = 'Axis';
      this._optionsContainer.appendChild(label);

      const axes = ['x', 'y', 'xy'];
      const row = document.createElement('div');
      row.className = 'toolbar-option-row';

      for (const axis of axes) {
        const btn = document.createElement('button');
        btn.className = 'tool-option-btn' + (tool.axis === axis ? ' active' : '');
        btn.textContent = axis.toUpperCase();
        btn.title = `Mirror axis: ${axis.toUpperCase()}`;
        btn.addEventListener('click', () => {
          eventBus.emit('tool:option', { axis });
          // Update button states
          row.querySelectorAll('.tool-option-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        row.appendChild(btn);
      }
      this._optionsContainer.appendChild(row);
    }
  }
}
